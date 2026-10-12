# Mini PaaS

Mini PaaS là bài tập lớn môn Nhập môn công nghệ nền tảng. P0 đã hoàn thành trên môi trường phát triển. Sản phẩm hiện có luồng tối thiểu cho phép quản trị viên chọn repository tin cậy, nhập commit SHA, build image, triển khai App A, xem lịch sử/build log và theo dõi tài nguyên theo thời gian bằng Prometheus/Grafana. Workflow GitHub Actions vẫn chỉ là CI nội bộ hỗ trợ phát triển, tách biệt với chức năng này.

## Trạng thái hiện tại

Đã triển khai và kiểm thử:

- Hai ứng dụng Web mẫu có endpoint `/health` và `/version`.
- Nginx Gateway là cổng duy nhất được công khai trên máy phát triển.
- Dashboard dùng React, Vite và TypeScript; thông tin được tách thành tổng quan hệ thống, danh sách ứng dụng và khu vực chi tiết của từng ứng dụng.
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
- Script dựng App A/App B với tag `sha-<12 ký tự>`, nhãn OCI chứa commit đầy đủ và manifest chứa image ID.
- Workflow CI dùng quyền chỉ đọc, phiên bản Node cố định, action ghim bằng commit SHA; thực hiện build, regression P0 và lưu manifest làm artifact.
- Dashboard liệt kê source Git tin cậy, nhận commit SHA đầy đủ và hiển thị lịch sử deployment cùng build log.
- Runner tải archive của commit từ URL cố định, giới hạn 16 MiB, build context cố định qua Docker API và triển khai image `git-<12 ký tự>`.
- SQLite lưu source, commit, phiên bản, image reference/ID, log, người yêu cầu và các mốc thời gian của deployment.
- Kiểm thử thật đã build commit `093f1b2…`, triển khai App A qua Gateway, kiểm tra nhãn OCI và đưa ứng dụng về v1.0.0.
- Runner xuất metric của App A/App B trong allowlist; Prometheus thu thập mỗi 5 giây và giữ chuỗi thời gian tối đa 7 ngày/256 MiB.
- Grafana được cấp sẵn datasource và dashboard sáu vùng cho health, CPU, RAM, PID và lưu lượng mạng; truy cập qua Gateway và yêu cầu xác thực.
- Prometheus nạp ba quy tắc cho ứng dụng không khỏe, RAM cao và lỗi đọc Docker stats; hiện chưa có kênh gửi thông báo.
- Mỗi ứng dụng có đường dẫn riêng cho tổng quan, deployment, log và tài nguyên; các trang toàn hệ thống vẫn giữ riêng để quản trị chéo ứng dụng.
- Bộ k6 được ghim version/digest, chạy tải cố định qua Gateway và ghép kết quả p95/thông lượng/lỗi với CPU/RAM từ Prometheus.

Giới hạn còn lại của luồng triển khai từ Git:

- Source hiện được quản trị bằng allowlist trong mã; chưa có màn hình đăng ký repository, chọn nhánh/tag, webhook hoặc hủy build.
- Chưa đẩy image lên registry nên mới có image ID cục bộ, chưa có registry digest/chữ ký image/SBOM.
- Chưa có Alertmanager/kênh gửi thông báo và lưu trữ log tập trung; kiểm thử tải đã đạt vòng phát triển trên Mac nhưng chưa nghiệm thu lặp lại trên VPS Linux.
- Hàng đợi operation bền vững, lịch sử release và rollback độc lập.
- Nhận repository/build mã người dùng; hệ thống chỉ dùng app và image tin cậy đã khai báo.

Dashboard vẫn phân biệt **health HTTP**, **trạng thái container**, **phiên bản mong muốn** và **phiên bản quan sát được**; các giá trị này không được coi là tương đương.

## Yêu cầu môi trường

- Docker Engine hoặc Docker Desktop/OrbStack.
- Docker Compose phiên bản hỗ trợ lệnh `docker compose up --wait`.
- Node.js 24 và npm nếu muốn chạy unit test/build trực tiếp ngoài Docker.
- `curl` và `make` để chạy lệnh tiện ích.
- Docker có thể tải image k6 đã ghim khi chạy kiểm thử tải lần đầu.

Phát triển có thể thực hiện trên macOS. Kết quả đo chính thức cuối kỳ phải chạy trên VPS Linux và ghi riêng cấu hình môi trường.

## Cấu hình lần đầu

P0.2 bắt buộc đặt mật khẩu quản trị, không có mật khẩu mặc định trong mã nguồn:

```bash
cp .env.example .env
```

Mở `.env`, thay `ADMIN_PASSWORD=CHANGE_ME...` và `GRAFANA_ADMIN_PASSWORD=CHANGE_ME...` bằng hai mật khẩu phát triển khác nhau, mỗi mật khẩu có ít nhất 12 ký tự; thay `RUNNER_SHARED_SECRET=CHANGE_ME...` bằng chuỗi riêng có ít nhất 24 ký tự. Không commit file `.env`. Nếu bỏ `GRAFANA_ADMIN_PASSWORD`, Compose dùng `ADMIN_PASSWORD` để tương thích môi trường cũ.

Nếu thay `ADMIN_PASSWORD` rồi khởi động lại `control-api`, hash trong SQLite được cập nhật và các phiên Dashboard cũ bị hủy. Grafana chỉ dùng mật khẩu môi trường khi khởi tạo volume `grafana-data` lần đầu; thay biến sau đó không tự đổi mật khẩu trong volume đã tồn tại. Hãy đổi mật khẩu trong Grafana trước khi cập nhật `.env`, không xóa volume chỉ để đổi mật khẩu.

`PUBLIC_ORIGIN` phải đúng với địa chỉ người dùng mở Gateway. Giá trị phát triển mặc định là `http://127.0.0.1:8080`; khi dùng domain/HTTPS trên VPS phải thay giá trị này.

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
- Grafana: <http://127.0.0.1:8080/monitoring/>

Nếu đổi `GATEWAY_PORT` trong `.env`, thay `8080` bằng cổng mới.

Đăng nhập Dashboard bằng `ADMIN_USERNAME` và `ADMIN_PASSWORD` đã đặt trong `.env`.

## Kiểm thử nhanh

Sau khi `make up` báo các dịch vụ đã khỏe:

```bash
make status
make smoke
```

Chạy toàn bộ unit/build, regression P0, observability và các đường dẫn Dashboard:

```bash
make test
```

Kết quả chuẩn hiện tại:

- Deployment Runner unit test: 16/16 đạt.
- Control API unit test: 9/9 đạt.
- Dashboard production build: đạt.
- P0.1: 9/9 kiểm tra đạt.
- P0.2: 15/15 kiểm tra đạt.
- P0.2B: 21 kiểm tra đạt.
- P0.2C: 12 kiểm tra đạt.
- CI nội bộ/image manifest: 8/8 kiểm tra cục bộ đạt; GitHub Actions run đầu tiên đạt và tạo artifact thành công.
- P1 Git deployment: 10/10 kiểm tra tích hợp đạt.
- P1 observability: 15/15 kiểm tra tích hợp đạt.
- P1 Dashboard navigation: 10/10 đường dẫn trả entrypoint SPA qua Gateway.
- T06 k6 vòng phát triển: ba mức 10/25/50 req/s trong 60 giây/mức đều đạt; p95 cao nhất 7,32 ms, lỗi 0%, dropped iteration bằng 0.

Bộ P0.2B thực hiện thật các luồng stop/start/restart App B và update App A v1 → v2 → v1; đồng thời kiểm tra action/version ngoài allowlist, xác thực Runner và vị trí Docker socket.

Bộ P0.2C kiểm tra xác thực cho log/stats, giới hạn tối đa 200 dòng, ứng dụng ngoài danh mục, hợp đồng CPU/RAM/PID/mạng và việc Runner từ chối endpoint quan sát khi thiếu secret. Dashboard đã được kiểm tra ở 1440×900, 768×1024 và 390×844; không tràn ngang, vùng điều khiển quan sát trên mobile cao tối thiểu 44 px.

Theo quy tắc dự án từ ngày 12/10/2026, các thay đổi tiếp theo không được kiểm tra responsive hoặc kiểm tra trực quan bằng trình duyệt nếu chủ dự án không yêu cầu riêng. Dashboard vẫn phải qua TypeScript/production build và kiểm thử chức năng liên quan. Kết quả responsive nêu trên chỉ là bằng chứng lịch sử của bản P0.2C.

Bộ P1 observability kiểm tra endpoint metric nội bộ, port binding, Prometheus readiness/target/query/rules và Grafana health/xác thực/provisioning. Bộ P1 Dashboard kiểm tra trực tiếp qua HTTP rằng 10 đường dẫn có thể được mở hoặc tải lại qua Gateway. Không dùng kiểm tra trình duyệt, ảnh giao diện hoặc responsive cho các thay đổi này.

Số liệu T06 nêu trên chỉ là bằng chứng vòng phát triển trên macOS/OrbStack. Công cụ phát tải và Mini PaaS cùng chạy trên một máy, endpoint thử là JSON nhỏ và mỗi mức mới đo một lần trong vòng chuẩn. Không dùng số liệu này để tuyên bố năng lực production; release cuối phải chạy lại nhiều lần trên VPS Linux.

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

## Điều hướng Dashboard

Dashboard phân biệt hai phạm vi:

- Phạm vi toàn hệ thống: `/`, `/applications`, `/deployments`, `/operations`, `/audit` và `/observability`.
- Phạm vi một ứng dụng: `/applications/:appId`, `/applications/:appId/deployments` và `/applications/:appId/observability`.

Trang tổng quan chỉ tóm tắt tình trạng chung. Từ danh sách **Ứng dụng**, người quản trị mở App A hoặc App B để thao tác vòng đời, triển khai và quan sát đúng ngữ cảnh. Nginx trả entrypoint React cho đường dẫn Dashboard hợp lệ nên có thể tải lại trang chi tiết trực tiếp.

Kiểm tra riêng các đường dẫn:

```bash
make test-p1-dashboard
```

## Triển khai App A từ commit Git

Trong Dashboard, mở **Ứng dụng → Ứng dụng A → Triển khai**, chọn source `Ứng dụng A từ GitHub`, nhập SHA đầy đủ 40 ký tự rồi chọn **Build và triển khai**. Trang **Triển khai từ Git** ở menu chính vẫn cung cấp góc nhìn toàn hệ thống. Source URL và thư mục build do Runner cố định; giao diện không nhận repository hoặc Dockerfile tùy ý.

Chạy lại toàn bộ kịch bản tự động bằng một commit đã tồn tại trên GitHub:

```bash
make test-p1-git COMMIT_SHA=$(git rev-parse HEAD)
```

Bộ test kiểm tra xác thực, định dạng commit, allowlist source, build image, phiên bản qua Gateway, nhãn OCI và đưa App A về `v1.0.0` khi hoàn tất. Máy chạy cần truy cập được GitHub; chỉ Runner tham gia mạng `source-egress`, không service nào mở thêm cổng host.

## CI nội bộ hỗ trợ phát triển

Chạy riêng quy trình dựng ảnh theo commit hiện tại và kiểm tra manifest:

```bash
make test-p1-1a
```

Đầu ra cục bộ nằm ở `output/ci/image-manifest.json` và không được commit. Manifest ghi commit đầy đủ, tag, nền tảng và image ID của App A/App B. `publishStatus` là `local-only`: image ID này chưa phải registry digest.

Workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) chạy khi push vào `main`, mở/cập nhật pull request hoặc kích hoạt thủ công. Workflow không nhận secret triển khai, không có quyền ghi package và không đẩy ảnh ra registry. [Run đầu tiên](https://github.com/VietDSK6/NMCNNT---Nhom5/actions/runs/38197344603) đã thành công với commit `4dbd6c1` và tạo artifact chứa manifest cùng thông tin môi trường. Kết quả này chỉ chứng minh quy trình kiểm tra repository Mini PaaS, không được dùng để tuyên bố FR09 “triển khai ứng dụng từ Git” đã hoàn thành.

## Giám sát chuỗi thời gian

Prometheus và Grafana được khởi động cùng `make up`. Prometheus chỉ truy cập được trong mạng `control`; Grafana đi qua Gateway tại `/monitoring/` và dùng tài khoản quản trị đã cấu hình.

Chạy riêng bộ kiểm thử:

```bash
make test-p1-observability
```

Dashboard Mini PaaS có liên kết **Mở đồ thị lịch sử** tới Grafana. Dashboard mặc định hiển thị 15 phút gần nhất và tự làm mới 5 giây. Alert rule đã được nạp nhưng chưa có Alertmanager, email hoặc webhook; trạng thái alert chỉ xem được trong Prometheus/Grafana.

## Kiểm thử tải T06

k6 chạy bằng image `grafana/k6:2.3.0` đã ghim digest, tham gia tạm thời mạng `mini-paas-edge` và gửi request tới `/apps/app-a/version` cùng `/apps/app-b/version` thông qua Gateway. Không gửi tải tới hệ thống bên ngoài.

Chạy pilot ngắn để kiểm tra công cụ:

```bash
make test-p1-load-pilot
```

Chạy profile chuẩn gồm warm-up, sau đó 10, 25 và 50 req/s trong 60 giây mỗi mức:

```bash
make test-p1-load
```

Mặc định kết quả nằm trong `output/performance/`. Để tạo evidence có tên cố định:

```bash
T06_OUTPUT_DIR=evidence/T06/<thoi-gian>-linux make test-p1-load
```

Mỗi vòng giữ summary JSON/CSV, log k6, dữ liệu sự kiện k6 nén và chuỗi CPU/RAM/health lấy từ Prometheus trong đúng khoảng thời gian. Ngưỡng vòng phát triển là p95 dưới 500 ms, lỗi dưới 1%, check trên 99% và không rơi iteration. Việc đạt ngưỡng không thay thế phân tích giới hạn môi trường.

## Dừng hệ thống

```bash
make down
```

Lệnh này dừng và xóa container cùng mạng do Compose tạo, nhưng không dùng `docker system prune`. Các volume `mini-paas-control-data`, `mini-paas-prometheus-data` và `mini-paas-grafana-data` được giữ lại.

## Thử bản v2 của Ứng dụng A

Sau khi đăng nhập Dashboard, mở **Ứng dụng → Ứng dụng A → Tổng quan** rồi chọn **Cập nhật lên v2.0.0**. Theo dõi trạng thái tại mục **Lịch sử thao tác**; khi thành công, phiên bản thực tế đổi sang `v2.0.0`. Nút tại cùng vị trí cho phép đưa app về `v1.0.0`.

Có thể chạy lại toàn bộ kịch bản bằng:

```bash
make test-p0-2b
```

Bộ test luôn đưa App A trở lại v1 và bảo đảm App B đang chạy khi kết thúc thành công.

Kiểm tra riêng log và ảnh chụp tài nguyên:

```bash
make test-p0-2c
```

Sau khi đăng nhập Dashboard, có thể mở **Log và tài nguyên** để quan sát toàn hệ thống hoặc vào tab cùng tên của từng ứng dụng. Chọn số dòng cần đọc rồi dùng **Làm mới quan sát**. CPU/RAM hiển thị là một mẫu tại thời điểm yêu cầu, không phải đồ thị lịch sử.

## Cấu trúc chính

```text
apps/app-a/                 Ứng dụng mẫu A
apps/app-b/                 Ứng dụng mẫu B
platform/control-api/       Xác thực, SQLite, metadata và audit
platform/dashboard/         Dashboard React/Vite
platform/runner/            Ranh giới đặc quyền và Docker Engine API
platform/gateway/           Ảnh và cấu hình Nginx
platform/monitoring/        Prometheus, alert rule và Grafana provisioning
tests/smoke/p0_1.sh         Kiểm thử nhanh P0.1
tests/integration/p0_2.sh   Kiểm thử tích hợp P0.2
tests/integration/p0_2b.sh  Kiểm thử vòng đời P0.2B
tests/integration/p0_2c.sh  Kiểm thử log và tài nguyên P0.2C
tests/integration/p1_git_deploy.sh  Kiểm thử Git → build → deploy
tests/integration/p1_observability.sh  Kiểm thử Prometheus/Grafana
tests/integration/p1_dashboard_navigation.sh  Kiểm thử đường dẫn Dashboard
tests/performance/k6/       Kịch bản tải cố định T06
tests/ci/p1_1a.sh           Kiểm thử image gắn với commit
scripts/ci/                 Dựng ảnh và kiểm tra image manifest
scripts/performance/        Chạy tải, lấy Prometheus và tổng hợp kết quả
.github/workflows/ci.yml    Pipeline GitHub Actions nội bộ
docs/architecture/          Kiến trúc đã chốt
docs/decisions/             Nhật ký quyết định kiến trúc
docs/report/                Nội dung viết báo cáo song song
docs/test-plan/             Mẫu bảng kiểm thử và kế hoạch nghiệm thu
evidence/                   Minh chứng T01–T08
compose.yaml                Mô tả toàn bộ stack một máy
```

## An toàn và giới hạn

- Chỉ chạy các ứng dụng mẫu do nhóm kiểm soát.
- Chỉ Deployment Runner được gắn Docker socket; đây vẫn là quyền rất cao trên host.
- Runner không có API nhận shell/URL/Dockerfile tùy ý; chỉ nhận app/action/source trong catalog và commit SHA đầy đủ.
- Runner có mạng `source-egress` để tải source GitHub đã allowlist; mạng `control` vẫn internal và Runner không publish cổng host.
- `/metrics` chỉ chứa số liệu hai app trong allowlist và chỉ được scrape qua mạng `control`; Prometheus không có route Gateway hoặc cổng host.
- Grafana tắt anonymous access, có mật khẩu cấu hình riêng (fallback về mật khẩu Dashboard cho môi trường cũ) và không dùng chung cookie Dashboard.
- API log chỉ đọc App A/App B, tối đa 200 dòng và 2 MiB dữ liệu thô mỗi yêu cầu; mỗi dòng trả về tối đa 4.096 ký tự.
- Bộ lọc chỉ che một số mẫu bí mật phổ biến; ứng dụng vẫn không được ghi mật khẩu, token hoặc khóa vào log.
- Control API không có quyền Docker và chỉ gọi Runner qua mạng `control` nội bộ bằng secret riêng.
- Gateway chỉ bind vào `127.0.0.1` theo cấu hình phát triển hiện tại.
- Cookie local chưa có cờ `Secure` vì môi trường hiện dùng HTTP; VPS có HTTPS phải bật cờ này.
- Module `node:sqlite` của Node.js 24 vẫn phát cảnh báo thử nghiệm; đã ghim Node image và cô lập tầng truy cập dữ liệu để có thể thay thư viện nếu cần.
- Health check không thay thế kiểm thử nghiệp vụ.
- Chính sách restart không phải failover.
- Toàn bộ hệ thống vẫn phụ thuộc một máy chạy Docker.
- Vòng k6 trên Mac dùng chung host với hệ thống nên có thể tạo nhiễu tài nguyên; chỉ được chạy trên môi trường được phép và phải lặp lại trên VPS trước khi kết luận.

Đọc thiết kế tại [P0.1_KIEN_TRUC.md](docs/architecture/P0.1_KIEN_TRUC.md), [P0.2_CONTROL_PLANE.md](docs/architecture/P0.2_CONTROL_PLANE.md), [P0.2B_DEPLOYMENT_RUNNER.md](docs/architecture/P0.2B_DEPLOYMENT_RUNNER.md), [P0.2C_OBSERVABILITY.md](docs/architecture/P0.2C_OBSERVABILITY.md), [P1.1A_CI.md](docs/architecture/P1.1A_CI.md), [P1_GIT_DEPLOYMENT.md](docs/architecture/P1_GIT_DEPLOYMENT.md), [P1_OBSERVABILITY.md](docs/architecture/P1_OBSERVABILITY.md), [P1_DASHBOARD_NAVIGATION.md](docs/architecture/P1_DASHBOARD_NAVIGATION.md) và [P1_LOAD_TESTING.md](docs/architecture/P1_LOAD_TESTING.md).

Yêu cầu hồ sơ mới được theo dõi tại [CHECKLIST_HO_SO_NOP.md](docs/report/CHECKLIST_HO_SO_NOP.md); mẫu kiểm thử và phiếu đóng góp nằm trong `docs/test-plan/` và `docs/report/`.
