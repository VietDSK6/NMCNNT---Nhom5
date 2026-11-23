"""Tiện ích đọc và đối chiếu dữ liệu gốc T06 từ 3 vòng đo chuẩn trên VPS Linux."""

from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path
from statistics import median
from typing import Iterable

REPO_ROOT = Path(__file__).resolve().parents[3]

VPS_RUN_DIRS = [
    ("Vòng 1", REPO_ROOT / "evidence" / "T06" / "2026-10-14T1340-vps-debian12"),
    ("Vòng 2", REPO_ROOT / "evidence" / "T06" / "2026-10-14T1345-vps-debian12-run02"),
    ("Vòng 3", REPO_ROOT / "evidence" / "T06" / "2026-10-14T1350-vps-debian12-run03"),
]

LEVEL_ORDER = ("low", "medium", "high")


@dataclass(frozen=True)
class T06RunRow:
    run_label: str
    level: str
    target_rps: int
    duration: str
    requests: int
    achieved_rps: float
    p95_ms: float
    app_a_p95_ms: float
    app_b_p95_ms: float
    error_percent: float
    check_percent: float
    dropped: int
    thresholds_passed: bool
    observability_passed: bool
    app_a_cpu_max_percent: float
    app_b_cpu_max_percent: float
    app_a_ram_max_mib: float
    app_b_ram_max_mib: float
    app_a_ram_max_percent: float
    app_b_ram_max_percent: float


def _parse_bool(raw: str) -> bool:
    return raw.strip().lower() == "true"


def load_vps_t06_rows() -> list[T06RunRow]:
    """Đọc toàn bộ 9 dòng dữ liệu từ 3 file summary.csv gốc của VPS Debian 12."""
    rows: list[T06RunRow] = []
    for run_label, run_dir in VPS_RUN_DIRS:
        csv_path = run_dir / "summary.csv"
        if not csv_path.is_file():
            raise FileNotFoundError(f"Không tìm thấy file dữ liệu gốc: {csv_path}")

        with csv_path.open("r", encoding="utf-8", newline="") as handle:
            reader = csv.DictReader(handle)
            for item in reader:
                rows.append(
                    T06RunRow(
                        run_label=run_label,
                        level=item["level"].strip(),
                        target_rps=int(item["target_rps"]),
                        duration=item["duration"].strip(),
                        requests=int(item["requests"]),
                        achieved_rps=float(item["achieved_rps"]),
                        p95_ms=float(item["p95_ms"]),
                        app_a_p95_ms=float(item["app_a_p95_ms"]),
                        app_b_p95_ms=float(item["app_b_p95_ms"]),
                        error_percent=float(item["error_percent"]),
                        check_percent=float(item["check_percent"]),
                        dropped=int(item["dropped"]),
                        thresholds_passed=_parse_bool(item["thresholds_passed"]),
                        observability_passed=_parse_bool(item["observability_passed"]),
                        app_a_cpu_max_percent=float(item["app_a_cpu_max_percent"]),
                        app_b_cpu_max_percent=float(item["app_b_cpu_max_percent"]),
                        app_a_ram_max_mib=float(item["app_a_ram_max_mib"]),
                        app_b_ram_max_mib=float(item["app_b_ram_max_mib"]),
                        app_a_ram_max_percent=float(item["app_a_ram_max_percent"]),
                        app_b_ram_max_percent=float(item["app_b_ram_max_percent"]),
                    )
                )
    return rows


def verify_acceptance(rows: Iterable[T06RunRow]) -> None:
    """Kiểm tra tất cả 9 tổ hợp phải đạt đồng thời mọi ngưỡng T06."""
    row_list = list(rows)
    if len(row_list) != 9:
        raise AssertionError(f"Kỳ vọng 9 dòng (3 vòng x 3 mức), đọc được {len(row_list)} dòng.")

    for row in row_list:
        passed = (
            row.p95_ms < 500.0
            and row.error_percent < 1.0
            and row.check_percent > 99.0
            and row.dropped == 0
            and row.thresholds_passed
            and row.observability_passed
        )
        if not passed:
            raise AssertionError(f"Tổ hợp không đạt ngưỡng T06: {row}")


def summarize_by_level(rows: list[T06RunRow]) -> list[dict]:
    """Tính trung vị (median) và khoảng min-max qua 3 vòng cho từng mức tải."""
    summaries: list[dict] = []
    for level in LEVEL_ORDER:
        group = [r for r in rows if r.level == level]
        if len(group) != 3:
            raise AssertionError(f"Mức {level} phải có đúng 3 vòng, thấy {len(group)}.")

        p95_values = [r.p95_ms for r in group]
        rps_values = [r.achieved_rps for r in group]
        cpu_a = [r.app_a_cpu_max_percent for r in group]
        cpu_b = [r.app_b_cpu_max_percent for r in group]
        ram_a = [r.app_a_ram_max_mib for r in group]
        ram_b = [r.app_b_ram_max_mib for r in group]

        summaries.append(
            {
                "level": level,
                "targetRps": group[0].target_rps,
                "duration": group[0].duration,
                "medianAchievedRps": round(median(rps_values), 2),
                "medianP95Ms": round(median(p95_values), 2),
                "minP95Ms": round(min(p95_values), 2),
                "maxP95Ms": round(max(p95_values), 2),
                "maxErrorPercent": round(max(r.error_percent for r in group), 4),
                "maxDropped": max(r.dropped for r in group),
                "medianAppACpuPercent": round(median(cpu_a), 2),
                "maxAppACpuPercent": round(max(cpu_a), 2),
                "medianAppBCpuPercent": round(median(cpu_b), 2),
                "maxAppBCpuPercent": round(max(cpu_b), 2),
                "medianAppARamMiB": round(median(ram_a), 2),
                "maxAppARamMiB": round(max(ram_a), 2),
                "medianAppBRamMiB": round(median(ram_b), 2),
                "maxAppBRamMiB": round(max(ram_b), 2),
            }
        )
    return summaries
