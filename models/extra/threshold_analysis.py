"""Decision-threshold analysis for the viva answers.

Recovers per-image predicted probabilities for all three deployed models on the
held-out test set, then sweeps the decision threshold to quantify the
sensitivity/specificity trade-off that threshold tuning can achieve WITHOUT
retraining. Also reports Youden's J and a cost-sensitive optimum (FN weighted
10x FP, reflecting the clinical asymmetry of a missed fracture).

Convention: class 0 = fractured (positive class), class 1 = not fractured.
Model sigmoid output = P(not fractured); P(fractured) = 1 - output.

Outputs threshold_analysis.json + roc_curves.png
"""
import os, glob, json, warnings
warnings.filterwarnings("ignore")
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

import numpy as np
import cv2
import torch
import tensorflow as tf
from sklearn.metrics import roc_curve, roc_auc_score, confusion_matrix
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

_orig = tf.keras.layers.DepthwiseConv2D.__init__
def _patched(self, *a, **k):
    k.pop("groups", None)
    _orig(self, *a, **k)
tf.keras.layers.DepthwiseConv2D.__init__ = _patched

HERE = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.normpath(os.path.join(HERE, "..", "backend"))
TEST = os.path.normpath(os.path.join(HERE, "..", "..", "DATA", "test"))
CLASSES = ["fractured", "not fractured"]

MODELS = {
    "EfficientNetB3": {"path": os.path.join(BACKEND, "new model", "fracture_model_final.h5"),
                       "fw": "keras", "prep": "efficientnet"},
    "DenseNet121":    {"path": os.path.join(BACKEND, "models", "cnn_advance.pth"),
                       "fw": "pytorch", "prep": "torchvision"},
    "MobileNetV2":    {"path": os.path.join(BACKEND, "models", "bone_fracture_mobilenet.h5"),
                       "fw": "keras", "prep": "div255"},
}


def load_paths():
    paths, labels = [], []
    for idx, c in enumerate(CLASSES):
        for p in sorted(glob.glob(os.path.join(TEST, c, "*"))):
            if p.lower().endswith((".jpg", ".jpeg", ".png")):
                paths.append(p); labels.append(idx)
    return paths, np.array(labels)


def score_keras(path, prep, paths):
    model = tf.keras.models.load_model(path)
    out = np.zeros(len(paths), dtype=np.float32)
    B = 32
    for s in range(0, len(paths), B):
        batch = []
        for p in paths[s:s + B]:
            img = cv2.cvtColor(cv2.imread(p), cv2.COLOR_BGR2RGB)
            batch.append(cv2.resize(img, (224, 224)).astype("float32"))
        arr = np.stack(batch)
        arr = tf.keras.applications.efficientnet.preprocess_input(arr) if prep == "efficientnet" else arr / 255.0
        out[s:s + len(batch)] = model.predict(arr, verbose=0).reshape(-1)
    return out


def score_torch(path, paths):
    from torchvision import models, transforms
    m = models.densenet121(weights=None)
    sd = torch.load(path, map_location="cpu")
    m.classifier = torch.nn.Linear(m.classifier.in_features, sd["classifier.weight"].shape[0])
    m.load_state_dict(sd); m.eval()
    tf_ = transforms.Compose([transforms.ToPILImage(), transforms.Resize((224, 224)), transforms.ToTensor()])
    out = np.zeros(len(paths), dtype=np.float32)
    B = 32
    with torch.no_grad():
        for s in range(0, len(paths), B):
            batch = [tf_(cv2.cvtColor(cv2.imread(p), cv2.COLOR_BGR2RGB)) for p in paths[s:s + B]]
            t = torch.stack(batch)
            out[s:s + len(batch)] = torch.sigmoid(m(t)).reshape(-1).numpy()
    return out


def metrics_at(y_true_fract, p_fract, t):
    """y_true_fract: 1 if fractured. p_fract: P(fractured). Predict fractured if p >= t."""
    pred = (p_fract >= t).astype(int)
    tp = int(((pred == 1) & (y_true_fract == 1)).sum())
    fn = int(((pred == 0) & (y_true_fract == 1)).sum())
    fp = int(((pred == 1) & (y_true_fract == 0)).sum())
    tn = int(((pred == 0) & (y_true_fract == 0)).sum())
    rec = tp / (tp + fn) if tp + fn else 0.0
    prec = tp / (tp + fp) if tp + fp else 0.0
    spec = tn / (tn + fp) if tn + fp else 0.0
    acc = (tp + tn) / len(y_true_fract)
    return {"threshold": round(float(t), 4), "TP": tp, "FN": fn, "FP": fp, "TN": tn,
            "recall_fractured": round(rec, 4), "precision_fractured": round(prec, 4),
            "specificity": round(spec, 4), "accuracy": round(acc, 4)}


def main():
    paths, labels = load_paths()
    y_fract = (labels == 0).astype(int)          # 1 = fractured (positive class)
    print(f"{len(paths)} test images | {y_fract.sum()} fractured / {(1-y_fract).sum()} not fractured\n")

    results, roc_data = {}, {}
    for name, cfg in MODELS.items():
        print(f"scoring {name} ...")
        s = score_keras(cfg["path"], cfg["prep"], paths) if cfg["fw"] == "keras" else score_torch(cfg["path"], paths)
        p_fract = 1.0 - s                        # P(fractured)
        auc = roc_auc_score(y_fract, p_fract)
        fpr, tpr, thr = roc_curve(y_fract, p_fract)
        roc_data[name] = (fpr, tpr, auc)

        default = metrics_at(y_fract, p_fract, 0.5)

        # threshold achieving recall >= 0.95 with best specificity
        target = None
        for t in np.linspace(0.99, 0.001, 999):
            m = metrics_at(y_fract, p_fract, t)
            if m["recall_fractured"] >= 0.95:
                target = m
                break

        # Youden's J
        j = tpr - fpr
        jt = thr[int(np.argmax(j))]
        youden = metrics_at(y_fract, p_fract, jt)

        # cost-sensitive: FN weighted 10x FP
        best, best_cost = None, None
        for t in np.linspace(0.99, 0.001, 999):
            m = metrics_at(y_fract, p_fract, t)
            cost = 10 * m["FN"] + 1 * m["FP"]
            if best_cost is None or cost < best_cost:
                best_cost, best = cost, m
        best["expected_cost_10x"] = best_cost

        # coarse sweep for the report table
        sweep = [metrics_at(y_fract, p_fract, t) for t in [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7]]

        results[name] = {"roc_auc": round(float(auc), 4), "at_default_0.5": default,
                         "at_recall_95": target, "youden_J": youden,
                         "cost_sensitive_10x": best, "sweep": sweep}
        print(f"  AUC={auc:.4f} | default recall={default['recall_fractured']:.3f} "
              f"spec={default['specificity']:.3f}")
        if target:
            print(f"  @recall>=0.95: t={target['threshold']:.3f} "
                  f"spec={target['specificity']:.3f} prec={target['precision_fractured']:.3f} "
                  f"FN={target['FN']}\n")

    with open(os.path.join(HERE, "threshold_analysis.json"), "w") as f:
        json.dump(results, f, indent=2)

    # ROC figure
    fig, ax = plt.subplots(figsize=(6.2, 5.2))
    colors = {"EfficientNetB3": "#2E5E8C", "DenseNet121": "#2F7D3B", "MobileNetV2": "#B07C2A"}
    for name, (fpr, tpr, auc) in roc_data.items():
        ax.plot(fpr, tpr, color=colors[name], lw=2, label=f"{name} (AUC = {auc:.3f})")
    ax.plot([0, 1], [0, 1], "k--", lw=1, alpha=0.5, label="Chance")
    ax.axhline(0.95, color="red", ls=":", lw=1.2, alpha=0.8)
    ax.text(0.42, 0.955, "95% sensitivity target", fontsize=8, color="red")
    ax.set_xlabel("False positive rate (1 - specificity)")
    ax.set_ylabel("True positive rate (fractured-class recall)")
    ax.set_title("ROC curves on the held-out test set (n = 1,826)", fontweight="bold", fontsize=11)
    ax.legend(loc="lower right", fontsize=9); ax.grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig(os.path.join(HERE, "sustainability_figures", "roc_curves.png"), dpi=170)
    plt.close()
    print("saved threshold_analysis.json and roc_curves.png")


if __name__ == "__main__":
    main()
