from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import shutil
import uuid
import cv2
import base64
import time
from model_loader import ModelHandler
import uvicorn

app = FastAPI(title="Bone Fracture Detection API")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Mount uploads directory for serving images
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Initialize Model Handler
model_handler = ModelHandler()

@app.get("/")
def read_root():
    return {
        "message": "Bone Fracture Detection API",
        "endpoints": {
            "/models": "GET - List available models",
            "/predict": "POST - Run prediction on single model",
            "/predict-all": "POST - Run prediction on all models"
        }
    }

@app.get("/models")
def get_models():
    """Returns the list of available models."""
    return {"models": model_handler.available_models()}

@app.post("/predict")
async def predict(file: UploadFile = File(...), selected_model: str = Form(..., alias="model_id")):
    """Run prediction on a single model."""
    file_path = None
    try:
        ext = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
        filename = f"{uuid.uuid4()}{ext}"
        file_path = os.path.join(UPLOAD_DIR, filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        result = model_handler.predict(selected_model, file_path)

        processed_image_base64 = None
        if result.get("image_array") is not None:
            _, buffer = cv2.imencode('.jpg', result["image_array"])
            processed_image_base64 = base64.b64encode(buffer).decode('utf-8')

        return {
            "model_id": selected_model,
            "prediction": result.get("text", "Unknown"),
            "confidence": result.get("confidence", 0.0),
            "processed_image_base64": processed_image_base64,
        }
    except Exception as e:
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict-all")
async def predict_all(file: UploadFile = File(...)):
    """Run prediction across all available models in parallel."""
    file_path = None
    try:
        ext = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
        filename = f"{uuid.uuid4()}{ext}"
        file_path = os.path.join(UPLOAD_DIR, filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        model_ids = model_handler.available_model_ids()
        results = []
        print(f"[DEBUG] /predict-all received file: {file.filename}")
        print(f"[DEBUG] Saved upload path: {file_path}")
        print(f"[DEBUG] Models scheduled: {model_ids}")

        for model_id in model_ids:
            try:
                print(f"[DEBUG] Starting model: {model_id}")
                model_start = time.perf_counter()
                print(f"[DEBUG] Running prediction for: {model_id}")
                result = model_handler.predict(model_id, file_path)
                elapsed = time.perf_counter() - model_start
                print(f"[DEBUG] Finished prediction for: {model_id}")
                print(f"[DEBUG] Prediction execution time for {model_id}: {elapsed:.4f}s")

                processed_image_base64 = None
                if result.get("image_array") is not None:
                    _, buffer = cv2.imencode('.jpg', result["image_array"])
                    processed_image_base64 = base64.b64encode(buffer).decode('utf-8')

                results.append({
                    "model_id": model_id,
                    "prediction": result.get("text", "Unknown"),
                    "confidence": result.get("confidence", 0.0),
                    "processed_image_base64": processed_image_base64,
                    "success": True,
                    "error": None
                })
            except Exception as e:
                import traceback
                print(f"[DEBUG] Exception while running model: {model_id}")
                traceback.print_exc()
                results.append({
                    "model_id": model_id,
                    "prediction": None,
                    "confidence": 0,
                    "processed_image_base64": None,
                    "success": False,
                    "error": str(e)
                })

        response_payload = {
            "results": results,
            "total_models": len(model_ids),
            "successful_predictions": sum(1 for r in results if r["success"])
        }
        response_summary = [
            {
                "model_id": item["model_id"],
                "success": item["success"],
                "prediction": item["prediction"],
                "confidence": item["confidence"],
                "error": item["error"],
            }
            for item in results
        ]
        print(f"[DEBUG] Returning /predict-all response: {response_summary}")
        return response_payload

    except Exception as e:
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
