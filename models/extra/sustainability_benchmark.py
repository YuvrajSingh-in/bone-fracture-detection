"""Sustainability benchmark for the three deployed fracture-detection models.

Per model it records: file size, parameter count, FLOPs per inference, cold-load
time, and CPU inference latency measured exactly as the deployed API invokes the
model (Keras -> model.predict(); PyTorch -> forward pass under no_grad), so the
figures describe the system as it actually runs rather than an idealised call.

FLOPs are counted analytically layer-by-layer, recursing into nested functional
models, because TensorFlow's graph profiler cannot resolve shapes inside them.
Convention: FLOPs = 2 x MACs, matching thop, so Keras and PyTorch are comparable.

Energy is NOT metered here; the report derives it from measured runtime and
published device power, and labels those figures as estimates.

Run on an otherwise idle machine - latency is timing-sensitive.
Outputs sustainability_benchmark.json.
"""
import os, json, time, statistics, warnings
warnings.filterwarnings("ignore")
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

import numpy as np
import cv2
import torch
import tensorflow as tf

_orig = tf.keras.layers.DepthwiseConv2D.__init__
def _patched(self, *a, **k):
    k.pop("groups", None)
    _orig(self, *a, **k)
tf.keras.layers.DepthwiseConv2D.__init__ = _patched

HERE = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.normpath(os.path.join(HERE, "..", "backend"))
DATA_TEST = os.path.normpath(os.path.join(HERE, "..", "..", "DATA", "test"))

MODELS = {
    "EfficientNetB3": {"path": os.path.join(BACKEND, "new model", "fracture_model_final.h5"),
                       "framework": "keras", "preprocess": "efficientnet"},
    "DenseNet121":    {"path": os.path.join(BACKEND, "models", "cnn_advance.pth"),
                       "framework": "pytorch", "preprocess": "torchvision"},
    "MobileNetV2":    {"path": os.path.join(BACKEND, "models", "bone_fracture_mobilenet.h5"),
                       "framework": "keras", "preprocess": "div255"},
}

N_WARMUP, N_RUNS = 5, 30


def _shape(x):
    """Keras 3 removed layer.output_shape / input_shape; use the tensor's shape."""
    try:
        s = x.shape
    except AttributeError:
        return None
    return tuple(s)


def keras_flops(model):
    """Analytic FLOPs (2 x MACs) over Conv2D / DepthwiseConv2D / Dense,
    recursing into nested sub-models. Negligible ops (BN, activations) ignored."""
    total = 0
    for layer in model.layers:
        if isinstance(layer, tf.keras.Model):
            total += keras_flops(layer)
            continue
        cls = layer.__class__.__name__
        if cls not in ("Conv2D", "DepthwiseConv2D", "Dense"):
            continue
        try:
            osh, ish = _shape(layer.output), _shape(layer.input)
        except Exception:
            continue
        if not osh or not ish:
            continue
        if cls == "Conv2D":
            kh, kw = layer.kernel_size
            total += 2 * kh * kw * ish[-1] * osh[1] * osh[2] * osh[3]
        elif cls == "DepthwiseConv2D":
            kh, kw = layer.kernel_size
            total += 2 * kh * kw * osh[1] * osh[2] * osh[3]
        elif cls == "Dense":
            total += 2 * ish[-1] * osh[-1]
    return total


def sample_image():
    d = os.path.join(DATA_TEST, "fractured")
    f = [x for x in os.listdir(d) if x.lower().endswith((".jpg", ".jpeg", ".png"))][0]
    return cv2.cvtColor(cv2.imread(os.path.join(d, f)), cv2.COLOR_BGR2RGB)


def prep_keras(img, mode):
    r = cv2.resize(img, (224, 224)).astype("float32").reshape(1, 224, 224, 3)
    return tf.keras.applications.efficientnet.preprocess_input(r) if mode == "efficientnet" else r / 255.0


def prep_torch(img):
    from torchvision import transforms
    t = transforms.Compose([transforms.ToPILImage(), transforms.Resize((224, 224)), transforms.ToTensor()])
    return t(img).unsqueeze(0)


def timeit(fn):
    for _ in range(N_WARMUP):
        fn()
    ts = []
    for _ in range(N_RUNS):
        s = time.perf_counter()
        fn()
        ts.append((time.perf_counter() - s) * 1000.0)
    return ts


def bench_keras(cfg, img):
    t0 = time.perf_counter()
    model = tf.keras.models.load_model(cfg["path"])
    load_s = time.perf_counter() - t0
    x = prep_keras(img, cfg["preprocess"])
    ts = timeit(lambda: model.predict(x, verbose=0))
    return int(model.count_params()), keras_flops(model), load_s, ts


def bench_torch(cfg, img):
    from torchvision import models
    t0 = time.perf_counter()
    m = models.densenet121(weights=None)
    sd = torch.load(cfg["path"], map_location="cpu")
    m.classifier = torch.nn.Linear(m.classifier.in_features, sd["classifier.weight"].shape[0])
    m.load_state_dict(sd); m.eval()
    load_s = time.perf_counter() - t0
    x = prep_torch(img)
    flops = None
    try:
        from thop import profile as thop_profile
        macs, _ = thop_profile(m, inputs=(x,), verbose=False)
        flops = int(macs * 2)
    except Exception as e:
        print(f"   [warn] thop failed: {type(e).__name__}")
    with torch.no_grad():
        ts = timeit(lambda: m(x))
    return sum(p.numel() for p in m.parameters()), flops, load_s, ts


def main():
    img = sample_image()
    results = {}
    print(f"CPU benchmark (as-deployed call path) | warmup={N_WARMUP} runs={N_RUNS}\n")

    for name, cfg in MODELS.items():
        size_mb = os.path.getsize(cfg["path"]) / (1024 ** 2)
        if cfg["framework"] == "keras":
            params, flops, load_s, ts = bench_keras(cfg, img)
        else:
            params, flops, load_s, ts = bench_torch(cfg, img)

        mean_ms = statistics.mean(ts)
        results[name] = {
            "framework": cfg["framework"],
            "file_size_mb": round(size_mb, 2),
            "parameters": params,
            "parameters_millions": round(params / 1e6, 2),
            "gflops_per_inference": round(flops / 1e9, 3) if flops else None,
            "cold_load_seconds": round(load_s, 3),
            "latency_ms_mean": round(mean_ms, 2),
            "latency_ms_std": round(statistics.pstdev(ts), 2),
            "latency_ms_median": round(statistics.median(ts), 2),
            "latency_ms_min": round(min(ts), 2),
            "throughput_img_per_sec": round(1000.0 / mean_ms, 2),
        }
        r = results[name]
        print(f"--- {name} ---")
        print(f"  size {size_mb:6.2f} MB | params {params/1e6:5.2f} M | "
              f"{r['gflops_per_inference']} GFLOPs | cold load {load_s:.2f} s")
        print(f"  latency {mean_ms:7.2f} +- {r['latency_ms_std']:.2f} ms "
              f"(median {r['latency_ms_median']:.1f}, min {r['latency_ms_min']:.1f}) "
              f"-> {r['throughput_img_per_sec']} img/s\n")

    with open(os.path.join(HERE, "sustainability_benchmark.json"), "w") as f:
        json.dump(results, f, indent=2)
    print("Saved sustainability_benchmark.json")


if __name__ == "__main__":
    main()
