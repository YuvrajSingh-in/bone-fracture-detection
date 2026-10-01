"""
Real training script for the "CNN Advance" model (DenseNet121, PyTorch transfer learning).

Written because no training script for cnn_advance.pth existed anywhere in the project
(model_loader.py / verify_densenet.py only ever *load* the weights, never train them).
This script trains a genuine DenseNet121 classifier from scratch on the project's own
DATA/ folder and evaluates it on the real held-out test set, producing a classification
report in the same format as classification_report_EfficientNetB3.txt.

Preprocessing intentionally matches models/backend/model_loader.py's PyTorch inference
path exactly (Resize 224x224, ToTensor, NO ImageNet normalization) so the resulting
weights are a drop-in replacement for cnn_advance.pth without touching backend code.
"""
import os
import time
import json

import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import datasets, models, transforms
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score

torch.manual_seed(42)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.normpath(os.path.join(BASE_DIR, "..", "DATA"))
TRAIN_DIR = os.path.join(DATA_DIR, "train")
TEST_DIR = os.path.join(DATA_DIR, "test")
OUT_DIR = os.path.join(BASE_DIR, "extra")
os.makedirs(OUT_DIR, exist_ok=True)

DEVICE = torch.device("cpu")
IMG_SIZE = 224
BATCH_SIZE = 32
EPOCHS = 6
LR = 1e-4
VAL_SPLIT = 0.1

# Matches model_loader.py's PyTorch preprocessing exactly (no Normalize step).
train_transform = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(10),
    transforms.ToTensor(),
])
eval_transform = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
])


def build_model():
    model = models.densenet121(weights=models.DenseNet121_Weights.IMAGENET1K_V1)
    for param in model.features.parameters():
        param.requires_grad = False
    # Unfreeze the last dense block + final norm for fine-tuning.
    for param in model.features.denseblock4.parameters():
        param.requires_grad = True
    for param in model.features.norm5.parameters():
        param.requires_grad = True
    model.classifier = nn.Linear(model.classifier.in_features, 1)
    return model.to(DEVICE)


def main():
    print(f"[INFO] Train dir: {TRAIN_DIR}")
    print(f"[INFO] Test dir: {TEST_DIR}")

    full_train = datasets.ImageFolder(TRAIN_DIR, transform=train_transform)
    print(f"[INFO] Classes (alphabetical -> index): {full_train.class_to_idx}")
    # class_to_idx will be {'fracture': 0, 'non-fracture': 1} for train dir naming.

    n_val = int(len(full_train) * VAL_SPLIT)
    n_train = len(full_train) - n_val
    train_ds, val_ds = torch.utils.data.random_split(
        full_train, [n_train, n_val], generator=torch.Generator().manual_seed(42)
    )
    # val subset should use eval_transform (no augmentation) - wrap it
    val_ds.dataset = datasets.ImageFolder(TRAIN_DIR, transform=eval_transform)

    test_ds = datasets.ImageFolder(TEST_DIR, transform=eval_transform)
    print(f"[INFO] Test classes (alphabetical -> index): {test_ds.class_to_idx}")

    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True, num_workers=4)
    val_loader = DataLoader(val_ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=2)
    test_loader = DataLoader(test_ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=2)

    model = build_model()
    criterion = nn.BCEWithLogitsLoss()
    optimizer = torch.optim.Adam(
        filter(lambda p: p.requires_grad, model.parameters()), lr=LR
    )
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode="min", factor=0.5, patience=1)

    history = {"train_loss": [], "train_acc": [], "val_loss": [], "val_acc": []}
    best_val_loss = float("inf")
    best_state = None

    for epoch in range(1, EPOCHS + 1):
        t0 = time.time()
        model.train()
        running_loss, correct, total = 0.0, 0, 0
        for imgs, labels in train_loader:
            imgs, labels = imgs.to(DEVICE), labels.float().unsqueeze(1).to(DEVICE)
            optimizer.zero_grad()
            outputs = model(imgs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            running_loss += loss.item() * imgs.size(0)
            preds = (torch.sigmoid(outputs) >= 0.5).float()
            correct += (preds == labels).sum().item()
            total += labels.size(0)

        train_loss = running_loss / total
        train_acc = correct / total

        model.eval()
        v_loss, v_correct, v_total = 0.0, 0, 0
        with torch.no_grad():
            for imgs, labels in val_loader:
                imgs, labels = imgs.to(DEVICE), labels.float().unsqueeze(1).to(DEVICE)
                outputs = model(imgs)
                loss = criterion(outputs, labels)
                v_loss += loss.item() * imgs.size(0)
                preds = (torch.sigmoid(outputs) >= 0.5).float()
                v_correct += (preds == labels).sum().item()
                v_total += labels.size(0)

        val_loss = v_loss / v_total
        val_acc = v_correct / v_total
        scheduler.step(val_loss)

        history["train_loss"].append(train_loss)
        history["train_acc"].append(train_acc)
        history["val_loss"].append(val_loss)
        history["val_acc"].append(val_acc)

        elapsed = time.time() - t0
        print(f"[EPOCH {epoch}/{EPOCHS}] train_loss={train_loss:.4f} train_acc={train_acc:.4f} "
              f"val_loss={val_loss:.4f} val_acc={val_acc:.4f} ({elapsed:.1f}s)")

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            best_state = {k: v.clone() for k, v in model.state_dict().items()}

    if best_state is not None:
        model.load_state_dict(best_state)

    # Save real per-epoch history (no synthetic curves this time).
    with open(os.path.join(OUT_DIR, "cnn_advance_history.json"), "w") as f:
        json.dump(history, f, indent=2)

    # Final evaluation on the real held-out test set.
    model.eval()
    all_labels, all_preds, all_probs = [], [], []
    with torch.no_grad():
        for imgs, labels in test_loader:
            imgs = imgs.to(DEVICE)
            outputs = model(imgs)
            probs = torch.sigmoid(outputs).squeeze(1)
            preds = (probs >= 0.5).float()
            all_labels.extend(labels.numpy().tolist())
            all_preds.extend(preds.numpy().tolist())
            all_probs.extend(probs.numpy().tolist())

    class_names = [k for k, v in sorted(test_ds.class_to_idx.items(), key=lambda x: x[1])]
    report = classification_report(all_labels, all_preds, target_names=class_names, digits=2)
    cm = confusion_matrix(all_labels, all_preds)
    try:
        auc = roc_auc_score(all_labels, all_probs)
    except ValueError:
        auc = float("nan")

    print("\n" + report)
    print("Confusion matrix:\n", cm)
    print(f"ROC-AUC: {auc:.4f}")

    with open(os.path.join(OUT_DIR, "classification_report_CNN_Advance_RETRAINED.txt"), "w") as f:
        f.write(f"Classification Report for CNN_Advance (retrained DenseNet121, {EPOCHS} epochs)\n")
        f.write("=" * 60 + "\n")
        f.write(report)
        f.write(f"\nROC-AUC: {auc:.4f}\n")
        f.write(f"\nConfusion matrix (rows=true, cols=pred, order={class_names}):\n{cm}\n")
        f.write(f"\nClass index mapping: {test_ds.class_to_idx}\n")

    torch.save(model.state_dict(), os.path.join(OUT_DIR, "cnn_advance_retrained.pth"))
    print("[INFO] Saved retrained weights and report to models/extra/")


if __name__ == "__main__":
    main()
