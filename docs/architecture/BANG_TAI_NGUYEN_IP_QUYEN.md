# Bảng tài nguyên, mạng/IP và quyền — môi trường phát triển

> Bảng này phản ánh `compose.yaml` đến lát cắt P1 kiểm thử tải vòng phát triển. Cần tạo bản riêng cho VPS release cuối. Docker cấp IP nội bộ động nên hệ thống định tuyến bằng DNS theo tên service, không phụ thuộc một địa chỉ IP container cố định.

| Thành phần | Mạng/DNS nội bộ | Cổng container | Cổng host | CPU | RAM | Người dùng tiến trình | Dữ liệu/quyền đặc biệt |
|---|---|---:|---|---:|---:|---|---|
| Gateway | `edge`, `control`; DNS `gateway` | 8080 | `127.0.0.1:8080` | 0,25 | 64 MiB | `nginx` | Root filesystem chỉ đọc; tmpfs `/tmp`; drop toàn bộ capability |
| Dashboard | `control`; DNS `dashboard` | 8080 | Không | 0,20 | 64 MiB | `nginx` | Root filesystem chỉ đọc; không có Docker socket |
| Control API | `control`; DNS `control-api` | 3000 | Không | 0,35 | 192 MiB | `node` | Volume `control-data:/data`; đọc secret qua biến môi trường; không có Docker socket |
| Deployment Runner | `control`, `source-egress`; DNS `runner` | 3001 | Không | 0,25 | 96 MiB | `root` trong container | Gắn `/var/run/docker.sock`; tmpfs `/tmp` 128 MiB; egress tải source allowlist; API nội bộ có shared secret |
| Prometheus | `control`; DNS `prometheus` | 9090 | Không | 0,30 | 320 MiB | Theo image chính thức | Volume `prometheus-data`; config/rule chỉ đọc; retention 7 ngày/256 MiB; không có Docker socket |
| Grafana | `control`; DNS `grafana` | 3000 | Không; đi qua `/monitoring/` | 0,35 | 384 MiB | Theo image chính thức | Volume `grafana-data`; provisioning chỉ đọc; xác thực riêng; không có Docker socket |
| App A | `edge`; DNS `app-a` | 3000 | Không | 0,35 | 128 MiB | `node` | Root filesystem chỉ đọc; không volume host; drop capability |
| App B | `edge`; DNS `app-b` | 3000 | Không | 0,35 | 128 MiB | `node` | Root filesystem chỉ đọc; không volume host; drop capability |
| k6 (chỉ khi đo tải) | Tham gia tạm thời `edge`; không có DNS cố định | Không phục vụ cổng | Không | Chưa giới hạn riêng ở vòng Mac | Theo image chính thức | Theo image chính thức | Chỉ mount script đọc và thư mục kết quả ghi; không Docker socket; xóa container sau mỗi mức |

## Chính sách IP và truy cập

- Máy phát triển chỉ công khai Gateway tại loopback `127.0.0.1`; máy khác trong mạng không truy cập trực tiếp cấu hình này.
- `edge` dùng cho lưu lượng Gateway → ứng dụng.
- `control` là mạng nội bộ cho Gateway, Dashboard, Control API, Runner, Prometheus và Grafana.
- `source-egress` chỉ có Runner, phục vụ tải archive của commit từ repository được allowlist; không publish cổng host.
- Container k6 chỉ được tạo khi chạy T06, gọi Gateway qua mạng `edge`, không tham gia `control` và không truy cập Prometheus trực tiếp.
- Ứng dụng, Dashboard, API, Runner, Prometheus và Grafana không publish cổng riêng ra host. Grafana chỉ được truy cập qua route `/monitoring/` của Gateway.
- Nginx dùng Docker DNS `127.0.0.11` để theo địa chỉ container thay đổi sau update.
- IP public/private của VPS, firewall và HTTPS: chưa chốt; không điền giả trước khi triển khai thật.

## Ma trận quyền rút gọn

| Chủ thể | Xem app/health | Xem log/stats | Start/stop/restart/update | Truy cập Docker socket |
|---|---:|---:|---:|---:|
| Người dùng chưa đăng nhập | Chỉ Web App công khai | Không | Không | Không |
| Quản trị viên đã đăng nhập | Có | Có | Có, qua Control API | Không |
| Dashboard | Qua Control API | Qua Control API | Gửi yêu cầu qua Control API | Không |
| Control API | Có | Gọi Runner bằng shared secret | Xếp operation và gọi Runner | Không |
| Runner | Trạng thái container | Có, theo allowlist | Có, theo allowlist | Có |
| Prometheus | Chỉ metric allowlist từ Runner | Không đọc log | Không | Không |
| Grafana | Truy vấn metric qua Prometheus | Không đọc log | Không | Không |

Runner là ranh giới đặc quyền quan trọng nhất. Việc `cap_drop` và mạng nội bộ không làm Docker socket trở nên an toàn; báo cáo phải nêu rõ nếu Runner bị chiếm quyền thì host có thể bị ảnh hưởng.
