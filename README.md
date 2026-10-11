# Mini PaaS

Mini PaaS là bài tập lớn môn Nhập môn công nghệ nền tảng. Repository hiện đang ở mốc **P0.1: nền tảng container và định tuyến**.

## Trạng thái P0.1

Đã triển khai trong mã nguồn:

- Hai ứng dụng Web mẫu độc lập.
- Endpoint `/health` và `/version` cho từng ứng dụng.
- Nginx Gateway làm cổng truy cập duy nhất.
- Mạng `edge` và mạng `control` nội bộ.
- Health check, giới hạn CPU/RAM/PID và xoay vòng log.
- Smoke test kiểm tra định tuyến, phiên bản và cổng nội bộ.

Chưa thuộc P0.1:

- Dashboard quản trị, Control API và Deployment Runner.
- Đăng nhập, SQLite và lịch sử thao tác.
- Cập nhật v1 → v2 từ giao diện.
- CI/CD, Prometheus, Grafana, k6.

## Yêu cầu môi trường

- Docker Engine hoặc Docker Desktop/OrbStack.
- Docker Compose phiên bản hỗ trợ lệnh `docker compose up --wait`.
- `curl` và `make` để chạy lệnh tiện ích.

Phát triển có thể thực hiện trên macOS. Kết quả đo chính thức cuối kỳ phải chạy trên VPS Linux và ghi riêng cấu hình môi trường.

## Khởi động

Không bắt buộc tạo `.env` vì Compose đã có giá trị mặc định. Nếu cần đổi cổng hoặc phiên bản:

```bash
cp .env.example .env
```

Kiểm tra cấu hình và khởi động:

```bash
make config
make up
```

Các địa chỉ:

- Gateway: <http://127.0.0.1:8080/>
- Ứng dụng A: <http://127.0.0.1:8080/apps/app-a/>
- Ứng dụng B: <http://127.0.0.1:8080/apps/app-b/>
- Health Gateway: <http://127.0.0.1:8080/healthz>

Nếu đổi `GATEWAY_PORT` trong `.env`, thay `8080` bằng cổng mới.

## Kiểm thử nhanh

Sau khi `make up` báo các dịch vụ đã khỏe:

```bash
make status
make smoke
```

Smoke test phải đạt 9/9 kiểm tra. Trong đó có hai kiểm tra xác nhận App A và App B không mở cổng `3000` trực tiếp ra máy chủ.

Xem 100 dòng log gần nhất:

```bash
make logs
```

## Dừng hệ thống

```bash
make down
```

Lệnh này dừng và xóa container cùng mạng do Compose tạo, nhưng không dùng `docker system prune` và không xóa dữ liệu Docker ngoài dự án.

## Thử bản v2 của Ứng dụng A

P0.1 chuẩn bị sẵn khả năng đóng ảnh theo phiên bản. Lệnh dưới đây chỉ phục vụ kiểm tra thủ công; thao tác cập nhật có kiểm soát sẽ được xây trong P0.2:

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
platform/gateway/           Ảnh và cấu hình Nginx
tests/smoke/p0_1.sh         Kiểm thử nhanh P0.1
docs/architecture/          Kiến trúc đã chốt
docs/decisions/             Nhật ký quyết định kiến trúc
docs/report/                Nội dung viết báo cáo song song
evidence/                   Minh chứng T01–T08
compose.yaml                Mô tả hệ thống P0.1
```

## An toàn và giới hạn

- Chỉ chạy các ứng dụng mẫu do nhóm kiểm soát.
- Không có container nào được gắn Docker socket trong P0.1.
- Gateway chỉ bind vào `127.0.0.1` theo cấu hình phát triển hiện tại.
- Health check không thay thế kiểm thử nghiệp vụ.
- Chính sách restart không phải failover.
- Toàn bộ hệ thống vẫn phụ thuộc một máy chạy Docker.

Đọc thiết kế chi tiết tại [docs/architecture/P0.1_KIEN_TRUC.md](docs/architecture/P0.1_KIEN_TRUC.md).
