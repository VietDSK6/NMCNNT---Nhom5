# Công việc Giám sát & Kiểm thử Hiệu năng — Trần Hải Minh (B24DCCC206)

Thư mục này chứa toàn bộ sản phẩm kỹ thuật riêng, kịch bản kiểm thử mở rộng, bộ phân tích số liệu & biểu đồ T06 và bằng chứng chạy thử của **Trần Hải Minh (`B24DCCC206`, GitHub `THM-B24DCCC206`)** trên nhánh `member/minh-monitoring`.

---

## 1. Cấu trúc thư mục

```text
work/minh-monitoring/
├── README.md                                 # Tài liệu hướng dẫn chạy lại & phân tích số liệu thật T05/T06
├── scripts/
│   ├── verify-observability-rules.mjs        # Kiểm tra sâu target, 3 alert rules & 9 nhóm metric cho mọi app đang chạy (OBS-02)
│   ├── test-alert-app-a-stop.sh              # Kịch bản giả lập dừng app-a -> kích hoạt alert FIRING -> khôi phục
│   ├── dynamic-load.js                       # Kịch bản k6 nhận danh sách ứng dụng động (app-a, app-b, app-c...)
│   ├── run-dynamic-load.mjs                  # Tự động phát hiện mọi app đang chạy, chạy k6 + gom metric Prometheus
│   ├── summarize-dynamic.mjs                 # Tổng hợp JSON/CSV/Markdown cho kiểm thử tải đa ứng dụng
│   ├── run-all-checks.sh                     # Chạy gộp T05 nền + OBS-02 + (tùy chọn) diễn tập alert & tải động
│   ├── t06_loader.py                         # Module đọc & kiểm chứng dữ liệu gốc T06 VPS (dùng chung)
│   ├── analyze-t06.py                        # Đối chiếu 9/9 tổ hợp VPS và xuất bảng Markdown/JSON
│   └── generate-t06-charts.py                # Vẽ 3 biểu đồ PNG (p95, thông lượng, CPU/RAM) từ CSV gốc
├── analysis/
│   ├── t06-vps-tables.md                     # Bảng tổng hợp số liệu trung vị và 9 tổ hợp T06 VPS
│   ├── t06-vps-summary.json                  # Dữ liệu tổng hợp máy đọc
│   └── charts/
│       ├── t06_p95_latency.png               # Biểu đồ p95 qua 3 vòng & trung vị (10/25/50 req/s)
│       ├── t06_throughput.png                # Biểu đồ thông lượng mục tiêu vs thực tế
│       └── t06_resources_cpu_ram.png         # Biểu đồ CPU max (%) & RAM max (MiB) của App A/B
└── evidence-t05/
    ├── environment.md                        # Thông tin môi trường chạy kiểm chứng
    ├── commands.txt                          # Các lệnh đã chạy
    ├── result.txt                            # Log kết quả chạy thực tế có dấu thời gian
    └── conclusion.md                         # Kết luận & giới hạn ghi nhận
```

---

## 2. Hướng dẫn chạy lại (khi stack 8 service đang chạy `healthy`)

Từ thư mục gốc của repository:

```bash
# Chạy kiểm thử giám sát T05 + OBS-02 + phân tích & xuất lại biểu đồ T06:
./work/minh-monitoring/scripts/run-all-checks.sh

# Nếu muốn chạy kèm kịch bản dừng thử app-a để kiểm tra alert FIRING (~45 giây):
./work/minh-monitoring/scripts/run-all-checks.sh --with-alert-drill
```

Chạy riêng từng phần:

```bash
# 1. Bài test nền của nhóm (15 bước)
./tests/integration/p1_observability.sh

# 2. Kiểm tra sâu 3 Alert Rules & 9 nhóm metric (tự động quét mọi app đang chạy: app-a, app-b, app-c...)
node work/minh-monitoring/scripts/verify-observability-rules.mjs

# 3. Kiểm thử tải động đa ứng dụng (tự phát hiện mọi app đang chạy gồm cả Web Service mới như app-c)
# Hỗ trợ 3 mức thời gian: quick (10s/mức), pilot (20s/mức), standard (60s/mức)
node work/minh-monitoring/scripts/run-dynamic-load.mjs quick

# 4. Kịch bản dừng thử app-a -> cảnh báo FIRING -> tự bật lại app-a
./work/minh-monitoring/scripts/test-alert-app-a-stop.sh

# 5. Đối chiếu số liệu gốc T06 VPS & vẽ lại 3 biểu đồ PNG (yêu cầu Python 3 + matplotlib)
python work/minh-monitoring/scripts/analyze-t06.py
python work/minh-monitoring/scripts/generate-t06-charts.py
```

---

## 3. Phân tích số liệu thật T06 (VPS Debian 12 — 14/10/2026)

Nguồn dữ liệu gốc: 3 vòng chạy chuẩn `standard` (`10 / 25 / 50 req/s`, `60s/mức`) tại:
- `evidence/T06/2026-10-14T1340-vps-debian12/summary.csv`
- `evidence/T06/2026-10-14T1345-vps-debian12-run02/summary.csv`
- `evidence/T06/2026-10-14T1350-vps-debian12-run03/summary.csv`

### Bảng tổng hợp từ dữ liệu gốc (chưa qua làm tròn cảm tính)

| Mức tải | Median thông lượng | Median `p95` | Khoảng `p95` (3 vòng) | Lỗi / Dropped | CPU max App A / B (trung vị) | RAM max App A / B (cao nhất) |
|---|---:|---:|---:|---|---:|---:|
| `10 req/s` (60s) | `10,02 req/s` | `58,00 ms` | `45,87–58,92 ms` | `0% / 0` | `0,08% / 0,19%` | `43,72 / 43,32 MiB` |
| `25 req/s` (60s) | `25,01 req/s` | `22,78 ms` | `19,83–40,19 ms` | `0% / 0` | `0,09% / 0,20%` | `42,06 / 46,06 MiB` |
| `50 req/s` (60s) | `50,01 req/s` | `35,00 ms` | `18,12–48,81 ms` | `0% / 0` | `0,10% / 0,21%` | `41,42 / 40,64 MiB` |

### Nhận xét kỹ thuật
1. **Thông lượng & độ tin cậy:** Ở cả 3 mức tải qua 3 vòng (9/9 tổ hợp), hệ thống đạt đúng tốc độ gửi mục tiêu (`10,00–10,02`, `25,01`, `50,00–50,01 req/s`), **không có request lỗi (`0%`)** và **không rơi iteration (`dropped = 0`)**.
2. **Độ trễ `p95` và lý do không tăng tuyến tính:** Toàn bộ 9 lần đo đều dưới ngưỡng `500 ms` rất xa (`18,12 – 58,92 ms`). Hiện tượng `p95` ở `10 req/s` (`58,00 ms`) cao hơn `25 req/s` (`22,78 ms`) và `50 req/s` (`35,00 ms`) là hợp lý vì:
   - Endpoint `/version` chỉ trả JSON nhỏ, ở `10–50 req/s` hệ thống chưa hề chạm điểm nghẽn.
   - Ở `10 req/s` tổng số mẫu trong 60s chỉ có `600–601` request (ít hơn 5 lần so với `3.001` request ở `50 req/s`), nên chỉ vài request bị trễ nhẹ do lập lịch tiến trình hệ điều hành, garbage collection hoặc làm nóng kết nối dễ kéo phân vị thứ 95 lên cao hơn. Điều này cho thấy việc **lặp 3 vòng lấy trung vị** là cần thiết để tránh kết luận sai từ một vòng đơn lẻ.
3. **Tài nguyên CPU/RAM trong lúc chịu tải:**
   - CPU của App A (`0,04%–0,14%`) và App B (`0,15%–0,25%`) vẫn rất thấp, chưa có dấu hiệu bão hòa.
   - Working set RAM dao động `35,11–46,06 MiB` (`27,43%–35,99%` trên trần `128 MiB`), nằm dưới rất xa ngưỡng cảnh báo `80%` (`102,4 MiB`) của rule `MiniPaasApplicationMemoryHigh`.
4. **Giới hạn của phép đo:**
   - Container `k6` chạy cùng VPS (`2 vCPU, 3,8 GiB RAM`) với hệ thống đích nên chia sẻ tài nguyên CPU/RAM của cùng máy ảo.
   - Mức tải tối đa hiện mới dừng ở `50 req/s` trên endpoint JSON nhẹ, chưa tăng dần tải tới điểm bão hòa để đo ngưỡng chịu tải tối đa của Nginx Gateway hay Control API.
