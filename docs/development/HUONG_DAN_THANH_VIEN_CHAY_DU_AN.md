# Hướng dẫn thành viên dựng và chạy toàn bộ Mini PaaS

Tài liệu này giúp thành viên trong nhóm tự dựng, sử dụng và kiểm thử toàn bộ sản phẩm trên máy cá nhân. Đây là môi trường phát triển được phép, không phải hướng dẫn vận hành VPS production.

## 1. Thành phần sẽ được chạy

Stack Docker Compose gồm:

- Nginx Gateway: cổng HTTP duy nhất được ánh xạ ra máy phát triển.
- Dashboard: giao diện quản trị React.
- Control API: xác thực, dữ liệu ứng dụng, thao tác quản trị và audit.
- Deployment Runner: điều khiển vòng đời container trong phạm vi allowlist.
- App A và App B: hai ứng dụng mẫu lõi.
- Prometheus và Grafana: metric, đồ thị và trạng thái giám sát.

Luồng chính:

```text
Trình duyệt/curl
      |
      v
Nginx Gateway :8080
      |---------------- Dashboard
      |---------------- Control API ------ Runner ------ Docker Engine
      |---------------- App A / App B
      `---------------- Grafana ------ Prometheus
```

## 2. Yêu cầu trên máy

- Git.
- Docker Engine, Docker Desktop hoặc OrbStack đang chạy.
- Docker Compose có hỗ trợ `docker compose up --wait`.
- Node.js 24 trở lên và npm.
- `make` và `curl`.
- Tối thiểu khoảng 2 CPU, 4 GB RAM trống và đủ dung lượng để build image.

Kiểm tra nhanh:

```bash
git --version
node --version
npm --version
docker version
docker compose version
make --version
curl --version
```

Nếu `docker version` không đọc được phần `Server`, hãy mở Docker Desktop/OrbStack rồi thử lại.

## 3. Lấy mã nguồn và tạo nhánh cá nhân

Clone lần đầu:

```bash
git clone git@github.com:VietDSK6/NMCNNT---Nhom5.git
cd NMCNNT---Nhom5
```

Nếu đã có repository:

```bash
git switch main
git pull --ff-only
```

Tạo nhánh trước khi sửa. Ví dụ:

```bash
git switch -c member/ten-ngan-task
```

Không commit trực tiếp lên `main`, không dùng tên/email của thành viên khác và không sửa lịch sử commit đã push.

## 4. Tạo cấu hình phát triển

Trên máy thành viên, cách nhanh nhất là dùng cấu hình local đã chuẩn bị sẵn:

```bash
cp team.env.example .env
```

File `team.env.example` chỉ dùng cho loopback local và chứa thông tin phát triển công khai. Không dùng nguyên file này trên VPS, domain public hoặc môi trường dùng chung.

Nếu muốn mỗi máy có secret phát triển riêng, thay vào `.env`:

- `ADMIN_PASSWORD`: ít nhất 12 ký tự.
- `GRAFANA_ADMIN_PASSWORD`: ít nhất 12 ký tự và khác mật khẩu Dashboard.
- `RUNNER_SHARED_SECRET`: ít nhất 24 ký tự.
- `ENVIRONMENT_ENCRYPTION_KEY`: ít nhất 32 ký tự.

Giữ nguyên khi chạy local:

```dotenv
PUBLIC_ORIGIN=http://127.0.0.1:8080
SERVICE_BASE_DOMAIN=localhost
SESSION_COOKIE_SECURE=false
```

`TRUSTED_GITHUB_OWNERS` phải chỉ chứa các tài khoản GitHub đã được nhóm cho phép. Không dùng wildcard và không đưa repository không tin cậy vào allowlist.

Không commit, chụp ảnh hoặc gửi nội dung `.env`. `team.env.example` có thể commit vì các giá trị trong đó được xác định rõ là thông tin local công khai, không phải secret của VPS.

## 5. Dựng toàn bộ hệ thống

Kiểm tra cấu hình trước:

```bash
make config
```

Build và khởi động:

```bash
make up
```

Lần đầu có thể lâu hơn vì Docker phải tải image và cài dependency. Khi hoàn tất, kiểm tra:

```bash
make status
curl -fsS http://127.0.0.1:8080/healthz
curl -fsS http://127.0.0.1:8080/api/health
```

Các địa chỉ local:

| Thành phần | Địa chỉ |
|---|---|
| Dashboard | `http://127.0.0.1:8080/` |
| App A | `http://127.0.0.1:8080/apps/app-a/` |
| App B | `http://127.0.0.1:8080/apps/app-b/` |
| Grafana | `http://127.0.0.1:8080/monitoring/` |
| Web Service động | `http://<slug>.localhost:8080/` |

Đăng nhập Dashboard bằng `ADMIN_USERNAME` và `ADMIN_PASSWORD` trong `.env`. Grafana dùng `ADMIN_USERNAME` và `GRAFANA_ADMIN_PASSWORD`.

## 6. Chạy thử chức năng sản phẩm

### 6.1. Ứng dụng và vòng đời

1. Mở **Ứng dụng** và chọn App A hoặc App B.
2. Đọc riêng trạng thái container và trạng thái HTTP.
3. Xem log và CPU/RAM.
4. Thử **Khởi động lại**.
5. Nếu thử **Dừng**, phải khởi động lại ngay sau khi ghi nhận kết quả.
6. Với App A, có thể thử cập nhật `v1.0.0` → `v2.0.0` rồi đưa về phiên bản ban đầu.

Không chạy các thao tác thay đổi trạng thái trên VPS chung khi chưa thống nhất với chủ dự án.

### 6.2. Biến môi trường

1. Mở **Ứng dụng → App A → Biến môi trường**.
2. Thêm một biến dữ liệu giả, ví dụ `DEMO_MESSAGE`.
3. Đánh dấu nhạy cảm nếu muốn kiểm tra cơ chế che giá trị.
4. Lưu và chờ tái triển khai hoàn tất.
5. Kiểm tra secret không được trả lại dưới dạng rõ.
6. Xóa biến thử sau khi hoàn tất.

Không nhập token, mật khẩu thật hoặc dữ liệu cá nhân vào môi trường dùng chung.

### 6.3. Triển khai từ Git

Chỉ dùng repository GitHub công khai thuộc owner trong `TRUSTED_GITHUB_OWNERS` và mã nguồn do nhóm kiểm soát.

Repository Web Service tối thiểu cần:

- `Dockerfile` trong build context.
- Ứng dụng lắng nghe cổng `3000`.
- Endpoint `/health` trả HTTP 200.
- Nên có `/version` để kiểm chứng commit/phiên bản.

Trên Dashboard:

1. Mở **Ứng dụng → Tạo Web Service**.
2. Nhập tên, slug, URL repository và build context.
3. Tạo service và theo dõi deployment/build log.
4. Mở URL `http://<slug>.localhost:8080/`.
5. Kiểm tra `/health` và `/version` bằng `curl`.
6. Push phiên bản mới lên repository rồi dùng **Triển khai commit mới nhất**.
7. Có thể nhập SHA đầy đủ để thử **Triển khai commit cụ thể**.

### 6.4. Monitoring và lịch sử

- **Log và tài nguyên**: xem log, CPU, RAM, PID và lưu lượng của từng ứng dụng.
- **Đồ thị lịch sử**: mở Grafana qua mục quan sát.
- **Thao tác**: đối chiếu trạng thái chờ, thành công hoặc thất bại.
- **Kiểm toán**: kiểm tra người thực hiện, địa chỉ nguồn và kết quả.
- **Triển khai**: đọc build log, image, commit và thời gian.
- **Release**: chỉ rollback tới image còn tồn tại trên cùng Docker host.

## 7. Kiểm thử theo từng mức

Tất cả lệnh dưới đây chạy từ thư mục gốc. Các bài integration yêu cầu `make up` đã thành công.

### Mức A — kiểm tra nhanh sau mỗi thay đổi

```bash
make config
make test-unit
make smoke
```

`make test-unit` chạy test Runner, Control API và production build Dashboard. `make smoke` kiểm tra Gateway, App A, App B và ranh giới cổng.

### Mức B — hồi quy chức năng lõi

```bash
make test-integration
```

Nhóm này kiểm tra đăng nhập/API, vòng đời ứng dụng, log/tài nguyên, monitoring, đường dẫn Dashboard, biến môi trường và release/rollback.

Một số test sẽ dừng, khởi động lại hoặc cập nhật App A/App B trong thời gian ngắn. Script có bước phục hồi, nhưng chỉ chạy trên stack local hoặc môi trường thử nghiệm đã được cho phép.

Có thể chạy riêng khi sửa đúng một phần:

```bash
make test-p0-2
make test-p0-2b
make test-p0-2c
make test-p1-observability
make test-p1-dashboard
make test-p1-environment
make test-p2-rollback
```

### Mức C — CI và triển khai Git

Kiểm tra build image theo commit local:

```bash
make test-p1-1a
```

Triển khai một commit đã tồn tại trên GitHub:

```bash
git fetch origin main
make test-p1-git COMMIT_SHA="$(git rev-parse origin/main)"
```

Triển khai commit mới nhất của `origin/main`:

```bash
make test-p1-git-latest
```

Hai bài deploy Git cần Internet, repository nguồn còn truy cập được và owner nằm trong allowlist. Không dùng SHA chỉ có ở máy local; commit phải được push để Runner clone được.

### Mức D — sao lưu và khôi phục T08

```bash
make test-t08
```

Test tạo backup SQLite, kiểm tra checksum/integrity, restore vào volume tạm và xóa container/volume tạm sau khi chạy. Kết quả mới nằm trong `output/t08/` và mặc định không được Git theo dõi.

Không dùng `docker compose down -v`, `docker volume prune` hoặc `docker system prune` để “dọn nhanh”, vì có thể xóa dữ liệu cần giữ.

### Mức E — kiểm thử tải T06

Chạy vòng ngắn trước:

```bash
make test-p1-load-pilot
```

Chỉ khi pilot đạt và máy còn đủ tài nguyên mới chạy ba mức tải chuẩn:

```bash
make test-p1-load
```

Không chạy tải vào domain public/VPS chung nếu chưa được chủ dự án cho phép. Dữ liệu mới nằm trong `output/performance/`; không ghi đè evidence lịch sử đã dùng trong báo cáo.

## 8. Ma trận T01–T08 để thành viên hiểu kết quả

| Mã | Nội dung | Lệnh/chỗ kiểm tra chính |
|---|---|---|
| T01 | Dựng nền tảng từ môi trường sạch | `make config`, `make up`, `make status` |
| T02 | App A và App B qua Gateway | `make smoke` |
| T03 | App A từ v1 sang v2 | `make test-p0-2b` |
| T04 | Dừng/khởi động lại ứng dụng | `make test-p0-2b` |
| T05 | Log, CPU/RAM và monitoring | `make test-p0-2c`, `make test-p1-observability` |
| T06 | Tải 10/25/50 req/s | `make test-p1-load-pilot`, `make test-p1-load` |
| T07 | Từ chối truy cập quản trị không hợp lệ | `make test-p0-2` và các test API liên quan |
| T08 | Backup/restore SQLite | `make test-t08` |

Khi nộp evidence mới, phải ghi thời gian, commit, môi trường, lệnh, kết quả thực tế và người trực tiếp chạy. Không thay thế hoặc “làm mới” evidence lịch sử bằng dữ liệu tự tạo.

## 9. Phát triển từng thành phần

### Dashboard

Xem [`../../platform/dashboard/README.md`](../../platform/dashboard/README.md) để chạy Vite cập nhật nóng qua API proxy, typecheck, build và task FE hiện tại.

### Control API

```bash
cd platform/control-api
npm ci
npm test
```

### Runner

```bash
cd platform/runner
npm ci
npm test
```

Sau khi thay Control API, Runner hoặc Dashboard, rebuild service tương ứng rồi chạy test liên quan:

```bash
docker compose build TEN_SERVICE
docker compose up -d --no-deps --force-recreate TEN_SERVICE
```

Ví dụ `TEN_SERVICE` là `dashboard`, `control-api` hoặc `runner`. Nếu thay hợp đồng giữa nhiều service, nên dùng lại `make up` để tránh chạy lẫn image cũ và mới.

## 10. Thu log và xử lý lỗi

Xem trạng thái và 100 dòng log gần nhất:

```bash
make status
make logs
```

Xem riêng một service:

```bash
docker compose logs --tail=100 control-api
docker compose logs --tail=100 runner
docker compose logs --tail=100 gateway
```

### Lỗi Docker daemon chưa chạy

Dấu hiệu thường gặp là không kết nối được Docker socket hoặc không đọc được Docker API. Mở Docker Desktop/OrbStack, đợi Engine sẵn sàng rồi chạy lại `docker version`.

### Port 8080 đã được sử dụng

Đặt cổng khác trong `.env`, ví dụ:

```dotenv
GATEWAY_PORT=8081
PUBLIC_ORIGIN=http://127.0.0.1:8081
```

Sau đó chạy lại `make up` và dùng cổng mới khi gọi `curl`. Một số test có thể cần biến `GATEWAY_PORT=8081` hoặc `BASE_URL=http://127.0.0.1:8081`.

### Service không khỏe

```bash
docker compose ps
docker compose logs --tail=150 TEN_SERVICE
docker inspect "$(docker compose ps -q TEN_SERVICE)" --format '{{json .State.Health}}'
```

Không xóa volume trước khi đọc log và xác định nguyên nhân.

## 11. Dừng hệ thống an toàn

```bash
make down
```

Lệnh này dừng và xóa container/network Compose nhưng giữ named volume. Không thêm `-v` nếu chưa có xác nhận rằng dữ liệu được phép xóa.

## 12. Checklist trước khi tạo pull request

- [ ] Đã cập nhật từ `main` và làm trên nhánh cá nhân.
- [ ] Chỉ sửa file thuộc task được giao.
- [ ] Không có `.env`, token, mật khẩu, cookie, SSH key hoặc database trong Git.
- [ ] Đã chạy test gần nhất với phần thay đổi.
- [ ] Đã chạy `make test-unit` hoặc ít nhất test/package build tương ứng.
- [ ] Nếu đổi luồng tích hợp, đã chạy test integration liên quan trên stack local.
- [ ] `git diff` không có file build, log hoặc dữ liệu trong `output/`.
- [ ] Pull request ghi mục tiêu, file sửa, lệnh kiểm tra, kết quả và vấn đề đã xử lý.
- [ ] Evidence có thời gian và đúng tên người trực tiếp thực hiện.

Nếu mục tiêu chỉ là tìm hiểu hệ thống, thành viên có thể dừng sau Mức B. Các bài CI/Git, backup và tải nên chạy lần lượt, đọc kết quả từng bài và chỉ chạy trong môi trường được phép.
