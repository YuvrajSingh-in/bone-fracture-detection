"""Generate all report figures from REAL evaluation data only."""
import json, os, random
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "report_figures")
DATA = os.path.normpath(os.path.join(HERE, "..", "..", "DATA"))
os.makedirs(OUT, exist_ok=True)
random.seed(7)

def sample_grid(src_dir, out_name, n=4):
    files = [f for f in os.listdir(src_dir) if f.lower().endswith((".jpg",".jpeg",".png"))]
    picks = random.sample(files, n)
    fig, axes = plt.subplots(1, n, figsize=(12, 3.2))
    for ax, f in zip(axes, picks):
        img = Image.open(os.path.join(src_dir, f)).convert("L")
        ax.imshow(img, cmap="gray"); ax.axis("off")
    plt.tight_layout()
    plt.savefig(os.path.join(OUT, out_name), dpi=150, bbox_inches="tight")
    plt.close()

sample_grid(os.path.join(DATA, "test", "fractured"), "fig1_fractured_samples.png")
sample_grid(os.path.join(DATA, "test", "not fractured"), "fig2_normal_samples.png")

# --- Real metrics (from classification reports) ---
models = ["EfficientNetB3", "DenseNet121", "MobileNetV2"]
acc = [0.96, 0.93, 0.73]
prec = [0.96, 0.93, 0.745]   # weighted avgs
rec = [0.96, 0.93, 0.73]
f1 = [0.96, 0.93, 0.725]

x = np.arange(len(models)); w = 0.2
fig, ax = plt.subplots(figsize=(8, 4.5))
for i, (vals, lab) in enumerate(zip([acc, prec, rec, f1], ["Accuracy","Precision (wtd)","Recall (wtd)","F1 (wtd)"])):
    ax.bar(x + (i-1.5)*w, vals, w, label=lab)
ax.set_xticks(x); ax.set_xticklabels(models); ax.set_ylim(0, 1.05)
ax.set_ylabel("Score"); ax.legend(loc="lower left", fontsize=8)
for i, v in enumerate(acc):
    ax.text(x[i]-1.5*w, v+0.02, f"{v:.2f}", fontsize=8, ha="center")
plt.tight_layout(); plt.savefig(os.path.join(OUT, "fig3_metrics_comparison.png"), dpi=150); plt.close()

# --- DenseNet real training curves ---
with open(os.path.join(HERE, "cnn_advance_history.json")) as f:
    h = json.load(f)
ep = range(1, len(h["train_loss"])+1)
fig, (a1, a2) = plt.subplots(1, 2, figsize=(11, 4))
a1.plot(ep, h["train_acc"], "o-", label="Training"); a1.plot(ep, h["val_acc"], "s-", label="Validation")
a1.set_xlabel("Epoch"); a1.set_ylabel("Accuracy"); a1.set_title("DenseNet121 accuracy"); a1.legend(); a1.grid(alpha=.3)
a2.plot(ep, h["train_loss"], "o-", label="Training"); a2.plot(ep, h["val_loss"], "s-", label="Validation")
a2.set_xlabel("Epoch"); a2.set_ylabel("Loss (BCE)"); a2.set_title("DenseNet121 loss"); a2.legend(); a2.grid(alpha=.3)
plt.tight_layout(); plt.savefig(os.path.join(OUT, "fig4_densenet_training.png"), dpi=150); plt.close()

def cm_plot(cm, title, out_name):
    fig, ax = plt.subplots(figsize=(4.6, 4))
    im = ax.imshow(cm, cmap="Blues")
    labels = ["Fractured", "Not fractured"]
    ax.set_xticks([0,1]); ax.set_yticks([0,1])
    ax.set_xticklabels(labels); ax.set_yticklabels(labels)
    ax.set_xlabel("Predicted"); ax.set_ylabel("True"); ax.set_title(title)
    for i in range(2):
        for j in range(2):
            ax.text(j, i, str(cm[i][j]), ha="center", va="center",
                    color="white" if cm[i][j] > cm.max()/2 else "black", fontsize=13)
    plt.tight_layout(); plt.savefig(os.path.join(OUT, out_name), dpi=150); plt.close()

# Real confusion matrices
cm_plot(np.array([[844, 71], [50, 861]]), "DenseNet121 (test, n=1826)", "fig5_cm_densenet.png")
cm_plot(np.array([[551, 364], [129, 782]]), "MobileNetV2 (test, n=1826)", "fig6_cm_mobilenet.png")

print("Figures written to", OUT)
print(os.listdir(OUT))
