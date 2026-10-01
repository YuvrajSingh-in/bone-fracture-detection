"""Evaluation figures built strictly from reconciled_metrics.json (one source of truth)."""
import os, json
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "report_figures")
M = json.load(open(os.path.join(HERE, "reconciled_metrics.json")))

def cm_fig(name, key, out_name):
    cm = np.array(M[key]["confusion_matrix"])
    total = cm.sum()
    fig, ax = plt.subplots(figsize=(4.8, 4.2))
    im = ax.imshow(cm, cmap="Blues")
    labels = ["Fractured", "Not fractured"]
    ax.set_xticks([0, 1]); ax.set_yticks([0, 1])
    ax.set_xticklabels(labels); ax.set_yticklabels(labels, rotation=90, va="center")
    ax.set_xlabel("Predicted class", fontweight="bold")
    ax.set_ylabel("Actual class", fontweight="bold")
    ax.set_title(f"{name}  (n = {total})", fontweight="bold")
    tags = [["TP", "FN"], ["FP", "TN"]]  # positive = fractured
    for i in range(2):
        for j in range(2):
            v = cm[i][j]
            ax.text(j, i - 0.10, str(v), ha="center", va="center",
                    color="white" if v > cm.max()/2 else "black", fontsize=15, fontweight="bold")
            ax.text(j, i + 0.14, f"{tags[i][j]}  ({v/total*100:.1f}%)", ha="center", va="center",
                    color="white" if v > cm.max()/2 else "#444", fontsize=8.5)
    plt.tight_layout()
    plt.savefig(os.path.join(OUT, out_name), dpi=160, bbox_inches="tight")
    plt.close()

cm_fig("EfficientNetB3", "EfficientNetB3", "fig5_cm_efficientnet.png")
cm_fig("DenseNet121", "DenseNet121", "fig6_cm_densenet.png")
cm_fig("MobileNetV2", "MobileNetV2", "fig8_cm_mobilenet.png")

# --- Comparison bar chart: metrics that genuinely differ ---
models = ["EfficientNetB3", "DenseNet121", "MobileNetV2"]
metrics = {
    "Accuracy": [M[m]["accuracy"] for m in models],
    "Macro F1": [M[m]["macro avg"]["f1-score"] for m in models],
    "Recall (fractured)": [M[m]["fractured"]["recall"] for m in models],
    "ROC-AUC": [M[m]["roc_auc_fractured_positive"] for m in models],
}
x = np.arange(len(models)); w = 0.2
colors = ["#2E5E8C", "#2F7D3B", "#B07C2A", "#6B3FA0"]
fig, ax = plt.subplots(figsize=(9, 4.8))
for i, (lab, vals) in enumerate(metrics.items()):
    bars = ax.bar(x + (i - 1.5) * w, vals, w, label=lab, color=colors[i])
    for b, v in zip(bars, vals):
        ax.text(b.get_x() + b.get_width()/2, v + 0.012, f"{v:.2f}",
                ha="center", fontsize=7.5)
ax.set_xticks(x); ax.set_xticklabels(models, fontsize=11)
ax.set_ylim(0, 1.08); ax.set_ylabel("Score")
ax.set_title("Test-set performance across metrics and models", fontweight="bold")
ax.legend(loc="lower center", ncol=4, fontsize=8.5, framealpha=0.9)
ax.grid(axis="y", alpha=0.3)
plt.tight_layout()
plt.savefig(os.path.join(OUT, "fig9_metrics_comparison.png"), dpi=160, bbox_inches="tight")
plt.close()
print("saved eval figures")
