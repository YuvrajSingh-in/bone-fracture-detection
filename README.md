# Bone Hairline Fracture Detection — Deep Learning Comparative Study

**MSc Artificial Intelligence final year project — National College of Ireland**

A full-stack system for binary bone-fracture classification from X-ray images. Three CNN architectures are trained and benchmarked against a held-out test set, served through a FastAPI inference API with a Next.js front end, and then profiled for energy and carbon cost so that model selection accounts for what a model costs to run, not only how accurate it is.

---

## Results

Evaluated on a balanced held-out test set of **1,826 X-rays** (915 fractured / 911 not fractured). Training set: **11,778 images**.

| Model | Framework | Accuracy | F1 (macro) | ROC-AUC | Size | Params | Latency |
|---|---|---|---|---|---|---|---|
| **EfficientNetB3** | TensorFlow / Keras | **95.67%** | 0.9567 | **0.9911** | 84.9 MB | 11.18 M | 437 ms |
| DenseNet121 | PyTorch | 93.32% | 0.9332 | 0.9824 | 27.1 MB | 6.95 M | 144 ms |
| MobileNetV2 | TensorFlow / Keras | 76.78% | 0.7634 | 0.8975 | 11.0 MB | 2.42 M | 115 ms |

Transfer learning throughout: EfficientNetB3 with the last 50 ImageNet layers fine-tuned, DenseNet121 with the final dense block fine-tuned, MobileNetV2 trained in two phases.

Raw classification reports, confusion matrices and per-epoch training history are in [`models/extra/`](models/extra).

---

## Rescuing the DenseNet121 classifier

The PyTorch classifier initially scored **57% accuracy (F1 0.50 on the fractured class)** — barely above chance on a balanced two-class problem. The cause was the fine-tuning strategy rather than the architecture. After correcting it the same model reached **93.3% accuracy and 0.9829 ROC-AUC**.

Both reports are kept in the repository so the before and after are checkable:

- [`classification_report_CNN_Advance.txt`](models/extra/classification_report_CNN_Advance.txt) — the 57% version
- [`classification_report_CNN_Advance_RETRAINED.txt`](models/extra/classification_report_CNN_Advance_RETRAINED.txt) — after retraining

---

## Green AI: what each model costs to run

Accuracy alone is a poor selection criterion for a model that will run thousands of times a day. Each model was profiled for parameters, GFLOPs, cold-load time and latency, then modelled against a realistic clinical deployment of **500 scans per day (182,500 inferences a year)**.

| Model | Accuracy | gCO₂e per accuracy point | Accuracy per MB |
|---|---|---|---|
| DenseNet121 | 93.3% | **0.632** | 3.44 |
| MobileNetV2 | 76.8% | 1.192 | 7.00 |
| EfficientNetB3 | 95.7% | 1.767 | 1.13 |

**The finding:** EfficientNetB3 buys roughly 2.4 accuracy points over DenseNet121 for about **2.9× the annual carbon**. Whether that trade is worth making is a deployment decision, not a modelling one — but it should be made deliberately.

Assumptions (T4 GPU at 70 W, PUE 1.09, 475 gCO₂e/kWh grid intensity) are declared in [`models/extra/sustainability_analysis.json`](models/extra/sustainability_analysis.json). INT8 and FP16 TFLite quantisation experiments are in the same folder.

---

## Architecture

```
X-ray upload
     │
     ▼
Next.js front end  ──────►  FastAPI backend  ──────►  model_loader
(Firebase Hosting)          (Docker → Cloud Run)      ├─ EfficientNetB3  (Keras)
                                                      ├─ DenseNet121     (PyTorch)
                                                      └─ MobileNetV2     (Keras)
```

**Backend** — FastAPI + Uvicorn, containerised for Google Cloud Run. OpenCV preprocessing, UUID-based upload handling, base64-encoded result images, per-model loading and preprocessing isolated in `model_loader.py`.

| Endpoint | Purpose |
|---|---|
| `GET /models` | List available models |
| `POST /predict` | Run a single model against one image |
| `POST /predict-all` | Run every model on one image for side-by-side comparison |

**Front end** — Next.js 16, React 19, TypeScript, Tailwind 4, static export to Firebase Hosting.

---

## Repository layout

```
models/
├── backend/            FastAPI inference service + Dockerfile
├── frontend/           Next.js UI
├── extra/              evaluation artefacts, sustainability analysis, figures
├── EfficientNetB3.ipynb        training notebook (Colab)
├── Mobilenet.ipynb             training notebook (Colab)
├── Train_CNN_Advance_Colab.ipynb   DenseNet121 training (Colab, T4 GPU)
└── train_cnn_advance.py        local CPU training variant
```

---

## Not in this repository

Two things are deliberately excluded, and the code expects you to supply them:

- **The dataset** (`DATA/`) — 11,778 training and 1,826 test X-ray images. Not redistributed here.
- **Trained weights** (`.keras`, `.h5`, `.pth`) — 85–127 MB each, above GitHub's file size limit.

Retrain from the notebooks, or place existing weights in `models/backend/models/` and `models/backend/new model/`.

---

## Running it

**Backend**

```bash
cd models/backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Front end**

```bash
cd models/frontend
npm install
npm run dev
```

Set `NEXT_PUBLIC_API_URL=http://localhost:8000` in `models/frontend/.env.local`.

Deployment notes for Cloud Run and Firebase Hosting are in [`models/DEPLOYMENT.md`](models/DEPLOYMENT.md).

---

## Reproducing the models

| Model | How |
|---|---|
| EfficientNetB3 | `models/EfficientNetB3.ipynb` in Colab |
| MobileNetV2 | `models/Mobilenet.ipynb` in Colab |
| DenseNet121 | `models/Train_CNN_Advance_Colab.ipynb` (T4 GPU, ~70 s/epoch, 10 epochs) |

Real per-epoch history is written to `models/extra/cnn_advance_history.json`.
