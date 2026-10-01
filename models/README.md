# Bone Hairline Fracture Detection — Deep Learning Comparative Study

**Author:** Yuvraj Singh (Student ID: 24244945)
**Programme:** MSc Artificial Intelligence, School of Computing, National College of Ireland

A full-stack system for binary bone-fracture classification from X-ray images, comparing three CNN architectures, served through a FastAPI backend and a Next.js frontend.

## Models

| Model | Framework | Test Accuracy | Notes |
|---|---|---|---|
| EfficientNetB3 | TensorFlow/Keras | 96% | ImageNet transfer learning, last 50 layers fine-tuned |
| DenseNet121 ("CNN Advance") | PyTorch | 93% (ROC-AUC 0.983) | ImageNet transfer learning, last dense block fine-tuned |
| MobileNetV2 | TensorFlow/Keras | 73% (ROC-AUC 0.839) | Lightweight baseline, two-phase training |

Evaluated on a held-out test set of 1,826 X-ray images (915 fractured / 911 not fractured). Training set: 11,778 images. Classification reports live in `extra/`.

## Project structure

```
Hairline Fracture/
├── DATA/                  # dataset (train/ + test/, class subfolders) — not committed
├── models/
│   ├── backend/           # FastAPI inference API
│   │   ├── main.py        # endpoints: /, /models, /predict, /predict-all
│   │   ├── model_loader.py# per-model loading + preprocessing
│   │   ├── models/        # trained weights (.h5/.keras/.pth) — not committed
│   │   └── requirements.txt
│   ├── frontend/          # Next.js 16 + React 19 + Tailwind 4 UI
│   ├── extra/             # real evaluation artifacts (classification reports, training history)
│   ├── result img/        # sample prediction screenshots
│   ├── EfficientNetB3.ipynb        # EfficientNetB3 training (Colab)
│   ├── Mobilenet.ipynb             # MobileNetV2 training (Colab)
│   ├── Train_CNN_Advance_Colab.ipynb # DenseNet121 training (Colab, T4 GPU)
│   └── train_cnn_advance.py        # DenseNet121 training (local CPU variant)
└── .gitignore
```

## Running locally

### Backend
```bash
cd models/backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Requires the trained weight files in `models/backend/models/` and `models/backend/new model/` (not in git; ~330 MB total).

### Frontend
```bash
cd models/frontend
npm install
npm run dev
```
Set the backend URL in `.env.local` (`NEXT_PUBLIC_API_URL=http://localhost:8000`).

## Deployment

Firebase Hosting (frontend static export) + Google Cloud Run (backend Docker container). See `DEPLOYMENT.md` / `QUICKSTART.md`. Note: the existing Firebase project configuration must be re-created under your own Google account before deploying.

## Reproducing the models

- **EfficientNetB3 / MobileNetV2:** run the respective notebooks in Google Colab with the dataset zips in Drive.
- **DenseNet121:** run `Train_CNN_Advance_Colab.ipynb` (T4 GPU, ~70s/epoch, 10 epochs). Real per-epoch history is saved to `extra/cnn_advance_history.json`.
