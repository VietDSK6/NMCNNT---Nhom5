# Web Service động và hostname riêng

**Trạng thái:** Đã kiểm thử tích hợp trên macOS, nghiệm thu trên VPS Linux và xác minh URL HTTPS công khai qua route wildcard Cloudflare ngày 15/10/2026.

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

## Kết quả trên VPS Linux

- VPS được cập nhật tới commit `2c8a4af1ea2292ebdb61071de740fd875d611624`; `docker compose config` hợp lệ và `make smoke` đạt 9/9.
- Tạo `vps-demo` qua Control API từ repository `VietDSK6/NMCNNT---Nhom5`, build context `apps/app-a`.
- Deployment `74bdda8f-1ddb-415a-8379-36585fa575ae` đạt `succeeded`; image `mini-paas/service-vps-demo:git-2c8a4af1ea22` được chạy thành container riêng.
- Container chạy với 0,35 CPU, RAM 128 MiB, 100 PID, root filesystem chỉ đọc và không publish cổng host.
- Gateway trả đúng `/health` và `/version` khi nhận `Host: vps-demo.ai2p.id.vn`; Control API báo 3/3 ứng dụng khỏe.
- Thao tác restart `018eb2d7-5f05-4203-a7d6-e7b9be121a14` đạt; health và runtime trở lại `healthy/running`.
- Route wildcard `*.ai2p.id.vn` của Tunnel trỏ về Gateway loopback đã hoạt động; `https://vps-demo.ai2p.id.vn/health` và `/version` trả đúng phiên bản `git-2c8a4af1ea22`.
- Sản phẩm độc lập `demo` từ repository riêng đã được build và công khai tại `https://demo.ai2p.id.vn`; health/version trả phiên bản `git-6ffa63d8b922`.

## Việc còn lại cho bản nộp cuối

1. Chọn một Web Service độc lập làm đối tượng demo chính và giữ ổn định repository/commit trước khi quay video.
2. Ghi lại một vòng triển khai commit mới nhất hoặc commit cụ thể, kèm build log và mã phiên bản quan sát được.
3. Đưa kết quả hostname công khai vào ma trận T01–T08 và báo cáo; không cần bổ sung webhook vì đã được loại khỏi phạm vi hiện tại.

## Giới hạn

Chưa có xóa service, repository riêng tư, GitHub App, webhook tự deploy, hủy build, registry digest, nhiều replica hoặc quota tổng theo host. Rollback vẫn phụ thuộc image còn tồn tại trên cùng Docker host.
