# Mini PaaS

Mini PaaS là bài tập lớn môn Nhập môn công nghệ nền tảng. Repository hiện ở **P0.2C: quan sát log và tài nguyên theo yêu cầu**. Mốc này kế thừa P0.2B, bổ sung ảnh chụp CPU/RAM/PID/mạng cùng log container gần nhất mà không đưa quyền Docker vào Dashboard hoặc Control API.

## Trạng thái hiện tại

Đã triển khai và kiểm thử:

- Hai ứng dụng Web mẫu có endpoint `/health` và `/version`.
- Nginx Gateway là cổng duy nhất được công khai trên máy phát triển.
- Dashboard dùng React, Vite và TypeScript; giao diện thích ứng cho máy tính và điện thoại.
- Control API dùng Fastify và TypeScript; Dashboard/API không mở cổng trực tiếp ra host.
- SQLite lưu tài khoản quản trị, phiên đăng nhập, danh mục ứng dụng và audit event.
- Session dùng cookie `HttpOnly`, `SameSite=Strict`; POST từ Origin không hợp lệ bị từ chối.
- Dashboard đọc phiên bản và health HTTP thực tế của App A, App B qua Gateway.
- Deployment Runner là thành phần duy nhất gắn Docker socket; chỉ quản lý App A/App B theo danh sách cho phép.
- Dashboard có thao tác dừng, khởi động, khởi động lại và cập nhật App A giữa v1.0.0/v2.0.0.
- Dashboard đọc tối đa 50/100/200 dòng log gần nhất và ảnh chụp CPU, working set RAM, PID, lưu lượng mạng của từng ứng dụng.
- Log và stats chỉ được lấy khi quản trị viên yêu cầu; lỗi của từng nguồn được hiển thị độc lập để phần còn lại của giao diện vẫn dùng được.
- SQLite lưu operation với trạng thái chờ, đang chạy, thành công hoặc thất bại; kết quả cũng được ghi audit.
- Nginx dùng DNS động của Docker nên vẫn định tuyến đúng sau khi Runner thay container.
- Health check, giới hạn CPU/RAM/PID, filesystem chỉ đọc và xoay vòng log.
- Unit/integration test kiểm tra xác thực, định tuyến, allowlist, ranh giới Docker socket và vòng đời thật.

Chưa triển khai trong P0.2C:

- CI/CD, chuỗi thời gian Prometheus, Grafana, cảnh báo và kiểm thử tải k6.
- Hàng đợi operation bền vững, lịch sử release và rollback độc lập.
- Nhận repository/build mã người dùng; hệ thống chỉ dùng app và image tin cậy đã khai báo.

Dashboard vẫn phân biệt **health HTTP**, **trạng thái container**, **phiên bản mong muốn** và **phiên bản quan sát được**; các giá trị này không được coi là tương đương.

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

Mở `.env`, thay `ADMIN_PASSWORD=CHANGE_ME...` bằng mật khẩu phát triển có ít nhất 12 ký tự và thay `RUNNER_SHARED_SECRET=CHANGE_ME...` bằng chuỗi riêng có ít nhất 24 ký tự. Hai giá trị phải khác nhau. Không commit file `.env`. Nếu thay mật khẩu và khởi động lại `control-api`, hash trong SQLite được cập nhật và các phiên cũ bị hủy.

Chỉ đặt `SESSION_COOKIE_SECURE=true` sau khi Gateway được cấu hình HTTPS. Môi trường localhost hiện dùng HTTP nên giữ `false`.

## Khởi động

Kiểm tra cấu hình và khởi động:

```bash
make up
```

`make up` kiểm tra cấu hình, build stack, chuẩn bị trước ảnh App A v2.0.0 rồi chờ toàn bộ service đạt health check.

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

Kết quả chuẩn hiện tại:

- Deployment Runner unit test: 9/9 đạt.
- Control API unit test: 7/7 đạt.
- Dashboard production build: đạt.
- P0.1: 9/9 kiểm tra đạt.
- P0.2: 15/15 kiểm tra đạt.
- P0.2B: 21 kiểm tra đạt.
- P0.2C: 12 kiểm tra đạt.

Bộ P0.2B thực hiện thật các luồng stop/start/restart App B và update App A v1 → v2 → v1; đồng thời kiểm tra action/version ngoài allowlist, xác thực Runner và vị trí Docker socket.

Bộ P0.2C kiểm tra xác thực cho log/stats, giới hạn tối đa 200 dòng, ứng dụng ngoài danh mục, hợp đồng CPU/RAM/PID/mạng và việc Runner từ chối endpoint quan sát khi thiếu secret. Dashboard đã được kiểm tra ở 1440×900, 768×1024 và 390×844; không tràn ngang, vùng điều khiển quan sát trên mobile cao tối thiểu 44 px.

Chạy unit test và build riêng khi phát triển:

```bash
cd platform/control-api && npm ci && npm test
cd ../dashboard && npm ci && npm run build
cd ../runner && npm ci && npm test
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

Sau khi đăng nhập Dashboard, tại thẻ Ứng dụng A chọn **Cập nhật lên v2.0.0**. Theo dõi trạng thái tại mục **Lịch sử thao tác**; khi thành công, phiên bản thực tế đổi sang `v2.0.0`. Nút tại cùng vị trí cho phép đưa app về `v1.0.0`.

Có thể chạy lại toàn bộ kịch bản bằng:

```bash
make test-p0-2b
```

Bộ test luôn đưa App A trở lại v1 và bảo đảm App B đang chạy khi kết thúc thành công.

Kiểm tra riêng log và ảnh chụp tài nguyên:

```bash
make test-p0-2c
```

Sau khi đăng nhập Dashboard, mở mục **Log và tài nguyên**, chọn ứng dụng và số dòng cần đọc rồi dùng **Làm mới quan sát**. CPU/RAM hiển thị là một mẫu tại thời điểm yêu cầu, không phải đồ thị lịch sử.

## Cấu trúc chính

```text
apps/app-a/                 Ứng dụng mẫu A
apps/app-b/                 Ứng dụng mẫu B
platform/control-api/       Xác thực, SQLite, metadata và audit
platform/dashboard/         Dashboard React/Vite
platform/runner/            Ranh giới đặc quyền và Docker Engine API
platform/gateway/           Ảnh và cấu hình Nginx
tests/smoke/p0_1.sh         Kiểm thử nhanh P0.1
tests/integration/p0_2.sh   Kiểm thử tích hợp P0.2
tests/integration/p0_2b.sh  Kiểm thử vòng đời P0.2B
tests/integration/p0_2c.sh  Kiểm thử log và tài nguyên P0.2C
docs/architecture/          Kiến trúc đã chốt
docs/decisions/             Nhật ký quyết định kiến trúc
docs/report/                Nội dung viết báo cáo song song
evidence/                   Minh chứng T01–T08
compose.yaml                Mô tả toàn bộ stack một máy
```

## An toàn và giới hạn

- Chỉ chạy các ứng dụng mẫu do nhóm kiểm soát.
- Chỉ Deployment Runner được gắn Docker socket; đây vẫn là quyền rất cao trên host.
- Runner không có API chạy shell tùy ý và chỉ nhận app/action/version trong catalog cố định.
- API log chỉ đọc App A/App B, tối đa 200 dòng và 2 MiB dữ liệu thô mỗi yêu cầu; mỗi dòng trả về tối đa 4.096 ký tự.
- Bộ lọc chỉ che một số mẫu bí mật phổ biến; ứng dụng vẫn không được ghi mật khẩu, token hoặc khóa vào log.
- Control API không có quyền Docker và chỉ gọi Runner qua mạng `control` nội bộ bằng secret riêng.
- Gateway chỉ bind vào `127.0.0.1` theo cấu hình phát triển hiện tại.
- Cookie local chưa có cờ `Secure` vì môi trường hiện dùng HTTP; VPS có HTTPS phải bật cờ này.
- Module `node:sqlite` của Node.js 24 vẫn phát cảnh báo thử nghiệm; đã ghim Node image và cô lập tầng truy cập dữ liệu để có thể thay thư viện nếu cần.
- Health check không thay thế kiểm thử nghiệp vụ.
- Chính sách restart không phải failover.
- Toàn bộ hệ thống vẫn phụ thuộc một máy chạy Docker.

Đọc thiết kế tại [P0.1_KIEN_TRUC.md](docs/architecture/P0.1_KIEN_TRUC.md), [P0.2_CONTROL_PLANE.md](docs/architecture/P0.2_CONTROL_PLANE.md), [P0.2B_DEPLOYMENT_RUNNER.md](docs/architecture/P0.2B_DEPLOYMENT_RUNNER.md) và [P0.2C_OBSERVABILITY.md](docs/architecture/P0.2C_OBSERVABILITY.md).
