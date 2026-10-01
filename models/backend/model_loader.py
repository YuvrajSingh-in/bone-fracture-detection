import os
import tensorflow as tf

# Monkeypatch DepthwiseConv2D to pop 'groups' if present (Keras 2 to 3 compatibility)
_original_depthwise_init = tf.keras.layers.DepthwiseConv2D.__init__
def _patched_depthwise_init(self, *args, **kwargs):
    if 'groups' in kwargs:
        kwargs.pop('groups')
    _original_depthwise_init(self, *args, **kwargs)
tf.keras.layers.DepthwiseConv2D.__init__ = _patched_depthwise_init

import cv2
import numpy as np
import torch
import torchvision.transforms as transforms
import time

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.normpath(os.path.join(BASE_DIR, "..", "models"))
NEW_MODELS_DIR = os.path.normpath(os.path.join(BASE_DIR, "..", "new model"))

class ModelHandler:
    def __init__(self):
        self.loaded_models = {}
        self.model_configs = {
            "bone_fracture_cnn": {
                "name": "EfficientNetB3",
                "type": "classification",
                "filename": "fracture_model_final.h5",
                "framework": "keras",
                "description": "EfficientNet-based CNN classifier for binary fracture detection.",
            },
            "bone_fracture_mobilenet": {
                "name": "MobileNetV2",
                "type": "classification",
                "filename": "bone_fracture_mobilenet.h5",
                "framework": "keras",
                "description": "Lightweight MobileNetV2 classifier optimised for edge inference.",
            },
            "cnn_advance": {
                "name": "DenseNet121",
                "type": "classification",
                "filename": "cnn_advance.pth",
                "framework": "pytorch",
                "description": "DenseNet121-based high-accuracy fracture classifier.",
            },
        }

    def available_models(self):
        return [
            {
                "id": model_id,
                "name": config["name"],
                "type": config["type"],
                "filename": config["filename"],
                "description": config["description"],
            }
            for model_id, config in self.model_configs.items()
        ]
#####
    def available_model_ids(self):
        return list(self.model_configs.keys())

    def load_model(self, model_id):
        if model_id not in self.model_configs:
            raise ValueError(f"Unknown model ID: {model_id}")
        
        if model_id in self.loaded_models:
            print(f"[DEBUG] Model loaded: {model_id} (cached)")
            return self.loaded_models[model_id]

        config = self.model_configs[model_id]
        print(f"[DEBUG] Loading model: {model_id}")
        print(f"[DEBUG] Model name: {config['name']}")

        candidate_paths = [
            # Check inside the backend directory (useful for container deployment)
            os.path.join(BASE_DIR, "models", config["filename"]),
            os.path.join(BASE_DIR, "new model", config["filename"]),
            os.path.join(BASE_DIR, config["filename"]),
            # Check sibling folders (useful for local development)
            os.path.normpath(os.path.join(BASE_DIR, "..", "models", config["filename"])),
            os.path.normpath(os.path.join(BASE_DIR, "..", "new model", config["filename"])),
        ]

        path = next((p for p in candidate_paths if os.path.exists(p)), candidate_paths[0])
        print(f"[DEBUG] Model path for {model_id}: {path}")
        print(f"[DEBUG] Model path exists for {model_id}: {os.path.exists(path)}")
        
        if not os.path.exists(path):
            raise FileNotFoundError(f"Model file not found: {path}")

        load_start = time.perf_counter()
        
        if config["framework"] == "keras":
            try:
                model = tf.keras.models.load_model(path)
            except Exception as err:
                raise RuntimeError(
                    f"Failed to load Keras model '{path}'. "
                    "This model likely requires a Keras 3 compatible runtime "
                    "(for example TensorFlow >= 2.16)."
                ) from err
            self.loaded_models[model_id] = {"model": model, "type": "keras"}
        elif config["framework"] == "pytorch":
            from torchvision import models
            # Instantiate architecture
            model = models.densenet121(weights=None)
            
            # Load weights to check class count
            state_dict = torch.load(path, map_location=torch.device('cpu'))
            
            # Adjust classifier
            if 'classifier.weight' in state_dict:
                num_classes = state_dict['classifier.weight'].shape[0]
                model.classifier = torch.nn.Linear(model.classifier.in_features, num_classes)
            
            model.load_state_dict(state_dict)
            model.eval()
            self.loaded_models[model_id] = {"model": model, "type": "pytorch"}
########
        elapsed = time.perf_counter() - load_start
        print(f"[DEBUG] Model loaded: {model_id}")
        print(f"[DEBUG] Model load time for {model_id}: {elapsed:.4f}s")
        return self.loaded_models[model_id]

    def predict(self, model_id, image_path):
        print(f"[DEBUG] Predict requested for: {model_id}")
        model_data = self.load_model(model_id)
        model = model_data["model"]
        framework = model_data["type"]
        config = self.model_configs[model_id]
        print(f"[DEBUG] Model name: {config['name']}")
        print(f"[DEBUG] Model framework: {framework}")

        if framework == "keras":
            # Preprocess for Keras
            img = cv2.imread(image_path)
            if img is None:
                raise ValueError("Unable to read image file. Please upload a valid JPG or PNG X-ray image.")
            
            #Convert to grayscale if model expects 1 channel...!!
            input_shape = model.input_shape
            print(f"[DEBUG] Input shape: {input_shape}")
            expected_channels = input_shape[-1] if len(input_shape) > 3 else input_shape[-1]
            
            if expected_channels == 1:
                # Convert to grayscale
                img_gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                img_resized = cv2.resize(img_gray, (224, 224))
                img_array = img_resized.reshape(1, 224, 224, 1).astype('float32') / 255.0
            else:
                # Keep as RGB
                img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                img_resized = cv2.resize(img_rgb, (224, 224))
                img_array = img_resized.reshape(1, 224, 224, 3).astype('float32')
                
                # Apply model-specific preprocessing
                # EfficientNetB3 expects pixels scaled to [-1, 1] via preprocess_input
                if model_id == "bone_fracture_cnn":
                    img_array = tf.keras.applications.efficientnet.preprocess_input(img_array)
                else:
                    # MobileNet and other models: simple /255 normalization
                    img_array = img_array / 255.0
            print(f"[DEBUG] Preprocessed image shape: {img_array.shape}")
            print(f"[DEBUG] Input shape: {img_array.shape}")
            print(f"[DEBUG] Running prediction for: {model_id}")
            predict_start = time.perf_counter()
            predictions = model.predict(img_array, verbose=0)
            elapsed = time.perf_counter() - predict_start

            print(f"[DEBUG] Raw prediction: {predictions}")
            print(f"[DEBUG] Prediction execution time for {model_id}: {elapsed:.4f}s")
            print(f"[DEBUG] Finished prediction for: {model_id}")

            # Class mapping (confirmed by debug output):
            #   class 0 = fractured (folder name 'fractured' comes first alphabetically)
            #   class 1 = not fractured
            # Sigmoid: output >= 0.5 -> class 1 -> Normal, < 0.5 -> class 0 -> Fracture
            if predictions.ndim == 2 and predictions.shape[1] == 1:
                normal_probability = float(predictions[0][0])
                is_normal = normal_probability >= 0.5
                conf = normal_probability if is_normal else 1.0 - normal_probability
                label_text = "Normal Structure" if is_normal else "Fracture Detected"
            else:
                predicted_class = int(np.argmax(predictions, axis=1)[0])
                conf = float(predictions[0][predicted_class])
                label_text = "Fracture Detected" if predicted_class == 0 else "Normal Structure"
            
            return {
                "image_array": img,
                "text": label_text,
                "confidence": conf
            }

        elif framework == "pytorch":
            # Preprocess for PyTorch
            img = cv2.imread(image_path)
            if img is None:
                raise ValueError("Unable to read image file. Please upload a valid JPG or PNG X-ray image.")
            # Convert BGR to RGB
            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            
            # Define transforms matching training (Resize, ToTensor, Normalize)
            transform = transforms.Compose([
                transforms.ToPILImage(),
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
            ])
            
            input_tensor = transform(img_rgb).unsqueeze(0) # Add batch dimension
            print(f"[DEBUG] Preprocessed image shape: {img_rgb.shape}")
            print(f"[DEBUG] Input shape: {input_tensor.shape}")
            print(f"[DEBUG] Running prediction for: {model_id}")
            predict_start = time.perf_counter()
            with torch.no_grad():
                output = model(input_tensor)
                elapsed = time.perf_counter() - predict_start
                print(f"[DEBUG] Raw prediction: {output}")
                print(f"[DEBUG] Prediction execution time for {model_id}: {elapsed:.4f}s")
                print(f"[DEBUG] Finished prediction for: {model_id}")

                if output.shape[1] == 1:
                    # Training used ImageFolder with alphabetical classes:
                    #   class 0 = fractured, class 1 = not fractured
                    # so sigmoid output is P(not fractured), same as the Keras models.
                    probs = torch.sigmoid(output)
                    normal_prob = float(probs.item())
                    is_fracture = normal_prob < 0.5
                    conf = 1.0 - normal_prob if is_fracture else normal_prob
                else:
                    probs = torch.softmax(output, dim=1)
                    conf = float(torch.max(probs).item())
                    class_idx = int(torch.argmax(probs).item())
                    is_fracture = (class_idx == 1)
            
            label_text = "Fracture Detected" if is_fracture else "Normal Structure"
            
            return {
                "image_array": img,
                "text": label_text,
                "confidence": conf
            }

        return None
