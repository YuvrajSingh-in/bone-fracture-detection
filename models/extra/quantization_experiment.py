"""Post-training quantization experiment: a concrete Green-AI efficiency strategy.

Converts the deployed Keras models to TensorFlow Lite with dynamic-range (INT8
weight) quantization, then measures the three quantities that matter for a
sustainability trade-off:
    1. model size on disk (storage / transfer footprint)
    2. CPU inference latency (energy proxy per prediction)
    3. classification accuracy on the full held-out test set (clinical cost)

Run only when the machine is otherwise idle - latency figures are timing-sensitive.
Outputs quantization_results.json.
"""
import os, json, time, statistics, warnings
warnings.filterwarnings("ignore")
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

import numpy as np
import cv2
import tensorflow as tf

_orig = tf.keras.layers.DepthwiseConv2D.__init__
def _patched(self, *a, **k):
    k.pop("groups", None)
    _orig(self, *a, **k)
tf.keras.layers.DepthwiseConv2D.__init__ = _patched

HERE = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.normpath(os.path.join(HERE, "..", "backend"))
TEST = os.path.normpath(os.path.join(HERE, "..", "..", "DATA", "test"))
OUT = os.path.join(HERE, "quantized")
os.makedirs(OUT, exist_ok=True)

# class 0 = fractured, class 1 = not fractured (alphabetical, matches training)
CLASSES = ["fractured", "not fractured"]

TARGETS = {
    "MobileNetV2": {
        "path": os.path.join(BACKEND, "models", "bone_fracture_mobilenet.h5"),
        "preprocess": "div255",
    },
    "EfficientNetB3": {
        "path": os.path.join(BACKEND, "new model", "fracture_model_final.h5"),
        "preprocess": "efficientnet",
    },
}

N_LATENCY = 20


def load_paths():
    paths, labels = [], []
    for idx, c in enumerate(CLASSES):
        d = os.path.join(TEST, c)
        for f in sorted(os.listdir(d)):
            if f.lower().endswith((".jpg", ".jpeg", ".png")):
                paths.append(os.path.join(d, f))
                labels.append(idx)
    return paths, np.array(labels)


def prep(path, mode):
    img = cv2.imread(path)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    r = cv2.resize(img, (224, 224)).astype("float32").reshape(1, 224, 224, 3)
    if mode == "efficientnet":
        return tf.keras.applications.efficientnet.preprocess_input(r)
    return r / 255.0


def evaluate_tflite(tflite_path, paths, labels, mode):
    interp = tf.lite.Interpreter(model_path=tflite_path)
    interp.allocate_tensors()
    inp = interp.get_input_details()[0]
    out = interp.get_output_details()[0]
    scores = np.zeros(len(paths), dtype=np.float32)
    for i, p in enumerate(paths):
        interp.set_tensor(inp["index"], prep(p, mode))
        interp.invoke()
        scores[i] = float(interp.get_tensor(out["index"]).reshape(-1)[0])
    preds = (scores >= 0.5).astype(int)   # score = P(not fractured)
    return preds, scores


def latency_tflite(tflite_path, sample, n=N_LATENCY):
    interp = tf.lite.Interpreter(model_path=tflite_path)
    interp.allocate_tensors()
    inp = interp.get_input_details()[0]
    for _ in range(3):
        interp.set_tensor(inp["index"], sample); interp.invoke()
    ts = []
    for _ in range(n):
        s = time.perf_counter()
        interp.set_tensor(inp["index"], sample); interp.invoke()
        ts.append((time.perf_counter() - s) * 1000.0)
    return ts


def main():
    paths, labels = load_paths()
    print(f"Test set: {len(paths)} images "
          f"({int((labels==0).sum())} fractured / {int((labels==1).sum())} not fractured)\n")
    results = {}

    for name, cfg in TARGETS.items():
        print(f"===== {name} =====")
        fp32_mb = os.path.getsize(cfg["path"]) / (1024 ** 2)

        # --- baseline (FP32 Keras) accuracy on full test set ---
        model = tf.keras.models.load_model(cfg["path"])
        base_scores = np.zeros(len(paths), dtype=np.float32)
        t0 = time.perf_counter()
        for i, p in enumerate(paths):
            base_scores[i] = float(model.predict(prep(p, cfg["preprocess"]), verbose=0).reshape(-1)[0])
        base_total_s = time.perf_counter() - t0
        base_preds = (base_scores >= 0.5).astype(int)
        base_acc = float((base_preds == labels).mean())
        print(f"  FP32 : {fp32_mb:6.2f} MB  acc={base_acc:.4f}  "
              f"total={base_total_s:.1f}s ({base_total_s/len(paths)*1000:.1f} ms/img)")

        # --- convert to TFLite with dynamic-range (INT8 weight) quantization ---
        conv = tf.lite.TFLiteConverter.from_keras_model(model)
        conv.optimizations = [tf.lite.Optimize.DEFAULT]
        tfl = conv.convert()
        qpath = os.path.join(OUT, f"{name}_int8.tflite")
        with open(qpath, "wb") as f:
            f.write(tfl)
        q_mb = os.path.getsize(qpath) / (1024 ** 2)

        # --- quantized accuracy on full test set ---
        t0 = time.perf_counter()
        q_preds, _ = evaluate_tflite(qpath, paths, labels, cfg["preprocess"])
        q_total_s = time.perf_counter() - t0
        q_acc = float((q_preds == labels).mean())
        agree = float((q_preds == base_preds).mean())

        sample = prep(paths[0], cfg["preprocess"])
        q_lat = latency_tflite(qpath, sample)

        results[name] = {
            "fp32_size_mb": round(fp32_mb, 2),
            "int8_size_mb": round(q_mb, 2),
            "size_reduction_pct": round((1 - q_mb / fp32_mb) * 100, 1),
            "fp32_accuracy": round(base_acc, 4),
            "int8_accuracy": round(q_acc, 4),
            "accuracy_delta": round(q_acc - base_acc, 4),
            "prediction_agreement": round(agree, 4),
            "fp32_total_eval_seconds": round(base_total_s, 1),
            "fp32_ms_per_image": round(base_total_s / len(paths) * 1000, 2),
            "int8_total_eval_seconds": round(q_total_s, 1),
            "int8_ms_per_image": round(q_total_s / len(paths) * 1000, 2),
            "int8_latency_ms_mean": round(statistics.mean(q_lat), 2),
            "speedup_factor": round(base_total_s / q_total_s, 2),
            "test_images": len(paths),
        }
        print(f"  INT8 : {q_mb:6.2f} MB  acc={q_acc:.4f}  "
              f"total={q_total_s:.1f}s ({q_total_s/len(paths)*1000:.1f} ms/img)")
        print(f"  -> size -{results[name]['size_reduction_pct']}%  "
              f"acc delta {results[name]['accuracy_delta']:+.4f}  "
              f"speedup {results[name]['speedup_factor']}x  "
              f"agreement {agree:.3f}\n")

    with open(os.path.join(HERE, "quantization_results.json"), "w") as f:
        json.dump(results, f, indent=2)
    print("Saved quantization_results.json")


if __name__ == "__main__":
    main()
