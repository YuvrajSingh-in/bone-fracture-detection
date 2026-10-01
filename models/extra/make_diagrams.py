"""System architecture + data flow diagrams for the report (drawn to match the real system)."""
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "report_figures")

def box(ax, x, y, w, h, text, fc="#EAF2FB", ec="#2E5E8C", fs=9, bold=False):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.02",
                                fc=fc, ec=ec, lw=1.4))
    ax.text(x + w/2, y + h/2, text, ha="center", va="center", fontsize=fs,
            fontweight="bold" if bold else "normal", wrap=True)

def arrow(ax, x1, y1, x2, y2, label="", ls="-", fs=8):
    ax.add_patch(FancyArrowPatch((x1, y1), (x2, y2), arrowstyle="-|>",
                                 mutation_scale=14, lw=1.3, ls=ls, color="#333"))
    if label:
        ax.text((x1+x2)/2, (y1+y2)/2 + 0.012, label, ha="center", va="bottom", fontsize=fs, color="#333")

# ================= System architecture =================
fig, ax = plt.subplots(figsize=(10, 5.6))
ax.set_xlim(0, 1); ax.set_ylim(0, 1); ax.axis("off")

# Tier labels
ax.text(0.11, 0.97, "Presentation tier", fontsize=10, fontweight="bold", color="#2E5E8C")
ax.text(0.46, 0.97, "Application tier", fontsize=10, fontweight="bold", color="#2E5E8C")
ax.text(0.815, 0.97, "Model tier", fontsize=10, fontweight="bold", color="#2E5E8C")

# Presentation
box(ax, 0.02, 0.62, 0.20, 0.28, "Next.js 16 frontend\n(React 19, TypeScript,\nTailwind CSS)\n\nLanding / Analysis /\nDashboard views", bold=False)
box(ax, 0.02, 0.42, 0.20, 0.13, "Static export\n(Firebase Hosting)", fc="#FFF4E0", ec="#B07C2A")

# Application
box(ax, 0.36, 0.62, 0.24, 0.28, "FastAPI service (Uvicorn)\n\nGET /          GET /models\nPOST /predict\nPOST /predict-all", bold=False)
box(ax, 0.36, 0.42, 0.24, 0.13, "Docker container\n(Google Cloud Run)", fc="#FFF4E0", ec="#B07C2A")
box(ax, 0.36, 0.13, 0.24, 0.22, "ModelHandler\nmodel registry - lazy loading -\nin-memory cache - per-model\npreprocessing - label mapping")

# Model tier
box(ax, 0.72, 0.70, 0.25, 0.16, "EfficientNetB3\nTensorFlow/Keras - 89 MB", fc="#E8F6EA", ec="#2F7D3B")
box(ax, 0.72, 0.48, 0.25, 0.16, "DenseNet121\nPyTorch - 28 MB", fc="#E8F6EA", ec="#2F7D3B")
box(ax, 0.72, 0.26, 0.25, 0.16, "MobileNetV2\nTensorFlow/Keras - 11.5 MB", fc="#E8F6EA", ec="#2F7D3B")
box(ax, 0.72, 0.06, 0.25, 0.12, "uploads/ store\n(UUID filenames)", fc="#F3E9F7", ec="#6B3FA0")

arrow(ax, 0.22, 0.76, 0.36, 0.76, "HTTPS / JSON")
arrow(ax, 0.48, 0.62, 0.48, 0.35)
arrow(ax, 0.60, 0.28, 0.72, 0.78)
arrow(ax, 0.60, 0.26, 0.72, 0.56)
arrow(ax, 0.60, 0.24, 0.72, 0.34)
arrow(ax, 0.60, 0.19, 0.72, 0.12)

plt.tight_layout()
plt.savefig(os.path.join(OUT, "fig4_system_architecture.png"), dpi=150, bbox_inches="tight")
plt.close()

# ================= Data flow =================
fig, ax = plt.subplots(figsize=(10, 6.6))
ax.set_xlim(0, 1); ax.set_ylim(0, 1); ax.axis("off")

ax.text(0.02, 0.965, "Offline: training pipeline", fontsize=11, fontweight="bold", color="#2E5E8C")
box(ax, 0.02, 0.78, 0.16, 0.14, "Radiograph archive\n13,604 images\n(2 classes)")
box(ax, 0.24, 0.78, 0.13, 0.14, "Split\ntrain / val /\nheld-out test")
box(ax, 0.43, 0.78, 0.17, 0.14, "Preprocessing\nresize 224x224 - RGB -\nper-model normalisation")
box(ax, 0.66, 0.78, 0.15, 0.14, "Augmentation\n(train only)\nflip - rotation - shift")
box(ax, 0.87, 0.78, 0.11, 0.14, "Model training\n(Colab T4 GPU)")
arrow(ax, 0.18, 0.85, 0.24, 0.85)
arrow(ax, 0.37, 0.85, 0.43, 0.85)
arrow(ax, 0.60, 0.85, 0.66, 0.85)
arrow(ax, 0.81, 0.85, 0.87, 0.85)

box(ax, 0.70, 0.56, 0.13, 0.12, "Evaluation on\ntest set (n=1,826)", fc="#E8F6EA", ec="#2F7D3B")
box(ax, 0.87, 0.56, 0.11, 0.12, "Trained weights\n(.h5 / .pth)", fc="#E8F6EA", ec="#2F7D3B")
arrow(ax, 0.925, 0.78, 0.925, 0.68)
arrow(ax, 0.87, 0.62, 0.83, 0.62)
box(ax, 0.47, 0.56, 0.17, 0.12, "Metrics + confusion\nmatrices + ROC-AUC\n(classification reports)", fc="#E8F6EA", ec="#2F7D3B")
arrow(ax, 0.70, 0.62, 0.64, 0.62)

ax.plot([0.01, 0.99], [0.48, 0.48], ls="--", lw=1, color="#999")

ax.text(0.02, 0.44, "Online: inference pipeline", fontsize=11, fontweight="bold", color="#2E5E8C")
box(ax, 0.02, 0.24, 0.13, 0.14, "User\n(browser)")
box(ax, 0.21, 0.24, 0.16, 0.14, "Frontend\nupload X-ray +\nselect model(s)")
box(ax, 0.43, 0.24, 0.16, 0.14, "API\nPOST /predict\nPOST /predict-all")
box(ax, 0.65, 0.24, 0.15, 0.14, "Preprocess for\nselected model +\nrun inference")
box(ax, 0.86, 0.24, 0.12, 0.14, "Sigmoid output\nto label +\nconfidence")
arrow(ax, 0.15, 0.31, 0.21, 0.31)
arrow(ax, 0.37, 0.31, 0.43, 0.31, "multipart")
arrow(ax, 0.59, 0.31, 0.65, 0.31)
arrow(ax, 0.80, 0.31, 0.86, 0.31)

box(ax, 0.43, 0.04, 0.29, 0.12, "JSON response: prediction - confidence -\nbase64 processed image", fc="#E8F6EA", ec="#2F7D3B")
arrow(ax, 0.90, 0.24, 0.72, 0.13)
arrow(ax, 0.43, 0.10, 0.29, 0.24, "rendered result")

plt.tight_layout()
plt.savefig(os.path.join(OUT, "fig5_data_flow.png"), dpi=150, bbox_inches="tight")
plt.close()
print("saved:", os.listdir(OUT))
