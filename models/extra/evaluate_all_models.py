"""Single reconciled evaluation of all three models on DATA/test.
Prints per-class precision/recall/F1, accuracy, macro avg, confusion matrix and
ROC-AUC for each model, using the exact preprocessing from backend/model_loader.py.
Writes a JSON summary so the report figures/tables all draw from one source.
"""
import os, glob, json
import numpy as np
import tensorflow as tf

# Keras 2->3 compatibility: strip obsolete 'groups' kwarg (same fix as model_loader.py)
_orig = tf.keras.layers.DepthwiseConv2D.__init__
def _patched(self, *a, **k):
    k.pop("groups", None)
    _orig(self, *a, **k)
tf.keras.layers.DepthwiseConv2D.__init__ = _patched

HERE = os.path.dirname(os.path.abspath(__file__))
TEST = os.path.normpath(os.path.join(HERE, "..", "..", "DATA", "test"))
BACKEND_MODELS = os.path.normpath(os.path.join(HERE, "..", "backend", "models"))
NEW_MODELS = os.path.normpath(os.path.join(HERE, "..", "backend", "new model"))

# class 0 = fractured, class 1 = not fractured (alphabetical, matches training)
CLASSES = ["fractured", "not fractured"]

def load_paths():
    paths, labels = [], []
    for idx, c in enumerate(CLASSES):
        for p in glob.glob(os.path.join(TEST, c, "*")):
            if p.lower().endswith((".jpg", ".jpeg", ".png")):
                paths.append(p); labels.append(idx)
    return paths, np.array(labels)

def metrics(y_true, y_pred, y_score):
    from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
    rep = classification_report(y_true, y_pred, target_names=CLASSES, digits=4, output_dict=True)
    cm = confusion_matrix(y_true, y_pred)
    try:
        auc = roc_auc_score(y_true, y_score)
    except ValueError:
        auc = float("nan")
    return rep, cm, auc

def eval_keras(model_path, preprocess, paths, labels):
    import cv2, tensorflow as tf
    model = tf.keras.models.load_model(model_path)
    scores = np.zeros(len(paths), dtype=np.float32)  # P(not fractured)
    B = 64
    for s in range(0, len(paths), B):
        batch = []
        for p in paths[s:s+B]:
            img = cv2.imread(p)
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            img = cv2.resize(img, (224, 224)).astype("float32")
            batch.append(img)
        arr = preprocess(np.stack(batch))
        out = model.predict(arr, verbose=0).reshape(-1)
        scores[s:s+len(out)] = out
    y_pred = (scores >= 0.5).astype(int)              # 1 = not fractured
    y_score_fracture = 1.0 - scores                   # P(fractured) for AUC vs label0
    # AUC expects score for the positive label; use label=fractured(0): invert
    return y_pred, scores

def eval_densenet(model_path, paths, labels):
    import cv2, torch
    from torchvision import models, transforms
    m = models.densenet121(weights=None)
    sd = torch.load(model_path, map_location="cpu")
    m.classifier = torch.nn.Linear(m.classifier.in_features, sd["classifier.weight"].shape[0])
    m.load_state_dict(sd); m.eval()
    tf_ = transforms.Compose([transforms.ToPILImage(), transforms.Resize((224, 224)), transforms.ToTensor()])
    scores = np.zeros(len(paths), dtype=np.float32)   # P(not fractured)
    with torch.no_grad():
        B = 64
        for s in range(0, len(paths), B):
            batch = []
            for p in paths[s:s+B]:
                img = cv2.imread(p); img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                batch.append(tf_(img))
            t = torch.stack(batch)
            out = torch.sigmoid(m(t)).reshape(-1).numpy()
            scores[s:s+len(out)] = out
    y_pred = (scores >= 0.5).astype(int)
    return y_pred, scores

def main():
    import tensorflow as tf
    paths, labels = load_paths()
    print(f"Loaded {len(paths)} test images "
          f"({int((labels==0).sum())} fractured / {int((labels==1).sum())} not fractured)")
    results = {}

    def record(name, y_pred, scores):
        # scores = P(not fractured) = P(label 1); sklearn treats label 1 as positive
        rep, cm, auc = metrics(labels, y_pred, scores)
        results[name] = {
            "confusion_matrix": cm.tolist(),
            "accuracy": rep["accuracy"],
            "fractured": rep["fractured"],
            "not fractured": rep["not fractured"],
            "macro avg": rep["macro avg"],
            "roc_auc_fractured_positive": auc,
        }
        print(f"\n===== {name} =====")
        print("confusion matrix [rows=true, cols=pred], order", CLASSES)
        print(cm)
        print(f"accuracy={rep['accuracy']:.4f}  ROC-AUC={auc:.4f}")
        for c in CLASSES:
            print(f"  {c:14s} P={rep[c]['precision']:.4f} R={rep[c]['recall']:.4f} F1={rep[c]['f1-score']:.4f}")

    eff = os.path.join(NEW_MODELS, "fracture_model_final.h5")
    yp, sc = eval_keras(eff, tf.keras.applications.efficientnet.preprocess_input, paths, labels)
    record("EfficientNetB3", yp, sc)

    mob = os.path.join(BACKEND_MODELS, "bone_fracture_mobilenet.h5")
    yp, sc = eval_keras(mob, lambda a: a / 255.0, paths, labels)
    record("MobileNetV2", yp, sc)

    dn = os.path.join(BACKEND_MODELS, "cnn_advance.pth")
    yp, sc = eval_densenet(dn, paths, labels)
    record("DenseNet121", yp, sc)

    with open(os.path.join(HERE, "reconciled_metrics.json"), "w") as f:
        json.dump(results, f, indent=2)
    print("\nSaved reconciled_metrics.json")

if __name__ == "__main__":
    main()
