"""Sustainability strategy framework: where each Green-AI lever acts across the
lifecycle of the fracture-detection system."""
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sustainability_figures")
os.makedirs(OUT, exist_ok=True)

STAGE_FC, STAGE_EC = "#DCE9F7", "#2E5E8C"
STRAT_FC, STRAT_EC = "#E7F3EA", "#2F7D3B"

fig, ax = plt.subplots(figsize=(9.4, 4.0))
ax.set_xlim(0, 1); ax.set_ylim(0, 1); ax.axis("off")

# ---- lifecycle stages (top row) ----
stages = ["Data\npreparation", "Model\ntraining", "Model\nselection", "Serving /\ninference"]
sw, gap = 0.21, 0.04
x0 = 0.02
for i, s in enumerate(stages):
    x = x0 + i * (sw + gap)
    ax.add_patch(FancyBboxPatch((x, 0.74), sw, 0.20, boxstyle="round,pad=0.008",
                                fc=STAGE_FC, ec=STAGE_EC, lw=1.3))
    ax.text(x + sw / 2, 0.84, s, ha="center", va="center", fontsize=9.5, fontweight="bold")
    if i < len(stages) - 1:
        ax.add_patch(FancyArrowPatch((x + sw, 0.84), (x + sw + gap, 0.84),
                                     arrowstyle="-|>", mutation_scale=12, lw=1.2, color=STAGE_EC))

ax.text(0.5, 0.985, "LIFECYCLE STAGE", ha="center", fontsize=8.5,
        fontweight="bold", color=STAGE_EC)
ax.text(0.5, 0.665, "SUSTAINABILITY STRATEGIES APPLIED", ha="center", fontsize=8.5,
        fontweight="bold", color=STRAT_EC)

# ---- strategy cards (2 rows x 3) ----
cards = [
    ("S1  Right-sized architecture", "compare 3 architectures;\nselect on accuracy-per-joule", "Model selection"),
    ("S2  Transfer learning", "ImageNet initialisation instead\nof training from scratch", "Model training"),
    ("S3  Training controls", "early stopping, LR-on-plateau,\nmixed precision", "Model training"),
    ("S4  Serving efficiency", "lazy loading + in-memory cache;\nCPU-only inference", "Serving"),
    ("S5  Post-training quantisation", "INT8 weight quantisation\nvia TensorFlow Lite", "Serving"),
    ("S6  Compute-waste accounting", "quantify energy of abandoned\nand non-converged runs", "Model training"),
]
cw, ch = 0.305, 0.245
xs = [0.02, 0.3475, 0.675]
ys = [0.375, 0.09]
for idx, (title, body, tag) in enumerate(cards):
    x, y = xs[idx % 3], ys[idx // 3]
    ax.add_patch(FancyBboxPatch((x, y), cw, ch, boxstyle="round,pad=0.008",
                                fc=STRAT_FC, ec=STRAT_EC, lw=1.2))
    ax.text(x + cw / 2, y + ch - 0.055, title, ha="center", va="center",
            fontsize=9, fontweight="bold", color="#1A2433")
    ax.text(x + cw / 2, y + ch - 0.135, body, ha="center", va="center",
            fontsize=7.8, color="#333333")
    ax.text(x + cw / 2, y + 0.028, f"[{tag}]", ha="center", va="center",
            fontsize=7, style="italic", color=STRAT_EC)

plt.tight_layout()
plt.savefig(os.path.join(OUT, "fig_strategy_framework.png"), dpi=175, bbox_inches="tight")
plt.close()
print("saved fig_strategy_framework.png")
