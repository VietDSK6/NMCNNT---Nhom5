# Kiến trúc P1 — giám sát chuỗi thời gian với Prometheus và Grafana

## 1. Trạng thái

Lát cắt P1 này đã được kiểm thử trên môi trường phát triển ngày 12/10/2026. Runner xuất số liệu của App A/App B theo định dạng Prometheus; Prometheus thu thập mỗi 5 giây và Grafana hiển thị dashboard được cấp sẵn từ file trong repository.

P0.2C vẫn chịu trách nhiệm đọc log gần nhất và ảnh chụp tài nguyên theo yêu cầu. P1 không thay thế luồng đó mà bổ sung lịch sử theo thời gian để quan sát xu hướng và đối chiếu với kiểm thử tải sau này.

## 2. Luồng dữ liệu

```text
Docker Engine
    |
    | stats của container trong allowlist
    v
Deployment Runner :3001/metrics
    |
    | scrape 5 giây, mạng control nội bộ
    v
Prometheus :9090 ---- volume prometheus-data
    |
    | PromQL
    v
Grafana :3000 -------- volume grafana-data
    |
    | /monitoring/ qua Gateway, yêu cầu đăng nhập Grafana
    v
Người quản trị
```

Runner và Prometheus không publish cổng ra host. Grafana cũng không có port host riêng; Nginx Gateway chuyển tiếp `/monitoring/`. Toàn bộ luồng thu thập nằm trong mạng `control` có thuộc tính `internal`.

## 3. Lý do không dùng cAdvisor trong lát cắt này

Runner đã có catalog App A/App B, logic tìm container theo nhãn và quyền đọc Docker stats. Việc thêm exporter vào Runner:

- Chỉ tạo metric cho đúng ứng dụng Mini PaaS quản lý, không lộ toàn bộ container của host.
- Không cần gắn thêm Docker socket hoặc mount filesystem host vào một container cAdvisor khác.
- Tái sử dụng công thức CPU, working set RAM, PID và lưu lượng mạng đã được unit test ở P0.2C.
- Giảm một service đặc quyền và khác biệt giữa Docker Desktop/OrbStack với Linux.

Đổi lại, exporter phụ thuộc Runner. Nếu Runner lỗi, Prometheus mất đồng thời dữ liệu điều khiển và dữ liệu tài nguyên. Đây là giới hạn chấp nhận được của mô hình một host, không phải kiến trúc giám sát độc lập cho production.

## 4. Các metric

| Metric | Kiểu | Ý nghĩa |
|---|---|---|
| `mini_paas_app_running` | gauge | Container đang chạy bằng 1, còn lại bằng 0 |
| `mini_paas_app_healthy` | gauge | Docker health check đạt bằng 1 |
| `mini_paas_app_scrape_success` | gauge | Runner đọc được trạng thái/số liệu cần thiết bằng 1 |
| `mini_paas_app_info` | gauge | Nhãn app, container, version, trạng thái và health hiện tại |
| `mini_paas_app_cpu_percent` | gauge | Phần trăm CPU tại mẫu gần nhất |
| `mini_paas_app_memory_working_set_bytes` | gauge | Working set RAM theo byte |
| `mini_paas_app_memory_limit_bytes` | gauge | Giới hạn RAM container theo byte |
| `mini_paas_app_memory_usage_ratio` | gauge | Tỷ lệ working set trên giới hạn, từ 0 đến 1 |
| `mini_paas_app_pids` | gauge | Số tiến trình hiện có |
| `mini_paas_app_network_receive_bytes_total` | counter | Tổng byte nhận kể từ khi container khởi động |
| `mini_paas_app_network_transmit_bytes_total` | counter | Tổng byte gửi kể từ khi container khởi động |

Không gắn `container_id` vào các metric tài nguyên để tránh tạo chuỗi mới không cần thiết mỗi khi deployment thay container. `container_id` vẫn có trong `mini_paas_app_info` để truy vết. Bộ đếm mạng trở về đầu khi container bị thay thế; truy vấn `rate()` phải chấp nhận hiện tượng reset counter.

## 5. Lưu trữ và giới hạn tài nguyên

- Prometheus: image `prom/prometheus:v3.14.0` được ghim thêm manifest digest, scrape 5 giây, retention 7 ngày và tối đa 256 MiB dữ liệu TSDB.
- Grafana: image `grafana/grafana:13.2.2` được ghim thêm manifest digest; datasource và dashboard được provisioning từ file chỉ đọc.
- Prometheus: tối đa 0,30 CPU, 320 MiB RAM và 100 PID.
- Grafana: tối đa 0,35 CPU, 384 MiB RAM và 300 PID.
- Hai volume `prometheus-data`, `grafana-data` tồn tại sau `docker compose down` thông thường.

Giới hạn PID của Grafana cao hơn các service Node/Nginx vì Grafana 13 khởi tạo nhiều tiến trình/luồng nền. Lần cấu hình đầu với 100 PID làm container khởi động lại; mức 300 đã được kiểm thử thành công trên môi trường phát triển.

## 6. Dashboard và cảnh báo

Dashboard `mini-paas-overview` có sáu vùng:

1. Trạng thái health check.
2. CPU theo thời gian.
3. Tỷ lệ RAM trên giới hạn container.
4. Working set RAM.
5. Số tiến trình.
6. Tốc độ nhận/gửi mạng.

Prometheus nạp ba quy tắc:

- Ứng dụng không khỏe liên tục 30 giây.
- RAM vượt 80% giới hạn liên tục 2 phút.
- Runner không đọc được stats liên tục 30 giây.

Hiện chưa có Alertmanager hoặc kênh gửi thông báo. Quy tắc chỉ tạo trạng thái alert trong Prometheus/Grafana; báo cáo không được gọi đây là hệ thống cảnh báo hoàn chỉnh.

## 7. Xác thực và ranh giới quyền

- `/metrics` không yêu cầu Runner secret vì Prometheus không đi qua API quản trị; endpoint chỉ có thể truy cập từ mạng `control` và chỉ chứa số liệu của allowlist.
- Các endpoint vòng đời/log/stats của Runner vẫn yêu cầu `x-runner-token`.
- Grafana tắt anonymous access và đăng ký tài khoản. Trong MVP một quản trị viên, Grafana dùng cùng username nhưng hỗ trợ mật khẩu riêng; nếu biến riêng không có thì fallback về mật khẩu Dashboard để tương thích môi trường cũ. Hai hệ thống duy trì phiên đăng nhập riêng.
- Prometheus không được route qua Gateway và không có port host.
- Grafana không có Docker socket; datasource chỉ trỏ tới Prometheus nội bộ.

## 8. Kiểm thử

Lệnh:

```bash
make test-p1-observability
```

Kết quả ngày 12/10/2026: 15 kiểm tra tích hợp đạt, gồm metric của hai app, nhiều mẫu trong cửa sổ 30 giây, giá trị RAM hữu hạn, target Runner `up`, ba alert rule, health Grafana, yêu cầu xác thực, datasource và dashboard sáu panel. Toàn bộ `make test` và luồng P1 Git deployment 10/10 cũng tiếp tục đạt.

## 9. Giới hạn

- Chưa thu thập CPU/RAM của Gateway, Control API, Runner, Prometheus và Grafana; dashboard tập trung vào hai ứng dụng được Mini PaaS quản lý.
- Log vẫn đọc trực tiếp từ Docker theo giới hạn, chưa có Loki hoặc lưu trữ log tập trung.
- Không có Alertmanager, email hoặc webhook thông báo.
- Metric trên macOS/OrbStack chỉ là bằng chứng phát triển; số liệu hiệu năng chính thức phải thu trên VPS Linux.
- Prometheus và Grafana cùng nằm trên host được giám sát, nên host hỏng sẽ làm mất cả ứng dụng lẫn khả năng quan sát trực tiếp.
- Retention 7 ngày/256 MiB phục vụ bài tập lớn, không phải chính sách production.
