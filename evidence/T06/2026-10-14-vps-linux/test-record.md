# Bảng kiểm thử T06 trên VPS Linux

Kỳ vọng chung: p95 dưới 500 ms, lỗi dưới 1%, check trên 99%, không có dropped iteration và cả App A/App B khỏe trong các mẫu Prometheus.

| Lần | Đầu vào | Thao tác | Kết quả mong đợi | Kết quả thực tế | Kết luận | Bằng chứng có thời gian |
|---:|---|---|---|---|---|---|
| 1 | 10 req/s, 60 giây | k6 gọi luân phiên App A/B qua Gateway | Đạt toàn bộ ngưỡng chung | 10,00 req/s; p95 58,92 ms; lỗi 0%; dropped 0 | Đạt | `../2026-10-14T1340-vps-debian12/summary.json` — 06:35:45Z–06:36:46Z |
| 1 | 25 req/s, 60 giây | Như trên | Đạt toàn bộ ngưỡng chung | 25,01 req/s; p95 19,83 ms; lỗi 0%; dropped 0 | Đạt | `../2026-10-14T1340-vps-debian12/summary.json` — 06:37:00Z–06:38:01Z |
| 1 | 50 req/s, 60 giây | Như trên | Đạt toàn bộ ngưỡng chung | 50,00 req/s; p95 18,12 ms; lỗi 0%; dropped 0 | Đạt | `../2026-10-14T1340-vps-debian12/summary.json` — 06:38:15Z–06:39:17Z |
| 2 | 10 req/s, 60 giây | Như trên | Đạt toàn bộ ngưỡng chung | 10,02 req/s; p95 45,87 ms; lỗi 0%; dropped 0 | Đạt | `../2026-10-14T1345-vps-debian12-run02/summary.json` |
| 2 | 25 req/s, 60 giây | Như trên | Đạt toàn bộ ngưỡng chung | 25,01 req/s; p95 40,19 ms; lỗi 0%; dropped 0 | Đạt | `../2026-10-14T1345-vps-debian12-run02/summary.json` |
| 2 | 50 req/s, 60 giây | Như trên | Đạt toàn bộ ngưỡng chung | 50,01 req/s; p95 48,81 ms; lỗi 0%; dropped 0 | Đạt | `../2026-10-14T1345-vps-debian12-run02/summary.json` |
| 3 | 10 req/s, 60 giây | Như trên | Đạt toàn bộ ngưỡng chung | 10,02 req/s; p95 58,00 ms; lỗi 0%; dropped 0 | Đạt | `../2026-10-14T1350-vps-debian12-run03/summary.json` |
| 3 | 25 req/s, 60 giây | Như trên | Đạt toàn bộ ngưỡng chung | 25,01 req/s; p95 22,78 ms; lỗi 0%; dropped 0 | Đạt | `../2026-10-14T1350-vps-debian12-run03/summary.json` |
| 3 | 50 req/s, 60 giây | Như trên | Đạt toàn bộ ngưỡng chung | 50,01 req/s; p95 35,00 ms; lỗi 0%; dropped 0 | Đạt | `../2026-10-14T1350-vps-debian12-run03/summary.json` |

Chi tiết check rate, health sample, CPU/RAM và dữ liệu request gốc nằm trong thư mục của từng vòng.
