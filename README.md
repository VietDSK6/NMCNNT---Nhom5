# Mini PaaS

Mini PaaS là bài tập lớn môn Nhập môn công nghệ nền tảng. Repository hiện ở **P0.2A: nền tảng control plane**. Mốc này kế thừa P0.1 và đã có Dashboard, Control API, đăng nhập quản trị, SQLite cùng health check HTTP thực tế.

## Trạng thái hiện tại

Đã triển khai và kiểm thử:

- Hai ứng dụng Web mẫu có endpoint `/health` và `/version`.
- Nginx Gateway là cổng duy nhất được công khai trên máy phát triển.
- Dashboard dùng React, Vite và TypeScript; giao diện thích ứng cho máy tính và điện thoại.
- Control API dùng Fastify và TypeScript; Dashboard/API không mở cổng trực tiếp ra host.
- SQLite lưu tài khoản quản trị, phiên đăng nhập, danh mục ứng dụng và audit event.
- Session dùng cookie `HttpOnly`, `SameSite=Strict`; POST từ Origin không hợp lệ bị từ chối.
- Dashboard đọc phiên bản và health HTTP thực tế của App A, App B qua Gateway.
- Health check, giới hạn CPU/RAM/PID, filesystem chỉ đọc và xoay vòng log.
- Unit/integration test kiểm tra xác thực, định tuyến và ranh giới cổng mạng.

Chưa triển khai trong P0.2A:

- Deployment Runner và quyền điều khiển Docker có danh sách cho phép.
- Start, stop, restart hoặc update từ Dashboard.
- Log container, CPU/RAM thực tế, CI/CD, Prometheus, Grafana và k6.

Vì chưa có Runner, Dashboard chỉ khẳng định **health HTTP** và phiên bản quan sát được; không đồng nhất kết quả đó với trạng thái tiến trình/container.

## Yêu cầu môi trường

- Docker Engine hoặc Docker Desktop/OrbStack.
- Docker Compose phiên bản hỗ trợ lệnh `docker compose up --wait`.
- Node.js 24 và npm nếu muốn chạy unit test/build trực tiếp ngoài Docker.
- `curl` và `make` để chạy lệnh tiện ích.

Phát triển có thể thực hiện trên macOS. Kết quả đo chính thức cuối kỳ phải chạy trên VPS Linux và ghi riêng cấu hình môi trường.

## Cấu hình lần đầu

P0.2 bắt buộc đặt mật khẩu quản trị, không có mật khẩu mặc định trong mã nguồn:

```bash
cp .env.example .env
```

Mở `.env`, thay `ADMIN_PASSWORD=CHANGE_ME...` bằng mật khẩu phát triển có ít nhất 12 ký tự. Không commit file `.env`. Nếu thay mật khẩu và khởi động lại `control-api`, hash trong SQLite được cập nhật và các phiên cũ bị hủy.

Chỉ đặt `SESSION_COOKIE_SECURE=true` sau khi Gateway được cấu hình HTTPS. Môi trường localhost hiện dùng HTTP nên giữ `false`.

## Khởi động

Kiểm tra cấu hình và khởi động:

```bash
make config
make up
```

Các địa chỉ:

- Dashboard: <http://127.0.0.1:8080/>
- Ứng dụng A: <http://127.0.0.1:8080/apps/app-a/>
- Ứng dụng B: <http://127.0.0.1:8080/apps/app-b/>
- Health Gateway: <http://127.0.0.1:8080/healthz>
- Health Control API: <http://127.0.0.1:8080/api/health>

Nếu đổi `GATEWAY_PORT` trong `.env`, thay `8080` bằng cổng mới.

Đăng nhập Dashboard bằng `ADMIN_USERNAME` và `ADMIN_PASSWORD` đã đặt trong `.env`.

## Kiểm thử nhanh

Sau khi `make up` báo các dịch vụ đã khỏe:

```bash
make status
make smoke
```

Chạy toàn bộ regression test P0.1 và integration test P0.2:

```bash
make test
```

Kết quả chuẩn hiện tại là P0.1 đạt 9/9 và P0.2 đạt 14/14. Bộ P0.2 kiểm tra 401 khi chưa đăng nhập, mật khẩu sai, login/session/logout, hai ứng dụng, audit và việc các dịch vụ nội bộ không mở cổng ra host.

Chạy unit test và build riêng khi phát triển:

```bash
cd platform/control-api && npm ci && npm test
cd ../dashboard && npm ci && npm run build
```

Xem 100 dòng log gần nhất:

```bash
make logs
```

## Dừng hệ thống

```bash
make down
```

Lệnh này dừng và xóa container cùng mạng do Compose tạo, nhưng không dùng `docker system prune`. Volume `mini-paas-control-data` được giữ lại để bảo toàn SQLite.

## Thử bản v2 của Ứng dụng A

Hệ thống đã chuẩn bị khả năng đóng ảnh theo phiên bản. Lệnh dưới đây chỉ phục vụ kiểm tra thủ công; thao tác cập nhật có kiểm soát sẽ được xây cùng Deployment Runner:

```bash
APP_A_VERSION=v2.0.0 docker compose build app-a
APP_A_VERSION=v2.0.0 docker compose up -d --wait --force-recreate app-a gateway
APP_A_VERSION=v2.0.0 ./tests/smoke/p0_1.sh
```

Để trở lại v1:

```bash
docker compose down
docker compose up --build --wait
```

## Cấu trúc chính

```text
apps/app-a/                 Ứng dụng mẫu A
apps/app-b/                 Ứng dụng mẫu B
platform/control-api/       Xác thực, SQLite, metadata và audit
platform/dashboard/         Dashboard React/Vite
platform/gateway/           Ảnh và cấu hình Nginx
tests/smoke/p0_1.sh         Kiểm thử nhanh P0.1
tests/integration/p0_2.sh   Kiểm thử tích hợp P0.2
docs/architecture/          Kiến trúc đã chốt
docs/decisions/             Nhật ký quyết định kiến trúc
docs/report/                Nội dung viết báo cáo song song
evidence/                   Minh chứng T01–T08
compose.yaml                Mô tả hệ thống P0.1
```

## An toàn và giới hạn

- Chỉ chạy các ứng dụng mẫu do nhóm kiểm soát.
- Không container nào trong P0.2A được gắn Docker socket.
- Control API không có quyền chạy lệnh Docker và chỉ ở mạng `control` nội bộ.
- Gateway chỉ bind vào `127.0.0.1` theo cấu hình phát triển hiện tại.
- Cookie local chưa có cờ `Secure` vì môi trường hiện dùng HTTP; VPS có HTTPS phải bật cờ này.
- Module `node:sqlite` của Node.js 24 vẫn phát cảnh báo thử nghiệm; đã ghim Node image và cô lập tầng truy cập dữ liệu để có thể thay thư viện nếu cần.
- Health check không thay thế kiểm thử nghiệp vụ.
- Chính sách restart không phải failover.
- Toàn bộ hệ thống vẫn phụ thuộc một máy chạy Docker.

Đọc thiết kế tại [P0.1_KIEN_TRUC.md](docs/architecture/P0.1_KIEN_TRUC.md) và [P0.2_CONTROL_PLANE.md](docs/architecture/P0.2_CONTROL_PLANE.md).
