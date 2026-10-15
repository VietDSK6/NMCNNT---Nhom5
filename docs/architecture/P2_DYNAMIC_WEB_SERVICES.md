# Web Service động và hostname riêng

**Trạng thái:** Đã triển khai và kiểm thử tích hợp trên macOS ngày 15/10/2026; chưa nghiệm thu lại trên VPS Linux.

## Mục tiêu

Cho phép quản trị viên tạo một sản phẩm độc lập từ repository GitHub tin cậy, thay vì chỉ chọn App A/B có sẵn. Mỗi Web Service có bản ghi, image, container, lịch sử deployment/release, biến môi trường, log, metric và URL riêng.

## Luồng xử lý

```text
Dashboard POST /api/v1/services
       |
       v
Control API -- xác thực owner/slug/context --> Runner
       |                                      |
       |                                      +-- đọc HEAD nhánh main
       |                                      +-- tải archive theo commit SHA
       |                                      +-- docker build image riêng
       |                                      +-- tạo/thay container giới hạn quyền
       v
SQLite application + deployment + release
       |
       +--> slug.ai2p.id.vn --> Gateway --> service-<slug>:3000
```

Control API nối cả mạng `control` và `edge` để gọi trực tiếp endpoint health của service qua Docker DNS. Gateway không công khai đường dẫn kiểm tra nội bộ. Runner vẫn là thành phần duy nhất có Docker socket.

## Ràng buộc an toàn của MVP

- Chỉ GitHub công khai dạng `https://github.com/owner/repo`.
- Owner phải nằm trong `TRUSTED_GITHUB_OWNERS`; mặc định chỉ có `VietDSK6`.
- Chỉ nhánh `main`; commit triển khai luôn là SHA đủ 40 ký tự.
- Build context phải là đường dẫn tương đối nằm trong checkout; Dockerfile nằm ở gốc context.
- Cổng trong container cố định 3000; không publish host port.
- Không nhận command, volume, capability, network hoặc privileged mode từ người dùng.
- Container dùng root filesystem chỉ đọc, `cap_drop=ALL`, `no-new-privileges`, 0,35 CPU, RAM 128 MiB, 100 PID và log rotation.

Đây là allowlist dành cho quản trị viên, không phải sandbox an toàn để chạy mã tùy ý từ người dùng Internet.

## Dữ liệu và định tuyến

Migration SQLite 006 bổ sung loại ứng dụng, repository, nhánh, build context, hostname và cổng nội bộ. Container động mang nhãn `io.mini-paas.dynamic=true`, `io.mini-paas.app-id`, `io.mini-paas.slug` và nhãn Compose tương thích để Runner có thể tìm lại sau khi khởi động.

URL phát triển là `http://<slug>.localhost:8080`; URL VPS là `https://<slug>.ai2p.id.vn`. Nginx dùng hostname để suy ra alias Docker `service-<slug>:3000`. `paas.ai2p.id.vn` được giữ riêng cho Control Center.

## Kết quả vòng phát triển

- Tạo service `render-demo` từ repository `VietDSK6/NMCNNT---Nhom5`, build context `apps/app-a`.
- Phân giải và build commit `680e789e551fa6270d2751d6a7d8d54cdce86e70`.
- Deployment đạt `succeeded`; image `mini-paas/service-render-demo:git-680e789e551f`.
- Container `mini-paas-service-render-demo` chạy trên `mini-paas-edge`, RAM giới hạn 134.217.728 byte.
- `GET /health`, `GET /version` qua hostname `render-demo.localhost` đạt; Control API báo 3/3 ứng dụng khỏe.
- Runner unit test 30/30, Control API 14/14, Dashboard typecheck/build đạt.

## Việc còn lại trước khi ghi “đã triển khai trên VPS”

1. Đẩy phiên bản mã nguồn này và cập nhật stack VPS.
2. Đặt `SERVICE_BASE_DOMAIN=ai2p.id.vn` và xác nhận owner allowlist.
3. Thêm published hostname `*.ai2p.id.vn` vào Tunnel, đứng sau route chính xác `paas.ai2p.id.vn`.
4. Tạo một repository demo tách biệt, triển khai qua Dashboard và kiểm tra HTTPS từ máy ngoài.
5. Lưu log/API/evidence có dấu thời gian; không dùng kết quả macOS thay cho nghiệm thu VPS.

## Giới hạn

Chưa có xóa service, repository riêng tư, GitHub App, webhook tự deploy, hủy build, registry digest, nhiều replica hoặc quota tổng theo host. Rollback vẫn phụ thuộc image còn tồn tại trên cùng Docker host.
