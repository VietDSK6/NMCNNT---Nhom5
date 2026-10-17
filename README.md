# Mini PaaS

Mini PaaS là bài tập lớn môn Nhập môn công nghệ nền tảng. P0 đã hoàn thành và stack đã được dựng lại trên VPS Debian 12. Ngoài App A/B dùng cho kiểm thử hồi quy, sản phẩm cho phép quản trị viên đăng ký repository GitHub công khai thuộc owner tin cậy, build commit mới nhất hoặc commit cụ thể thành image riêng, chạy một container Web Service riêng và cấp URL theo slug. Workflow GitHub Actions vẫn chỉ là CI nội bộ hỗ trợ phát triển, tách biệt với chức năng deployment của sản phẩm.

## Release candidate

Ứng viên phát hành hiện tại là **`v1.0.0-rc.2`**; phiên bản máy đọc nằm trong [`VERSION`](VERSION), còn tiêu chí và kết quả hồi quy nằm tại [`docs/release/RELEASE_CANDIDATE_2.md`](docs/release/RELEASE_CANDIDATE_2.md). RC2 giữ nguyên chức năng của RC1 nhưng chuẩn hóa cấu trúc Dashboard, Control API và Runner; đây là mốc dùng để thống nhất báo cáo, slide và video với đúng một commit/tag.

Môi trường nghiệm thu được chốt ở Debian 12 `x86_64`, Docker Engine `29.9.0`, Docker Compose `5.6.0`, Node.js `24.21.0`, Nginx `1.28.3`, Prometheus `3.14.0`, Grafana `13.2.2`, k6 `2.3.0` và cloudflared `2026.10.0`. Image k6 và cloudflared được ghim bằng digest; dependency Node chính xác được khóa trong `package-lock.json`.

## Trạng thái hiện tại

Đã triển khai và kiểm thử:

- Hai ứng dụng Web mẫu có endpoint `/health` và `/version`.
- Nginx Gateway là cổng duy nhất được publish ra host, chỉ tại `127.0.0.1:8080`; VPS đưa Gateway ra Internet tại `https://paas.ai2p.id.vn` qua Cloudflare Tunnel outbound-only thay vì công khai Docker/API trực tiếp.
- Dashboard dùng React, Vite và TypeScript; thông tin được tách thành tổng quan hệ thống, danh sách ứng dụng và khu vực chi tiết của từng ứng dụng.
- Control API dùng Fastify và TypeScript; Dashboard/API không mở cổng trực tiếp ra host.
- SQLite lưu tài khoản quản trị, phiên đăng nhập, danh mục ứng dụng và audit event.
- Session dùng cookie `HttpOnly`, `SameSite=Strict`; POST từ Origin không hợp lệ bị từ chối.
- Dashboard đọc phiên bản và health HTTP thực tế của App A, App B qua Gateway.
- Deployment Runner là thành phần duy nhất gắn Docker socket; chỉ nhận repository GitHub công khai thuộc owner được cấu hình và chỉ tạo container với giới hạn cố định.
- Dashboard có thao tác dừng, khởi động, khởi động lại và cập nhật App A giữa v1.0.0/v2.0.0.
- Dashboard đọc tối đa 50/100/200 dòng log gần nhất và ảnh chụp CPU, working set RAM, PID, lưu lượng mạng của từng ứng dụng.
- Log và stats chỉ được lấy khi quản trị viên yêu cầu; lỗi của từng nguồn được hiển thị độc lập để phần còn lại của giao diện vẫn dùng được.
- SQLite lưu operation với trạng thái chờ, đang chạy, thành công hoặc thất bại; kết quả cũng được ghi audit.
- Nginx dùng DNS động của Docker nên vẫn định tuyến đúng sau khi Runner thay container.
- Health check, giới hạn CPU/RAM/PID, filesystem chỉ đọc và xoay vòng log.
- Unit/integration test kiểm tra xác thực, định tuyến, allowlist, ranh giới Docker socket và vòng đời thật.
- Script dựng App A/App B với tag `sha-<12 ký tự>`, nhãn OCI chứa commit đầy đủ và manifest chứa image ID.
- Workflow CI dùng quyền chỉ đọc, phiên bản Node cố định, action ghim bằng commit SHA; thực hiện build, regression P0 và lưu manifest làm artifact.
- Dashboard liệt kê source Git tin cậy, cho phép triển khai commit mới nhất của `main` hoặc commit SHA đầy đủ và hiển thị lịch sử deployment cùng build log.
- Runner tải archive của commit từ URL cố định, giới hạn 16 MiB, build context cố định qua Docker API và triển khai image `git-<12 ký tự>`.
- SQLite lưu source, commit, phiên bản, image reference/ID, log, người yêu cầu và các mốc thời gian của deployment.
- Kiểm thử thật đã build commit `093f1b2…`, triển khai App A qua Gateway, kiểm tra nhãn OCI và đưa ứng dụng về v1.0.0.
- Runner xuất metric của App A/App B trong allowlist; Prometheus thu thập mỗi 5 giây và giữ chuỗi thời gian tối đa 7 ngày/256 MiB.
- Grafana được cấp sẵn datasource và dashboard sáu vùng cho health, CPU, RAM, PID và lưu lượng mạng; truy cập qua Gateway và yêu cầu xác thực.
- Prometheus nạp ba quy tắc cho ứng dụng không khỏe, RAM cao và lỗi đọc Docker stats; hiện chưa có kênh gửi thông báo.
- Mỗi ứng dụng có đường dẫn riêng cho tổng quan, deployment, log và tài nguyên; các trang toàn hệ thống vẫn giữ riêng để quản trị chéo ứng dụng.
- Bộ k6 được ghim version/digest, chạy tải cố định qua Gateway và ghép kết quả p95/thông lượng/lỗi với CPU/RAM từ Prometheus.
- Mỗi ứng dụng có trang quản lý biến môi trường; giá trị được mã hóa trong SQLite, secret bị che khi đọc và Runner tái tạo container để áp dụng cấu hình.
- Mỗi lần cập nhật/deploy thành công tạo một release; quản trị viên có thể rollback về image cũ nếu image ID vẫn còn khớp trên Docker host.
- Dashboard có luồng **Tạo Web Service** riêng tại `/applications/new`, tách khỏi danh sách ứng dụng. Mỗi service động có image `mini-paas/service-<slug>`, container, log, biến môi trường, release và hostname riêng; không dùng đường dẫn con của App A/B.
- Gateway định tuyến `slug.localhost` khi phát triển và `slug.ai2p.id.vn` trên VPS tới alias Docker `service-<slug>:3000`; Control API kiểm tra health trực tiếp trong mạng edge mà không công khai tuyến kiểm tra nội bộ.
- Vòng tích hợp macOS đã tạo `render-demo`, build commit `680e789…`, xác nhận deployment thành công, giới hạn RAM 128 MiB và truy cập bằng `http://render-demo.localhost:8080`. Ngày 15/10/2026, VPS tiếp tục tạo `vps-demo`, build commit `2c8a4af…`, kiểm tra health và restart thành công. Route wildcard Cloudflare đã được xác minh qua `https://vps-demo.ai2p.id.vn`; sản phẩm độc lập `demo` từ repository riêng cũng trả health/version tại `https://demo.ai2p.id.vn` với phiên bản `git-6ffa63d8b922`.
- Stack 8 service đã chạy khỏe trên VPS Debian 12; `make smoke`, `make test` và triển khai commit mới nhất đều đạt.
- T06 đã được lặp lại ba vòng chuẩn trên VPS ở 10/25/50 req/s; cả chín tổ hợp đều đạt, lỗi 0% và không rơi iteration.
- Cloudflare Tunnel dùng connector 2026.10.0 đã ghim image digest, route `paas.ai2p.id.vn` và `*.ai2p.id.vn` tới `http://127.0.0.1:8080`; HTTPS, session, ranh giới chưa đăng nhập và hostname Web Service động đã được kiểm tra từ máy ngoài.
- T08 đã tạo online backup SQLite, kiểm checksum/integrity, restore vào volume tạm và chạy Control API phục hồi trên VPS; database nhạy cảm được giữ ngoài repository.

Giới hạn còn lại của luồng triển khai từ Git:

- Repository động chỉ hỗ trợ GitHub công khai thuộc `TRUSTED_GITHUB_OWNERS`, nhánh `main`, Dockerfile trong build context và cổng 3000; chưa có GitHub App, repository riêng tư, chọn nhánh/tag, webhook, hủy build hoặc xóa service.
- Chưa đẩy image lên registry nên mới có image ID cục bộ, chưa có registry digest/chữ ký image/SBOM.
- Chưa có Alertmanager/kênh gửi thông báo và lưu trữ log tập trung; T06 đã nghiệm thu lặp lại trên VPS nhưng nguồn phát tải vẫn chạy cùng máy với hệ thống.
- Hàng đợi operation chưa bền vững; release/rollback hiện phụ thuộc image cục bộ, chưa có registry digest để khôi phục trên host khác.
- Đây chưa phải sandbox đa thuê: chỉ quản trị viên đăng nhập được tạo service và chỉ repository của nhóm được allowlist. Không dùng để chạy mã từ người dùng Internet không tin cậy.

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

Mở `.env`, thay `ADMIN_PASSWORD=CHANGE_ME...` và `GRAFANA_ADMIN_PASSWORD=CHANGE_ME...` bằng hai mật khẩu phát triển khác nhau, mỗi mật khẩu có ít nhất 12 ký tự; thay `RUNNER_SHARED_SECRET=CHANGE_ME...` bằng chuỗi riêng có ít nhất 24 ký tự; đặt `ENVIRONMENT_ENCRYPTION_KEY` bằng chuỗi khác có ít nhất 32 ký tự. Không commit file `.env`. Nếu bỏ `GRAFANA_ADMIN_PASSWORD`, Compose dùng `ADMIN_PASSWORD` để tương thích môi trường cũ. Nếu môi trường cũ chưa có `ENVIRONMENT_ENCRYPTION_KEY`, Control API tạm dùng `RUNNER_SHARED_SECRET`; chỉ nên dùng fallback này khi phát triển.

Nếu thay `ADMIN_PASSWORD` rồi khởi động lại `control-api`, hash trong SQLite được cập nhật và các phiên Dashboard cũ bị hủy. Grafana chỉ dùng mật khẩu môi trường khi khởi tạo volume `grafana-data` lần đầu; thay biến sau đó không tự đổi mật khẩu trong volume đã tồn tại. Hãy đổi mật khẩu trong Grafana trước khi cập nhật `.env`, không xóa volume chỉ để đổi mật khẩu.

`PUBLIC_ORIGIN` phải đúng với địa chỉ người dùng mở Gateway. Giá trị phát triển mặc định là `http://127.0.0.1:8080`; khi dùng domain/HTTPS trên VPS phải thay giá trị này. `SERVICE_BASE_DOMAIN` quyết định hậu tố URL của Web Service (`localhost` khi phát triển, `ai2p.id.vn` trên VPS). `TRUSTED_GITHUB_OWNERS` là danh sách owner GitHub được phép, phân tách bằng dấu phẩy; cấu hình mẫu chứa bốn tài khoản của nhóm và không cho phép wildcard owner.

Chỉ đặt `SESSION_COOKIE_SECURE=true` sau khi Gateway được cấu hình HTTPS. Môi trường localhost hiện dùng HTTP nên giữ `false`.

Khi triển khai trên VPS với tên miền TenTen/Cloudflare, làm theo [hướng dẫn cấu hình tên miền và Tunnel](docs/deployment/HUONG_DAN_TEN_MIEN_TENTEN.md). Cấu hình hiện tại dùng Cloudflare làm DNS có thẩm quyền và Tunnel kết thúc HTTPS cho `paas.ai2p.id.vn`; không dùng bản ghi chuyển hướng hoặc mở Docker API ra Internet.

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
- Web Service động: `http://<slug>.localhost:8080/`

Địa chỉ nghiệm thu trên VPS: <https://paas.ai2p.id.vn/>. URL public chỉ hợp lệ khi connector Cloudflare trên VPS đang chạy; môi trường phát triển vẫn dùng các URL loopback phía trên.

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

- Deployment Runner unit test: 30/30 đạt.
- Control API unit test: 14/14 đạt.
- Dashboard production build: đạt.
- P0.1: 9/9 kiểm tra đạt.
- P0.2: 15/15 kiểm tra đạt.
- P0.2B: 21 kiểm tra đạt.
- P0.2C: 12 kiểm tra đạt.
- CI nội bộ/image manifest: 8/8 kiểm tra cục bộ đạt; GitHub Actions run đầu tiên đạt và tạo artifact thành công.
- P1 Git deployment: 10/10 kiểm tra tích hợp đạt.
- P1 observability: 15/15 kiểm tra tích hợp đạt.
- P1 Dashboard navigation: 11/11 đường dẫn trả entrypoint SPA qua Gateway.
- P1 Environment Variables: 21 kiểm tra tích hợp đạt; secret bị che, biến còn sau cập nhật image và trạng thái cuối được dọn sạch.
- P1 Deploy latest commit: 15 kiểm tra tích hợp đạt; SHA phân giải khớp `origin/main`, image/release lưu đúng commit và App A được đưa về v1 sau thử nghiệm.
- P2 Release History / Rollback: 17 kiểm tra tích hợp đạt; đối chiếu đúng image ID và đưa App A về v1 sau kiểm thử.
- T06 k6 vòng phát triển: ba mức 10/25/50 req/s trong 60 giây/mức đều đạt; p95 cao nhất 7,32 ms, lỗi 0%, dropped iteration bằng 0.
- T06 k6 trên VPS Debian 12: ba vòng chuẩn đều đạt; median p95 là 58,00/22,78/35,00 ms tại 10/25/50 req/s, lỗi 0% và dropped iteration bằng 0.

Bộ P0.2B thực hiện thật các luồng stop/start/restart App B và update App A v1 → v2 → v1; đồng thời kiểm tra action/version ngoài allowlist, xác thực Runner và vị trí Docker socket.

Bộ P0.2C kiểm tra xác thực cho log/stats, giới hạn tối đa 200 dòng, ứng dụng ngoài danh mục, hợp đồng CPU/RAM/PID/mạng và việc Runner từ chối endpoint quan sát khi thiếu secret. Dashboard đã được kiểm tra ở 1440×900, 768×1024 và 390×844; không tràn ngang, vùng điều khiển quan sát trên mobile cao tối thiểu 44 px.

Theo quy tắc dự án từ ngày 12/10/2026, các thay đổi tiếp theo không được kiểm tra responsive hoặc kiểm tra trực quan bằng trình duyệt nếu chủ dự án không yêu cầu riêng. Dashboard vẫn phải qua TypeScript/production build và kiểm thử chức năng liên quan. Kết quả responsive nêu trên chỉ là bằng chứng lịch sử của bản P0.2C.

Bộ P1 observability kiểm tra endpoint metric nội bộ, port binding, Prometheus readiness/target/query/rules và Grafana health/xác thực/provisioning. Bộ P1 Dashboard kiểm tra trực tiếp qua HTTP rằng 10 đường dẫn có thể được mở hoặc tải lại qua Gateway. Không dùng kiểm tra trình duyệt, ảnh giao diện hoặc responsive cho các thay đổi này.

Số liệu macOS/OrbStack chỉ là bằng chứng vòng phát triển. Bộ [minh chứng T06 trên VPS](evidence/T06/2026-10-14-vps-linux/README.md) chứa ba vòng độc lập, dữ liệu gốc và bảng tổng hợp median/dao động. Công cụ phát tải và Mini PaaS vẫn chạy cùng một VPS, endpoint thử là JSON nhỏ; không dùng kết quả để tuyên bố năng lực production hoặc SLA.

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
- Phạm vi một ứng dụng: `/applications/:appId`, `/applications/:appId/deployments`, `/applications/:appId/environment` và `/applications/:appId/observability`.

Trang tổng quan chỉ tóm tắt tình trạng chung. Từ danh sách **Ứng dụng**, người quản trị mở App A, App B hoặc Web Service đã tạo để thao tác vòng đời, triển khai và quan sát đúng ngữ cảnh. Nginx trả entrypoint React cho đường dẫn Dashboard hợp lệ nên có thể tải lại trang chi tiết trực tiếp.

Kiểm tra riêng các đường dẫn:

```bash
make test-p1-dashboard
```

## Biến môi trường ứng dụng

Mở **Ứng dụng → chọn ứng dụng → Biến môi trường**. Tên biến phải viết hoa và không được trùng; các biến lõi như `APP_VERSION`, `PORT`, `NODE_OPTIONS` bị khóa. Đánh dấu **Nhạy cảm** cho giá trị không được phép đọc lại trên Dashboard. Chọn **Lưu và tái triển khai** để Runner thay container và chờ health check.

Kiểm thử riêng luồng cấu hình:

```bash
make test-p1-environment
```

Script dùng dữ liệu giả, kiểm tra secret không xuất hiện trong API/audit, đưa App A v1 → v2 để xác nhận cấu hình được bảo toàn, sau đó xóa biến và đưa ứng dụng về v1. Việc thay cấu hình gây gián đoạn ngắn vì mô hình hiện chỉ chạy một replica.

## Lịch sử release và rollback

Sau một lần cập nhật phiên bản hoặc deployment Git thành công, Mini PaaS lưu version, image reference và image ID thành một release. Trong **Ứng dụng → chọn ứng dụng → Triển khai**, phần **Release có thể rollback** cho phép chọn một mốc cũ. Dashboard chỉ gửi mã release; Control API và Runner tự đối chiếu metadata, allowlist và image ID trước khi thay container.

Kiểm thử riêng:

```bash
make test-p2-rollback
```

Rollback không build hay tải lại image. Nếu image cục bộ đã bị xóa hoặc tag trỏ sang nội dung khác, thao tác bị từ chối. Vì chưa có registry digest, tính năng hiện chỉ bảo đảm trên cùng Docker host và gây gián đoạn ngắn khi thay một replica.

## Tạo Web Service riêng từ GitHub

1. Tạo repository GitHub công khai dưới một owner có trong `TRUSTED_GITHUB_OWNERS`.
2. Đặt `Dockerfile` tại thư mục gốc hoặc một build context con; container phải lắng nghe `PORT=3000` và nên có `GET /health`, `GET /version`.
3. Mở **Ứng dụng**, nhấn **Tạo Web Service** để sang trang tạo riêng, sau đó nhập tên, slug, repository và build context.
4. Control API yêu cầu Runner xác minh HEAD nhánh `main`, sau đó mới đăng ký service và xếp hàng deployment đầu tiên.
5. Theo dõi build log ở tab **Triển khai**; khi thành công mở URL hiển thị trên trang chi tiết.

Mỗi service được tạo với root filesystem chỉ đọc, bỏ toàn bộ Linux capability, bật `no-new-privileges`, giới hạn 0,35 CPU, RAM 128 MiB và 100 PID. Giao diện không cho truyền command, host port, volume, chế độ privileged hoặc network tùy ý. Trên VPS cần thêm wildcard hostname `*.ai2p.id.vn` vào cùng Cloudflare Tunnel; xem [hướng dẫn tên miền](docs/deployment/HUONG_DAN_TEN_MIEN_TENTEN.md).

## Triển khai App A từ Git

Trong Dashboard, mở **Ứng dụng → Ứng dụng A → Triển khai**, chọn source `Ứng dụng A từ GitHub` rồi dùng một trong hai cách:

- **Triển khai commit mới nhất:** Runner đọc HEAD của nhánh `main` đã khai báo, kiểm tra SHA 40 ký tự rồi dùng pipeline build/deploy hiện có.
- **Triển khai commit đã nhập:** nhập SHA đầy đủ 40 ký tự để triển khai đúng mốc mong muốn.

Trang **Triển khai từ Git** ở menu chính vẫn cung cấp góc nhìn toàn hệ thống. App A dùng source cố định để giữ kiểm thử hồi quy; Web Service động dùng repository/build context đã đăng ký và được Runner xác minh lại. Hệ thống không tự deploy khi push.

Kiểm thử commit mới nhất:

```bash
make test-p1-git-latest
```

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

Nghiệm thu VPS ngày 14/10/2026 đã chạy ba vòng cùng cấu hình. Xem dữ liệu, bảng kiểm thử và phân tích tại [`evidence/T06/2026-10-14-vps-linux/`](evidence/T06/2026-10-14-vps-linux/README.md). Cấu hình IP/cổng/quyền thực tế nằm trong [bảng tài nguyên VPS](docs/architecture/BANG_TAI_NGUYEN_IP_QUYEN_VPS.md).

## Dừng hệ thống

```bash
make down
```

Lệnh này dừng và xóa container cùng mạng do Compose tạo, nhưng không dùng `docker system prune`. Các volume `mini-paas-control-data`, `mini-paas-prometheus-data` và `mini-paas-grafana-data` được giữ lại.

## Sao lưu và diễn tập khôi phục T08

Tạo bản sao nhất quán của SQLite bằng online backup API, không cần dừng Control API:

```bash
BACKUP_OUTPUT_DIR=/duong-dan-bao-mat/control-$(date -u '+%Y%m%dT%H%M%SZ') make backup-control-data
```

Thư mục kết quả chứa `control.db`, `summary.json` và `checksums.sha256`. Database backup có password hash, session hash và giá trị biến môi trường đã mã hóa nên vẫn là dữ liệu nhạy cảm: giữ quyền truy cập hạn chế, không commit và không gửi kèm báo cáo. File `.env`, đặc biệt `ENVIRONMENT_ENCRYPTION_KEY`, phải được sao lưu riêng trong kho bí mật; script không chép secret vào archive.

Diễn tập khôi phục an toàn:

```bash
make test-t08
```

T08 kiểm tra checksum, restore vào volume tạm, chạy một Control API tạm không publish cổng, đăng nhập, đọc danh sách ứng dụng và truy cập App A qua Gateway. Cuối bài thử, container/volume tạm được xóa và stack live không bị thay đổi. Script restore cố ý từ chối volume live; khôi phục production cần dừng Control API và được người vận hành phê duyệt riêng. Xem [thiết kế sao lưu/khôi phục](docs/architecture/P2_BACKUP_RESTORE.md).

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
platform/control-api/       Xác thực, metadata và điều phối nghiệp vụ
  src/server.ts             Khởi tạo HTTP server và đăng ký nhóm route
  src/routes/               Route theo miền auth/app/deploy/env/release/quan sát
  src/database.ts           API dữ liệu ổn định dùng bởi tầng nghiệp vụ
  src/database/             Kiểu dữ liệu, migration và chuyển đổi bản ghi SQLite
platform/dashboard/         Dashboard React/Vite
  src/App.tsx               Ghép layout, trạng thái chung và điều hướng cấp cao
  src/app/                  Cấu hình route của Dashboard
  src/features/             Màn hình/thành phần theo chức năng nghiệp vụ
  src/shared/               Hàm định dạng và nhãn dùng chung
platform/runner/            Ranh giới đặc quyền và Docker Engine API
  src/server.mjs            API nội bộ có xác thực giữa Control API và Runner
  src/runtime.mjs           Điều phối vòng đời/build/deploy/rollback
  src/runtime-state.mjs     Chuẩn hóa trạng thái và biến môi trường container
  src/container-policy.mjs  Giới hạn CPU/RAM/PID và chính sách bảo vệ container
  src/docker.mjs            Adapter giao tiếp Docker Engine API
platform/gateway/           Ảnh và cấu hình Nginx
platform/monitoring/        Prometheus, alert rule và Grafana provisioning
tests/smoke/p0_1.sh         Kiểm thử nhanh P0.1
tests/integration/p0_2.sh   Kiểm thử tích hợp P0.2
tests/integration/p0_2b.sh  Kiểm thử vòng đời P0.2B
tests/integration/p0_2c.sh  Kiểm thử log và tài nguyên P0.2C
tests/integration/p1_git_deploy.sh  Kiểm thử Git → build → deploy
tests/integration/p1_git_latest.sh  Kiểm thử phân giải và deploy commit mới nhất
tests/integration/p1_observability.sh  Kiểm thử Prometheus/Grafana
tests/integration/p1_dashboard_navigation.sh  Kiểm thử đường dẫn Dashboard
tests/integration/p1_environment.sh  Kiểm thử biến môi trường và tái tạo container
tests/integration/p2_release_rollback.sh  Kiểm thử lịch sử release và rollback theo image ID
tests/integration/t08_backup_restore.sh  Diễn tập backup/restore trên volume tạm
tests/performance/k6/       Kịch bản tải cố định T06
tests/ci/p1_1a.sh           Kiểm thử image gắn với commit
scripts/backup/             Backup SQLite và restore an toàn vào volume tạm
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
- `/metrics` chỉ chứa số liệu ứng dụng được Mini PaaS quản lý và chỉ được scrape qua mạng `control`; Prometheus không có route Gateway hoặc cổng host.
- Grafana tắt anonymous access, có mật khẩu cấu hình riêng (fallback về mật khẩu Dashboard cho môi trường cũ) và không dùng chung cookie Dashboard.
- API log chỉ đọc container ứng dụng được Mini PaaS quản lý, tối đa 200 dòng và 2 MiB dữ liệu thô mỗi yêu cầu; mỗi dòng trả về tối đa 4.096 ký tự.
- Bộ lọc chỉ che một số mẫu bí mật phổ biến; ứng dụng vẫn không được ghi mật khẩu, token hoặc khóa vào log.
- Control API không có quyền Docker và chỉ gọi Runner qua mạng `control` nội bộ bằng secret riêng.
- Giá trị biến môi trường được mã hóa trong SQLite và secret không trả lại API, nhưng người có quyền Docker/host vẫn có thể đọc `Config.Env`; đây chưa phải secret manager cấp production.
- Rollback đối chiếu image ID nhưng vẫn phụ thuộc image cache trên một host; chưa thể thay thế registry digest hoặc bản sao lưu image.
- Gateway chỉ bind vào `127.0.0.1`; connector Cloudflare chạy outbound-only và chuyển tiếp đúng tới loopback này.
- Cookie local chưa có cờ `Secure` vì môi trường phát triển dùng HTTP; VPS đã đặt `SESSION_COOKIE_SECURE=true` và `PUBLIC_ORIGIN=https://paas.ai2p.id.vn`.
- Module `node:sqlite` của Node.js 24 vẫn phát cảnh báo thử nghiệm; đã ghim Node image và cô lập migration, kiểu dữ liệu, bộ chuyển đổi bản ghi cùng API dữ liệu để có thể thay thư viện có kiểm soát nếu cần.
- Health check không thay thế kiểm thử nghiệp vụ.
- Chính sách restart không phải failover.
- Toàn bộ hệ thống vẫn phụ thuộc một máy chạy Docker.
- Vòng k6 trên Mac dùng chung host với hệ thống nên có thể tạo nhiễu tài nguyên; chỉ được chạy trên môi trường được phép và phải lặp lại trên VPS trước khi kết luận.

Kiến trúc bản cuối dùng cho báo cáo/slide nằm tại [KIEN_TRUC_TONG_THE_CUOI.md](docs/architecture/KIEN_TRUC_TONG_THE_CUOI.md). Các tài liệu theo mốc gồm [P0.1_KIEN_TRUC.md](docs/architecture/P0.1_KIEN_TRUC.md), [P0.2_CONTROL_PLANE.md](docs/architecture/P0.2_CONTROL_PLANE.md), [P0.2B_DEPLOYMENT_RUNNER.md](docs/architecture/P0.2B_DEPLOYMENT_RUNNER.md), [P0.2C_OBSERVABILITY.md](docs/architecture/P0.2C_OBSERVABILITY.md), [P1.1A_CI.md](docs/architecture/P1.1A_CI.md), [P1_GIT_DEPLOYMENT.md](docs/architecture/P1_GIT_DEPLOYMENT.md), [P1_OBSERVABILITY.md](docs/architecture/P1_OBSERVABILITY.md), [P1_DASHBOARD_NAVIGATION.md](docs/architecture/P1_DASHBOARD_NAVIGATION.md), [P1_ENVIRONMENT_VARIABLES.md](docs/architecture/P1_ENVIRONMENT_VARIABLES.md), [P1_LOAD_TESTING.md](docs/architecture/P1_LOAD_TESTING.md), [P2_RELEASE_ROLLBACK.md](docs/architecture/P2_RELEASE_ROLLBACK.md) và [P2_BACKUP_RESTORE.md](docs/architecture/P2_BACKUP_RESTORE.md).

Yêu cầu hồ sơ mới được theo dõi tại [CHECKLIST_HO_SO_NOP.md](docs/report/CHECKLIST_HO_SO_NOP.md); mẫu kiểm thử và phiếu đóng góp nằm trong `docs/test-plan/` và `docs/report/`.
