"""Derive lifecycle sustainability metrics from measured benchmark + training data.

Inputs : sustainability_benchmark.json  (measured: size, params, FLOPs, latency)
         reconciled_metrics.json        (measured: accuracy per model)
         training times below           (measured: from Colab notebook logs)
Outputs: sustainability_analysis.json + report figures

Energy is ESTIMATED as  E = P x t x PUE  from measured runtime and published
device power; it is not metered. Every assumption is declared in ASSUMPTIONS
so the report can state them explicitly and run a sensitivity analysis.
"""
import os, json
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
FIG = os.path.join(HERE, "sustainability_figures")
os.makedirs(FIG, exist_ok=True)

# ----------------------------------------------------------------- inputs
BENCH = json.load(open(os.path.join(HERE, "sustainability_benchmark.json")))
ACC = json.load(open(os.path.join(HERE, "reconciled_metrics.json")))

# Measured wall-clock training time, summed from per-epoch logs in the notebooks.
TRAIN_SECONDS = {
    "EfficientNetB3": 1125,   # 12 epochs, 1473 steps/epoch (batch 8)
    "DenseNet121":     687,   # 10 epochs,  166 steps/epoch (batch 64)
    "MobileNetV2":    4963,   # 25 epochs,  295 steps/epoch (batch 32), two phases
}
# Epochs that produced no usable model (MobileNetV2 runs were cut short mid-schedule)
WASTED_EPOCHS = {"EfficientNetB3": 0, "DenseNet121": 0, "MobileNetV2": 25}

ASSUMPTIONS = {
    "train_device": "NVIDIA Tesla T4 (Google Colab)",
    "train_power_w": 70,          # T4 board TDP
    "train_pue": 1.09,            # Google fleet-wide PUE
    "infer_device": "Intel Core i5-1235U (12 threads)",
    "infer_power_w": 15,          # processor base power (PBP)
    "infer_pue": 1.0,             # local workstation, no data-centre overhead
    "grid_gco2e_per_kwh": 475,    # IEA global average electricity carbon intensity
    "grid_ireland_gco2e_per_kwh": 324,
    "deployment_scans_per_day": 500,
}

J_PER_KWH = 3.6e6


def kwh(power_w, seconds, pue=1.0):
    return power_w * seconds * pue / J_PER_KWH


def main():
    A = ASSUMPTIONS
    daily = A["deployment_scans_per_day"]
    annual_inferences = daily * 365
    out = {"assumptions": A, "annual_inferences": annual_inferences, "models": {}}

    for name, b in BENCH.items():
        acc = ACC[name]["accuracy"]
        train_s = TRAIN_SECONDS[name]
        lat_s = b["latency_ms_mean"] / 1000.0

        train_kwh = kwh(A["train_power_w"], train_s, A["train_pue"])
        infer_kwh = kwh(A["infer_power_w"], lat_s, A["infer_pue"])
        annual_infer_kwh = infer_kwh * annual_inferences
        annual_total_kwh = train_kwh + annual_infer_kwh

        train_co2 = train_kwh * A["grid_gco2e_per_kwh"]
        annual_co2 = annual_total_kwh * A["grid_gco2e_per_kwh"]

        wasted_kwh = kwh(A["train_power_w"],
                         train_s * (WASTED_EPOCHS[name] / max(1, WASTED_EPOCHS[name])) if WASTED_EPOCHS[name] else 0,
                         A["train_pue"])

        out["models"][name] = {
            "accuracy": round(acc, 4),
            "accuracy_pct": round(acc * 100, 1),
            "size_mb": b["file_size_mb"],
            "params_m": b["parameters_millions"],
            "gflops": b["gflops_per_inference"],
            "latency_ms": b["latency_ms_mean"],
            "train_seconds": train_s,
            "train_kwh": round(train_kwh, 6),
            "train_gco2e": round(train_co2, 2),
            "energy_per_inference_kwh": infer_kwh,
            "energy_per_inference_j": round(A["infer_power_w"] * lat_s, 3),
            "annual_inference_kwh": round(annual_infer_kwh, 4),
            "annual_total_kwh": round(annual_total_kwh, 4),
            "annual_gco2e": round(annual_co2, 1),
            "gco2e_per_accuracy_point": round(annual_co2 / (acc * 100), 3),
            "accuracy_per_mb": round(acc * 100 / b["file_size_mb"], 3),
            "wasted_train_kwh": round(wasted_kwh, 6),
        }

    # ---------------------------------------------------- break-even analysis
    # For each pair: after how many inferences does the cheaper-to-run model
    # repay its extra training cost relative to the other?
    pairs = [("MobileNetV2", "DenseNet121"), ("EfficientNetB3", "DenseNet121")]
    be = {}
    for a, b_ in pairs:
        ma, mb = out["models"][a], out["models"][b_]
        d_train = ma["train_kwh"] - mb["train_kwh"]
        d_infer = mb["energy_per_inference_kwh"] - ma["energy_per_inference_kwh"]
        if d_infer > 0 and d_train > 0:
            n = d_train / d_infer
            be[f"{a}_vs_{b_}"] = {"break_even_inferences": int(round(n)),
                                  "break_even_days_at_500_per_day": round(n / 500, 1),
                                  "break_even_years_at_500_per_day": round(n / 500 / 365, 2)}
        else:
            be[f"{a}_vs_{b_}"] = {"break_even_inferences": None,
                                  "note": "no break-even: dominated on both training and inference"}
    out["break_even"] = be

    # ---------------------------------------------------- sensitivity
    sens = {}
    for name, m in out["models"].items():
        sens[name] = {
            "annual_gco2e_global_475": m["annual_gco2e"],
            "annual_gco2e_ireland_324": round(m["annual_total_kwh"] * A["grid_ireland_gco2e_per_kwh"], 1),
            "annual_gco2e_infer_power_55w": round(
                (m["train_kwh"] + kwh(55, m["latency_ms"] / 1000.0) * annual_inferences)
                * A["grid_gco2e_per_kwh"], 1),
        }
    out["sensitivity"] = sens

    with open(os.path.join(HERE, "sustainability_analysis.json"), "w") as f:
        json.dump(out, f, indent=2)

    # =============================================================== figures
    names = list(out["models"].keys())
    colors = {"EfficientNetB3": "#2E5E8C", "DenseNet121": "#2F7D3B", "MobileNetV2": "#B07C2A"}
    C = [colors[n] for n in names]

    # Fig 1: FLOPs vs measured latency (the misprediction finding)
    fig, ax1 = plt.subplots(figsize=(7.2, 3.4))
    x = np.arange(len(names)); w = 0.38
    g = [out["models"][n]["gflops"] for n in names]
    l = [out["models"][n]["latency_ms"] for n in names]
    b1 = ax1.bar(x - w/2, g, w, color="#8FA9C4", label="GFLOPs per inference (theoretical)")
    ax1.set_ylabel("GFLOPs per inference"); ax1.set_ylim(0, max(g) * 1.35)
    ax2 = ax1.twinx()
    b2 = ax2.bar(x + w/2, l, w, color="#C0504D", label="Measured CPU latency (ms)")
    ax2.set_ylabel("Measured CPU latency (ms)"); ax2.set_ylim(0, max(l) * 1.35)
    for b, v in zip(b1, g): ax1.text(b.get_x()+b.get_width()/2, v+0.15, f"{v:.2f}", ha="center", fontsize=8)
    for b, v in zip(b2, l): ax2.text(b.get_x()+b.get_width()/2, v+12, f"{v:.0f}", ha="center", fontsize=8)
    ax1.set_xticks(x); ax1.set_xticklabels(names, fontsize=9)
    ax1.set_title("Theoretical cost (FLOPs) vs measured cost (latency)", fontsize=10, fontweight="bold")
    h1, lb1 = ax1.get_legend_handles_labels(); h2, lb2 = ax2.get_legend_handles_labels()
    ax1.legend(h1+h2, lb1+lb2, fontsize=7.5, loc="upper center")
    plt.tight_layout(); plt.savefig(os.path.join(FIG, "fig_flops_vs_latency.png"), dpi=170); plt.close()

    # Fig 2: annual lifecycle energy split (training vs inference)
    fig, ax = plt.subplots(figsize=(7.2, 3.4))
    tr = [out["models"][n]["train_kwh"] for n in names]
    inf = [out["models"][n]["annual_inference_kwh"] for n in names]
    ax.bar(names, tr, color="#5B6B7C", label="Training (one-off)")
    ax.bar(names, inf, bottom=tr, color="#2F7D3B", label=f"Inference (1 year @ {daily}/day)")
    for i, n in enumerate(names):
        tot = tr[i] + inf[i]
        ax.text(i, tot + 0.012, f"{tot:.3f} kWh\n{out['models'][n]['annual_gco2e']:.0f} gCO2e",
                ha="center", fontsize=8)
    ax.set_ylabel("Energy (kWh)"); ax.set_ylim(0, max(np.array(tr)+np.array(inf)) * 1.35)
    ax.set_title("Estimated first-year lifecycle energy", fontsize=10, fontweight="bold")
    ax.legend(fontsize=8); ax.grid(axis="y", alpha=0.3)
    plt.tight_layout(); plt.savefig(os.path.join(FIG, "fig_lifecycle_energy.png"), dpi=170); plt.close()

    # Fig 3: sustainability-accuracy trade-off (the CA1 metric)
    fig, ax = plt.subplots(figsize=(7.2, 3.6))
    for n in names:
        m = out["models"][n]
        ax.scatter(m["annual_gco2e"], m["accuracy_pct"], s=m["size_mb"] * 7,
                   color=colors[n], alpha=0.75, edgecolor="black", linewidth=0.7, zorder=3)
        ax.annotate(f"{n}\n{m['gco2e_per_accuracy_point']:.2f} gCO2e/point",
                    (m["annual_gco2e"], m["accuracy_pct"]),
                    textcoords="offset points", xytext=(12, -6), fontsize=8)
    ax.set_xlabel("Estimated annual carbon cost (gCO2e)")
    ax.set_ylabel("Test accuracy (%)")
    ax.set_title("Accuracy vs carbon cost (bubble area = model size)", fontsize=10, fontweight="bold")
    ax.grid(alpha=0.3); ax.set_xlim(0, max(out["models"][n]["annual_gco2e"] for n in names) * 1.45)
    ax.set_ylim(70, 100)
    plt.tight_layout(); plt.savefig(os.path.join(FIG, "fig_tradeoff.png"), dpi=170); plt.close()

    # ---------------------------------------------------------------- report
    print(json.dumps({k: out[k] for k in ("break_even",)}, indent=2))
    print(f"\n{'model':<16}{'acc%':>7}{'size MB':>9}{'GFLOPs':>9}{'lat ms':>9}"
          f"{'train kWh':>11}{'yr kWh':>9}{'yr gCO2e':>10}{'gCO2e/pt':>10}")
    for n in names:
        m = out["models"][n]
        print(f"{n:<16}{m['accuracy_pct']:>7.1f}{m['size_mb']:>9.1f}{m['gflops']:>9.2f}"
              f"{m['latency_ms']:>9.1f}{m['train_kwh']:>11.5f}{m['annual_total_kwh']:>9.3f}"
              f"{m['annual_gco2e']:>10.1f}{m['gco2e_per_accuracy_point']:>10.2f}")
    print("\nSaved sustainability_analysis.json and figures.")


if __name__ == "__main__":
    main()
