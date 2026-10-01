"""Redesigned, standards-oriented system architecture diagram (layered, numbered request/response)."""
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Rectangle

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "report_figures")

def box(ax, x, y, w, h, text, fc, ec, fs=8.5, bold=False):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.006",
                                fc=fc, ec=ec, lw=1.3, zorder=3))
    ax.text(x + w/2, y + h/2, text, ha="center", va="center", fontsize=fs,
            fontweight="bold" if bold else "normal", zorder=4)

def band(ax, y, h, label, color):
    ax.add_patch(Rectangle((0.075, y), 0.92, h, fc=color, ec="none", alpha=0.30, zorder=0))
    ax.text(0.052, y + h/2, label, fontsize=9, fontweight="bold", color="#444",
            va="center", ha="center", rotation=90, zorder=1)

def arrow(ax, p1, p2, label="", color="#222", ls="-", rad=0.0, fs=7.5, off=(0, 0.0)):
    ax.add_patch(FancyArrowPatch(p1, p2, arrowstyle="-|>", mutation_scale=13,
                                 lw=1.3, ls=ls, color=color,
                                 connectionstyle=f"arc3,rad={rad}", zorder=5))
    if label:
        mx, my = (p1[0]+p2[0])/2 + off[0], (p1[1]+p2[1])/2 + off[1]
        ax.text(mx, my, label, ha="center", va="center", fontsize=fs, color=color,
                bbox=dict(boxstyle="round,pad=0.2", fc="white", ec="none", alpha=0.9), zorder=6)

fig, ax = plt.subplots(figsize=(9.8, 8.2))
ax.set_xlim(0, 1); ax.set_ylim(0, 1); ax.axis("off")

C_CLIENT = "#DCE9F7"; E_CLIENT = "#2E5E8C"
C_APP = "#E7F3EA"; E_APP = "#2F7D3B"
C_MODEL = "#F1E8F7"; E_MODEL = "#6B3FA0"
C_STORE = "#FBEEDD"; E_STORE = "#B07C2A"

# Bands
band(ax, 0.83, 0.16, "CLIENT", "#DCE9F7")
band(ax, 0.505, 0.30, "APPLICATION", "#E7F3EA")
band(ax, 0.02, 0.46, "MODEL & STORAGE", "#F1E8F7")
ax.text(0.945, 0.788, "FastAPI / Uvicorn - Google Cloud Run",
        fontsize=7.5, style="italic", color="#2F7D3B", ha="right", zorder=2)

# Client layer
box(ax, 0.11, 0.855, 0.37, 0.11, "Web browser\nNext.js 16 - React 19 - TypeScript\nLanding / Analysis / Dashboard", C_CLIENT, E_CLIENT, bold=True)
box(ax, 0.62, 0.855, 0.33, 0.11, "Static hosting\nFirebase Hosting (CDN)\nserves built frontend", C_CLIENT, E_CLIENT)

# Application layer
box(ax, 0.11, 0.645, 0.40, 0.115, "REST API endpoints\nGET /   -   GET /models\nPOST /predict   -   POST /predict-all", C_APP, E_APP, bold=True)
box(ax, 0.60, 0.645, 0.35, 0.115, "Request handling\nvalidate upload - store image\nroute to ModelHandler", C_APP, E_APP)
box(ax, 0.11, 0.525, 0.84, 0.075, "ModelHandler:  registry - lazy loading - in-memory cache - per-model preprocessing - label mapping (0=fractured, 1=not fractured)", C_APP, E_APP, fs=7.5, bold=True)

# Model + storage layer
box(ax, 0.11, 0.285, 0.26, 0.13, "EfficientNetB3\nTensorFlow / Keras\n89 MB - ImageNet TL", C_MODEL, E_MODEL)
box(ax, 0.40, 0.285, 0.26, 0.13, "DenseNet121\nPyTorch\n28 MB - ImageNet TL", C_MODEL, E_MODEL)
box(ax, 0.69, 0.285, 0.26, 0.13, "MobileNetV2\nTensorFlow / Keras\n11.5 MB - ImageNet TL", C_MODEL, E_MODEL)
box(ax, 0.14, 0.075, 0.35, 0.10, "Model weight store\n.h5 / .pth artefacts", C_STORE, E_STORE)
box(ax, 0.58, 0.075, 0.37, 0.10, "Upload store\nuploads/ (UUID-named images)", C_STORE, E_STORE)

# Numbered flow
arrow(ax, (0.25, 0.855), (0.25, 0.760), "1  request\n(image + model_id)", E_CLIENT, off=(-0.06, 0))
arrow(ax, (0.35, 0.760), (0.35, 0.855), "6  JSON response\n(label, confidence)", "#B23", ls=(0, (4, 2)), off=(0.15, 0))
arrow(ax, (0.51, 0.703), (0.60, 0.703), "2  dispatch", E_APP, off=(0, 0.018))
arrow(ax, (0.74, 0.645), (0.62, 0.600), "3  preprocess + infer", E_APP, rad=-0.12, off=(0.11, 0.004))
arrow(ax, (0.24, 0.525), (0.24, 0.415), "4  load /\ncache", E_MODEL, off=(-0.05, 0))
arrow(ax, (0.53, 0.525), (0.53, 0.415), "", E_MODEL)
arrow(ax, (0.82, 0.525), (0.82, 0.415), "", E_MODEL)
arrow(ax, (0.24, 0.285), (0.28, 0.175), "weights", E_STORE, rad=0.1, off=(-0.02, 0))
arrow(ax, (0.70, 0.645), (0.74, 0.175), "5  save upload", E_STORE, rad=0.18, off=(0.12, 0))
arrow(ax, (0.80, 0.855), (0.48, 0.905), "deploy build", E_CLIENT, rad=0.12, off=(0, 0.016))

plt.tight_layout()
plt.savefig(os.path.join(OUT, "fig3_system_architecture.png"), dpi=160, bbox_inches="tight")
plt.close()
print("saved")
