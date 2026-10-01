"""Quantise EfficientNetB3 to INT8 TFLite.

The deployed checkpoint was trained under a mixed_float16 policy, so its graph
carries float16 ops that TFLite's builtin op set rejects (ERROR_NEEDS_FLEX_OPS).
This script forces a float32 global policy before loading so the graph is
re-instantiated in float32, then applies dynamic-range (INT8 weight) quantisation.

The FP32 baseline (accuracy 0.9567, 526.2 ms/image) is taken from the earlier
full-test-set run and not recomputed here. Outputs quantization_efficientnet.json.
"""
import os, json, time, statistics, warnings
warnings.filterwarnings("ignore")
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

import numpy as np
import cv2
import tensorflow as tf

# force float32 BEFORE the model is loaded
tf.keras.mixed_precision.set_global_policy("float32")

HERE = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.normpath(os.path.join(HERE, "..", "backend"))
TEST = os.path.normpath(os.path.join(HERE, "..", "..", "DATA", "test"))
OUT = os.path.join(HERE, "quantized")
os.makedirs(OUT, exist_ok=True)

MODEL = os.path.join(BACKEND, "new model", "fracture_model_final.h5")
CLASSES = ["fractured", "not fractured"]
FP32_ACC = 0.9567          # measured, full test set
FP32_MS_PER_IMG = 526.2    # measured, same run


def load_paths():
    paths, labels = [], []
    for idx, c in enumerate(CLASSES):
        d = os.path.join(TEST, c)
        for f in sorted(os.listdir(d)):
            if f.lower().endswith((".jpg", ".jpeg", ".png")):
                paths.append(os.path.join(d, f)); labels.append(idx)
    return paths, np.array(labels)


def prep(path):
    img = cv2.cvtColor(cv2.imread(path), cv2.COLOR_BGR2RGB)
    r = cv2.resize(img, (224, 224)).astype("float32").reshape(1, 224, 224, 3)
    return tf.keras.applications.efficientnet.preprocess_input(r)


def main():
    paths, labels = load_paths()
    fp32_mb = os.path.getsize(MODEL) / (1024 ** 2)
    print(f"Loading EfficientNetB3 under float32 policy ({fp32_mb:.2f} MB)...")
    model = tf.keras.models.load_model(MODEL)
    print(f"policy in effect: {tf.keras.mixed_precision.global_policy().name}")

    conv = tf.lite.TFLiteConverter.from_keras_model(model)
    conv.optimizations = [tf.lite.Optimize.DEFAULT]
    print("converting to INT8 TFLite ...")
    tfl = conv.convert()
    qpath = os.path.join(OUT, "EfficientNetB3_int8.tflite")
    with open(qpath, "wb") as f:
        f.write(tfl)
    q_mb = os.path.getsize(qpath) / (1024 ** 2)
    print(f"converted: {q_mb:.2f} MB  (-{(1-q_mb/fp32_mb)*100:.1f}%)")

    interp = tf.lite.Interpreter(model_path=qpath)
    interp.allocate_tensors()
    inp, out = interp.get_input_details()[0], interp.get_output_details()[0]

    print(f"evaluating INT8 on {len(paths)} test images ...")
    scores = np.zeros(len(paths), dtype=np.float32)
    t0 = time.perf_counter()
    for i, p in enumerate(paths):
        interp.set_tensor(inp["index"], prep(p))
        interp.invoke()
        scores[i] = float(interp.get_tensor(out["index"]).reshape(-1)[0])
    total_s = time.perf_counter() - t0

    preds = (scores >= 0.5).astype(int)   # score = P(not fractured)
    acc = float((preds == labels).mean())

    res = {
        "EfficientNetB3": {
            "fp32_size_mb": round(fp32_mb, 2),
            "int8_size_mb": round(q_mb, 2),
            "size_reduction_pct": round((1 - q_mb / fp32_mb) * 100, 1),
            "fp32_accuracy": FP32_ACC,
            "int8_accuracy": round(acc, 4),
            "accuracy_delta": round(acc - FP32_ACC, 4),
            "fp32_ms_per_image": FP32_MS_PER_IMG,
            "int8_ms_per_image": round(total_s / len(paths) * 1000, 2),
            "speedup_factor": round(FP32_MS_PER_IMG / (total_s / len(paths) * 1000), 2),
            "test_images": len(paths),
            "note": "float32 policy forced before load; original checkpoint used mixed_float16",
        }
    }
    with open(os.path.join(HERE, "quantization_efficientnet.json"), "w") as f:
        json.dump(res, f, indent=2)
    r = res["EfficientNetB3"]
    print(f"\nFP32 {fp32_mb:6.2f} MB  acc={FP32_ACC:.4f}  {FP32_MS_PER_IMG:.1f} ms/img")
    print(f"INT8 {q_mb:6.2f} MB  acc={acc:.4f}  {r['int8_ms_per_image']:.1f} ms/img")
    print(f"-> size -{r['size_reduction_pct']}%  acc {r['accuracy_delta']:+.4f}  "
          f"speedup {r['speedup_factor']}x")


if __name__ == "__main__":
    main()
