"""Đọc dữ liệu gốc T06 trên VPS, đối chiếu ngưỡng đạt và xuất bảng tổng hợp Markdown + JSON."""

from __future__ import annotations

import json
from pathlib import Path

from t06_loader import load_vps_t06_rows, summarize_by_level, verify_acceptance

WORK_DIR = Path(__file__).resolve().parents[1]
ANALYSIS_DIR = WORK_DIR / "analysis"


def fmt_comma(value: float, digits: int = 2) -> str:
    return f"{value:.{digits}f}".replace(".", ",")


def build_markdown(rows, summaries) -> str:
    lines = [
        "# Tổng hợp và đối chiếu số liệu T06 trên VPS Debian 12",
        "",
        "Nguồn gốc đối soát: 3 vòng chạy chuẩn `standard` ngày 14/10/2026 tại `evidence/T06/2026-10-14T1340-vps-debian12/`, `2026-10-14T1345-vps-debian12-run02/` và `2026-10-14T1350-vps-debian12-run03/`.",
        "",
        "## 1. Bảng trung vị (Median) và khoảng dao động qua 3 vòng",
        "",
        "| Mức tải | Median thông lượng | Median p95 | Khoảng p95 (min–max) | Lỗi / Dropped | CPU max App A / B (trung vị) | RAM max App A / B (cao nhất) |",
        "|---|---:|---:|---:|---|---:|---:|",
    ]

    for item in summaries:
        lines.append(
            f"| {item['targetRps']} req/s ({item['duration']}) "
            f"| {fmt_comma(item['medianAchievedRps'])} req/s "
            f"| {fmt_comma(item['medianP95Ms'])} ms "
            f"| {fmt_comma(item['minP95Ms'])}–{fmt_comma(item['maxP95Ms'])} ms "
            f"| {fmt_comma(item['maxErrorPercent'], 0)}% / {item['maxDropped']} "
            f"| {fmt_comma(item['medianAppACpuPercent'])}% / {fmt_comma(item['medianAppBCpuPercent'])}% "
            f"| {fmt_comma(item['maxAppARamMiB'])} / {fmt_comma(item['maxAppBRamMiB'])} MiB |"
        )

    lines.extend(
        [
            "",
            "## 2. Chi tiết đầy đủ 9 tổ hợp (3 vòng × 3 mức tải)",
            "",
            "| Vòng | Mức | Request | Đạt (`req/s`) | `p95` chung | `p95` A / B | Lỗi | Dropped | CPU max A / B | RAM max A / B |",
            "|---|---|---:|---:|---:|---:|---:|---:|---:|---:|",
        ]
    )

    for row in rows:
        lines.append(
            f"| {row.run_label} | {row.target_rps} req/s | {row.requests} "
            f"| {fmt_comma(row.achieved_rps)} | {fmt_comma(row.p95_ms)} ms "
            f"| {fmt_comma(row.app_a_p95_ms)} / {fmt_comma(row.app_b_p95_ms)} ms "
            f"| {fmt_comma(row.error_percent, 0)}% | {row.dropped} "
            f"| {fmt_comma(row.app_a_cpu_max_percent)}% / {fmt_comma(row.app_b_cpu_max_percent)}% "
            f"| {fmt_comma(row.app_a_ram_max_mib)} / {fmt_comma(row.app_b_ram_max_mib)} MiB |"
        )

    lines.append("")
    return "\n".join(lines)


def main() -> None:
    rows = load_vps_t06_rows()
    verify_acceptance(rows)
    summaries = summarize_by_level(rows)

    ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
    md_path = ANALYSIS_DIR / "t06-vps-tables.md"
    json_path = ANALYSIS_DIR / "t06-vps-summary.json"

    md_content = build_markdown(rows, summaries)
    md_path.write_text(md_content, encoding="utf-8")
    json_path.write_text(
        json.dumps({"verifiedCombinations": len(rows), "levels": summaries}, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    print(f"ĐẠT: Đã kiểm chứng 9/9 tổ hợp T06 VPS và xuất bảng tại {md_path}")
    for item in summaries:
        print(
            f"  - {item['targetRps']} req/s: median_rps={item['medianAchievedRps']}, "
            f"median_p95={item['medianP95Ms']} ms (range {item['minP95Ms']}–{item['maxP95Ms']} ms), "
            f"ram_max_A={item['maxAppARamMiB']} MiB, ram_max_B={item['maxAppBRamMiB']} MiB"
        )


if __name__ == "__main__":
    main()
