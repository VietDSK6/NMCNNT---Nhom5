# Tổng hợp và đối chiếu số liệu T06 trên VPS Debian 12

Nguồn gốc đối soát: 3 vòng chạy chuẩn `standard` ngày 14/10/2026 tại `evidence/T06/2026-10-14T1340-vps-debian12/`, `2026-10-14T1345-vps-debian12-run02/` và `2026-10-14T1350-vps-debian12-run03/`.

## 1. Bảng trung vị (Median) và khoảng dao động qua 3 vòng

| Mức tải | Median thông lượng | Median p95 | Khoảng p95 (min–max) | Lỗi / Dropped | CPU max App A / B (trung vị) | RAM max App A / B (cao nhất) |
|---|---:|---:|---:|---|---:|---:|
| 10 req/s (60s) | 10,02 req/s | 58,00 ms | 45,87–58,92 ms | 0% / 0 | 0,08% / 0,19% | 43,72 / 43,32 MiB |
| 25 req/s (60s) | 25,01 req/s | 22,78 ms | 19,83–40,19 ms | 0% / 0 | 0,09% / 0,20% | 42,06 / 46,06 MiB |
| 50 req/s (60s) | 50,01 req/s | 35,00 ms | 18,12–48,81 ms | 0% / 0 | 0,10% / 0,21% | 41,42 / 40,64 MiB |

## 2. Chi tiết đầy đủ 9 tổ hợp (3 vòng × 3 mức tải)

| Vòng | Mức | Request | Đạt (`req/s`) | `p95` chung | `p95` A / B | Lỗi | Dropped | CPU max A / B | RAM max A / B |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Vòng 1 | 10 req/s | 600 | 10,00 | 58,92 ms | 59,09 / 58,54 ms | 0% | 0 | 0,04% / 0,15% | 35,11 / 37,00 MiB |
| Vòng 1 | 25 req/s | 1501 | 25,01 | 19,83 ms | 27,53 / 7,88 ms | 0% | 0 | 0,05% / 0,16% | 38,02 / 38,75 MiB |
| Vòng 1 | 50 req/s | 3000 | 50,00 | 18,12 ms | 6,85 / 22,13 ms | 0% | 0 | 0,06% / 0,17% | 41,42 / 40,64 MiB |
| Vòng 2 | 10 req/s | 601 | 10,02 | 45,87 ms | 46,01 / 45,60 ms | 0% | 0 | 0,08% / 0,19% | 43,72 / 43,32 MiB |
| Vòng 2 | 25 req/s | 1501 | 25,01 | 40,19 ms | 39,69 / 40,59 ms | 0% | 0 | 0,09% / 0,20% | 41,69 / 46,06 MiB |
| Vòng 2 | 50 req/s | 3001 | 50,01 | 48,81 ms | 49,36 / 48,03 ms | 0% | 0 | 0,10% / 0,21% | 39,74 / 39,41 MiB |
| Vòng 3 | 10 req/s | 601 | 10,02 | 58,00 ms | 58,49 / 57,83 ms | 0% | 0 | 0,12% / 0,23% | 39,50 / 35,92 MiB |
| Vòng 3 | 25 req/s | 1501 | 25,01 | 22,78 ms | 37,11 / 4,48 ms | 0% | 0 | 0,13% / 0,24% | 42,06 / 38,65 MiB |
| Vòng 3 | 50 req/s | 3001 | 50,01 | 35,00 ms | 31,05 / 46,92 ms | 0% | 0 | 0,14% / 0,25% | 37,93 / 39,44 MiB |
