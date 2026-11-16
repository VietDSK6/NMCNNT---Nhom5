"""Vẽ 3 biểu đồ PNG từ dữ liệu gốc T06 trên VPS Debian 12."""

from __future__ import annotations

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

from t06_loader import LEVEL_ORDER, load_vps_t06_rows, summarize_by_level, verify_acceptance

WORK_DIR = Path(__file__).resolve().parents[1]
CHARTS_DIR = WORK_DIR / "analysis" / "charts"

plt.rcParams["font.sans-serif"] = ["DejaVu Sans", "Arial", "Segoe UI"]
plt.rcParams["axes.edgecolor"] = "#cbd5e1"
plt.rcParams["axes.linewidth"] = 0.8


def _annotate_bars(ax, bars, fmt: str = "{:.2f}", fontsize: int = 8) -> None:
    for bar in bars:
        height = bar.get_height()
        ax.annotate(
            fmt.format(height),
            xy=(bar.get_x() + bar.get_width() / 2, height),
            xytext=(0, 3),
            textcoords="offset points",
            ha="center",
            va="bottom",
            fontsize=fontsize,
        )


def plot_p95_latency(rows, summaries) -> Path:
    fig, ax = plt.subplots(figsize=(9, 5.2), dpi=160)
    labels = [f"{s['targetRps']} req/s" for s in summaries]
    x = np.arange(len(labels))
    width = 0.22

    run_labels = ["Vòng 1", "Vòng 2", "Vòng 3"]
    colors = ["#60a5fa", "#34d399", "#fbbf24"]

    for idx, (run_label, color) in enumerate(zip(run_labels, colors)):
        vals = [
            next(r.p95_ms for r in rows if r.run_label == run_label and r.level == lvl)
            for lvl in LEVEL_ORDER
        ]
        bars = ax.bar(x + (idx - 1) * width, vals, width, label=run_label, color=color, edgecolor="#334155", linewidth=0.5)
        _annotate_bars(ax, bars, "{:.2f}", fontsize=7.5)

    medians = [s["medianP95Ms"] for s in summaries]
    ax.plot(x, medians, color="#dc2626", marker="o", linewidth=2.2, markersize=7, zorder=5, label="Trung vị (Median)")
    for xi, med in zip(x, medians):
        ax.annotate(
            f"Median: {med:.2f} ms",
            xy=(xi, med),
            xytext=(0, 24),
            textcoords="offset points",
            ha="center",
            fontsize=8.5,
            fontweight="bold",
            color="#b91c1c",
            bbox=dict(boxstyle="round,pad=0.2", facecolor="white", edgecolor="#fca5a5", alpha=0.92),
            zorder=6,
        )

    ax.set_title("T06 (VPS Debian 12): Độ trễ p95 qua 3 vòng đo và giá trị Trung vị", fontsize=12, fontweight="bold", pad=12)
    ax.set_ylabel("Độ trễ p95 (ms)")
    ax.set_xlabel("Mức tải mục tiêu (60 giây/mức)")
    ax.set_xticks(x)
    ax.set_xticklabels(labels)
    ax.set_ylim(0, 88)
    ax.grid(axis="y", linestyle="--", alpha=0.4)
    ax.legend(loc="upper right", frameon=True)
    ax.text(0.01, 0.94, "Ngưỡng đạt: p95 < 500 ms (toàn bộ 9/9 lượt đều đạt xa ngưỡng)", transform=ax.transAxes, fontsize=8.5, color="#475569")

    out_path = CHARTS_DIR / "t06_p95_latency.png"
    fig.tight_layout()
    fig.savefig(out_path)
    plt.close(fig)
    return out_path


def plot_throughput(summaries) -> Path:
    fig, ax = plt.subplots(figsize=(8.2, 4.8), dpi=160)
    labels = [f"{s['targetRps']} req/s" for s in summaries]
    x = np.arange(len(labels))
    width = 0.32

    targets = [s["targetRps"] for s in summaries]
    achieved = [s["medianAchievedRps"] for s in summaries]

    b1 = ax.bar(x - width / 2, targets, width, label="Mục tiêu (Target req/s)", color="#94a3b8", edgecolor="#334155", linewidth=0.5)
    b2 = ax.bar(x + width / 2, achieved, width, label="Median thực tế đạt được", color="#2563eb", edgecolor="#1e3a8a", linewidth=0.5)
    _annotate_bars(ax, b1, "{:.0f}", fontsize=8.5)
    _annotate_bars(ax, b2, "{:.2f}", fontsize=8.5)

    ax.set_title("T06 (VPS Debian 12): Thông lượng mục tiêu vs Thực tế đạt được", fontsize=12, fontweight="bold", pad=12)
    ax.set_ylabel("Thông lượng (req/s)")
    ax.set_xlabel("Mức tải kiểm thử")
    ax.set_xticks(x)
    ax.set_xticklabels(labels)
    ax.set_ylim(0, 62)
    ax.grid(axis="y", linestyle="--", alpha=0.4)
    ax.legend(loc="upper left", frameon=True)
    ax.text(0.02, 0.78, "Lỗi HTTP: 0% | Dropped iterations: 0 ở cả 3 mức", transform=ax.transAxes, fontsize=8.5, color="#15803d", fontweight="bold")

    out_path = CHARTS_DIR / "t06_throughput.png"
    fig.tight_layout()
    fig.savefig(out_path)
    plt.close(fig)
    return out_path


def plot_resources(summaries) -> Path:
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11.5, 4.8), dpi=160)
    labels = [f"{s['targetRps']} req/s" for s in summaries]
    x = np.arange(len(labels))
    width = 0.34

    cpu_a = [s["maxAppACpuPercent"] for s in summaries]
    cpu_b = [s["maxAppBCpuPercent"] for s in summaries]
    b1 = ax1.bar(x - width / 2, cpu_a, width, label="App A (CPU max %)", color="#0ea5e9")
    b2 = ax1.bar(x + width / 2, cpu_b, width, label="App B (CPU max %)", color="#6366f1")
    _annotate_bars(ax1, b1, "{:.2f}%", fontsize=8)
    _annotate_bars(ax1, b2, "{:.2f}%", fontsize=8)
    ax1.set_title("CPU max cao nhất qua 3 vòng (%)", fontsize=11, fontweight="bold")
    ax1.set_ylabel("CPU sử dụng (%)")
    ax1.set_xticks(x)
    ax1.set_xticklabels(labels)
    ax1.set_ylim(0, 0.35)
    ax1.grid(axis="y", linestyle="--", alpha=0.4)
    ax1.legend(loc="upper left")

    ram_a = [s["maxAppARamMiB"] for s in summaries]
    ram_b = [s["maxAppBRamMiB"] for s in summaries]
    r1 = ax2.bar(x - width / 2, ram_a, width, label="App A (RAM max MiB)", color="#10b981")
    r2 = ax2.bar(x + width / 2, ram_b, width, label="App B (RAM max MiB)", color="#f59e0b")
    _annotate_bars(ax2, r1, "{:.2f}", fontsize=8)
    _annotate_bars(ax2, r2, "{:.2f}", fontsize=8)
    ax2.axhline(128.0, color="#ef4444", linestyle="--", linewidth=1.2, label="Giới hạn container (128 MiB)")
    ax2.axhline(102.4, color="#f97316", linestyle=":", linewidth=1.2, label="Ngưỡng cảnh báo 80% (102,4 MiB)")
    ax2.set_title("Working set RAM max qua 3 vòng (MiB)", fontsize=11, fontweight="bold")
    ax2.set_ylabel("RAM (MiB)")
    ax2.set_xticks(x)
    ax2.set_xticklabels(labels)
    ax2.set_ylim(0, 170)
    ax2.grid(axis="y", linestyle="--", alpha=0.4)
    ax2.legend(loc="upper right", fontsize=8)

    fig.suptitle("T06 (VPS Debian 12): Tài nguyên CPU và RAM của App A / App B khi chịu tải", fontsize=12.5, fontweight="bold")
    out_path = CHARTS_DIR / "t06_resources_cpu_ram.png"
    fig.tight_layout()
    fig.savefig(out_path)
    plt.close(fig)
    return out_path


def main() -> None:
    rows = load_vps_t06_rows()
    verify_acceptance(rows)
    summaries = summarize_by_level(rows)

    CHARTS_DIR.mkdir(parents=True, exist_ok=True)
    paths = [
        plot_p95_latency(rows, summaries),
        plot_throughput(summaries),
        plot_resources(summaries),
    ]
    for path in paths:
        print(f"ĐÃ XUẤT BIỂU ĐỒ: {path}")


if __name__ == "__main__":
    main()
