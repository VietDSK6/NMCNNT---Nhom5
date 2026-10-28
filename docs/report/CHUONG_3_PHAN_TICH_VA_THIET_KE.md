# CHƯƠNG 3. PHÂN TÍCH YÊU CẦU VÀ THIẾT KẾ HỆ THỐNG

> Bản thiết kế cuối đối soát với release candidate `v1.0.0-rc.2`, mã runtime `2ce0e1c` đã được hồi quy trên VPS ngày 17/10/2026. RC2 chuẩn hóa cấu trúc module nhưng giữ nguyên endpoint, schema SQLite v6, mạng và phạm vi chức năng của RC1; registry digest, webhook và kiến trúc nhiều máy vẫn là giới hạn/hướng phát triển.

## 3.1. Phân tích bài toán

Mini PaaS được xây dựng nhằm minh họa một quy trình quản lý vòng đời ứng dụng Web trên hạ tầng container. Thay vì chỉ chạy riêng một Web Server hoặc một container, hệ thống kết nối các bước: định tuyến truy cập, xem trạng thái, điều khiển vòng đời, cập nhật phiên bản, đọc log và quan sát tài nguyên.

Phạm vi phù hợp với bài tập lớn là một máy chạy Docker và các ứng dụng mẫu do nhóm kiểm soát. Mục tiêu không phải tạo dịch vụ đám mây thương mại mà là xây dựng một mô hình có thể cài lại, kiểm thử, đo đạc và giải thích được. Vì vậy thiết kế ưu tiên ranh giới quyền rõ ràng, ít phụ thuộc và dữ liệu kiểm chứng thật.

## 3.2. Yêu cầu hệ thống

### 3.2.1. Yêu cầu chức năng

| Mã | Yêu cầu | Trạng thái hiện tại |
|---|---|---|
| FR01 | Phục vụ nhiều ứng dụng Web qua một Gateway | Đã triển khai, kiểm thử với App A/B và Web Service động |
| FR02 | Hiển thị health, phiên bản mong muốn và phiên bản thực tế | Đã triển khai, kiểm thử |
| FR03 | Đăng nhập quản trị và duy trì phiên | Đã triển khai, kiểm thử |
| FR04 | Dừng, khởi động, khởi động lại ứng dụng | Đã triển khai, kiểm thử |
| FR05 | Cập nhật App A giữa v1.0.0 và v2.0.0 | Đã triển khai, kiểm thử |
| FR06 | Lưu lịch sử operation và audit | Đã triển khai, kiểm thử |
| FR07 | Xem log gần nhất theo giới hạn | Đã triển khai, kiểm thử |
| FR08 | Xem ảnh chụp CPU/RAM/PID/mạng | Đã triển khai, kiểm thử |
| FR09 | Triển khai ứng dụng từ repository Git tin cậy | Đã triển khai và kiểm thử commit cụ thể hoặc commit mới nhất của nhánh mặc định; hỗ trợ Web Service độc lập từ repository công khai thuộc owner allowlist; chưa có webhook, registry digest hoặc repository tùy ý |
| FR10 | Lưu chuỗi thời gian và hiển thị đồ thị | Đã triển khai và kiểm thử bằng Runner exporter, Prometheus và Grafana; chưa có Alertmanager |
| FR11 | Quản lý biến môi trường theo ứng dụng | Đã triển khai và kiểm thử; mã hóa SQLite, che secret, giữ cấu hình qua cập nhật image |
| FR12 | Lưu lịch sử release và rollback | Đã triển khai và kiểm thử trên một host; xác minh image ID cục bộ, chưa có registry digest |
| FR13 | Cấp hostname HTTPS riêng cho Web Service | Đã kiểm thử trên VPS qua Cloudflare Tunnel và wildcard `*.ai2p.id.vn` |

### 3.2.2. Yêu cầu phi chức năng

- Chỉ Gateway mở cổng ra máy phát triển; các service nội bộ dùng mạng Docker.
- Dashboard và Control API không được truy cập Docker socket.
- Runner không nhận shell command, container ID, image hay volume tùy ý từ người dùng.
- Các container có health check, giới hạn CPU/RAM/PID, filesystem gốc chỉ đọc và xoay vòng log.
- Dữ liệu đầu vào được kiểm tra schema; thao tác quản trị yêu cầu session.
- Hệ thống phải có lệnh dựng, kiểm thử và dừng rõ ràng; không dùng lệnh dọn Docker có tính phá hủy.
- Giao diện có trạng thái tải, lỗi và rỗng. Kết quả responsive chỉ là bằng chứng lịch sử của P0.2C; cấu trúc điều hướng mới chưa được kiểm tra trực quan theo quy tắc dự án.
- Kiểm thử tải phải có warm-up, mức tải cố định, ngưỡng chấp nhận, dữ liệu gốc và metric tài nguyên cùng khoảng thời gian.

## 3.3. Kiến trúc tổng thể một máy

Hệ thống được chia thành mặt phẳng truy cập, điều khiển, dữ liệu và quan sát. Cloudflare Edge kết thúc HTTPS; connector outbound-only đưa request tới Gateway loopback. Gateway phân phối Control Center, API, Grafana, App A/B và Web Service động. Control API giữ dữ liệu nghiệp vụ trong SQLite và chỉ Runner được gắn Docker socket. Runner có mạng egress riêng để tải snapshot GitHub thuộc owner allowlist. Prometheus scrape metric từ Runner và Grafana truy vấn Prometheus qua mạng nội bộ.

Sơ đồ thành phần, mạng, ranh giới quyền, luồng Git → build → image → deploy → route và luồng quan sát được chốt tại [`KIEN_TRUC_TONG_THE_CUOI.md`](../architecture/KIEN_TRUC_TONG_THE_CUOI.md). Tài liệu này là nguồn sơ đồ chính dùng cho báo cáo và slide; các sơ đồ P0/P1 còn lại chỉ mô tả tiến trình phát triển theo từng mốc.

## 3.4. Thiết kế thành phần

### 3.4.1. Nginx Gateway

Gateway là cổng HTTP duy nhất bind vào `127.0.0.1:8080` trên máy phát triển và VPS. Trên VPS, Cloudflare Tunnel chuyển tiếp tới đúng địa chỉ loopback này. Các nhóm route gồm:

- `/`: Dashboard.
- `/api/*`: Control API.
- `/apps/app-a/*`: App A.
- `/apps/app-b/*`: App B.
- `/monitoring/*`: Grafana có xác thực riêng.
- `/healthz`: health của Gateway.

Nginx dùng DNS nội bộ Docker và phân giải động để tiếp tục chuyển tiếp đúng sau khi Runner thay container trong quy trình cập nhật.

### 3.4.2. Dashboard

Dashboard dùng React, Vite và TypeScript. Giao diện trình bày riêng health HTTP, trạng thái container, phiên bản mong muốn và phiên bản quan sát được để tránh coi các khái niệm này là tương đương.

Các thao tác vòng đời và deployment trả về `202 Accepted`; Dashboard theo dõi trạng thái qua polling. Vùng triển khai Git chỉ hiển thị source allowlist, nhận commit SHA đầy đủ và đọc lịch sử/build log. Log và stats snapshot chỉ được tải khi người quản trị mở vùng quan sát hoặc bấm làm mới. Liên kết đồ thị lịch sử mở dashboard Grafana đã được cấp sẵn.

Kiến trúc thông tin của Dashboard có hai tầng. Tầng toàn hệ thống gồm tổng quan, danh sách ứng dụng, deployment, thao tác, kiểm toán và quan sát chung. Tầng ứng dụng dùng `appId` trên URL để tách tổng quan, triển khai, log, tài nguyên, biến môi trường và release. Luồng tạo Web Service nằm tại `/applications/new`, không chiếm diện tích thường trực trong danh sách ứng dụng. Nhờ đó người quản trị không nhầm dữ liệu giữa các ứng dụng, trong khi vẫn có góc nhìn tổng hợp khi cần vận hành toàn nền tảng.

Ứng dụng dùng History API của trình duyệt cho tập route nhỏ, không thêm thư viện định tuyến. Nginx có cơ chế trả `index.html` cho đường dẫn Dashboard nên người dùng có thể tải lại trực tiếp `/applications/app-a/deployments`. Cách này phù hợp quy mô hiện tại; nếu số route, phân quyền hoặc bố cục lồng nhau tăng mạnh thì cần chuyển sang thư viện router chuyên dụng.

### 3.4.3. Control API

Control API dùng Fastify và TypeScript, thực hiện:

- Xác thực, session và kiểm tra cùng nguồn cho POST.
- Kiểm tra schema body, params và query.
- Đọc/ghi metadata, operation, deployment và audit trong SQLite.
- Kiểm tra health/phiên bản qua đường truy cập Gateway.
- Đăng ký Web Service động, tạo slug/hostname và kiểm tra health trực tiếp qua Docker DNS trên mạng `edge`.
- Chuyển yêu cầu vòng đời, build/deploy source và quan sát tới Runner bằng secret nội bộ.

Control API không được gắn Docker socket và không thực hiện lệnh shell.

### 3.4.4. Deployment Runner

Runner là service đặc quyền duy nhất được gắn `/var/run/docker.sock`. Catalog trong mã nguồn ánh xạ `appId` sang service, network và image cho phép. Runner chỉ quản lý container có đủ nhãn dự án, service và nhãn quản lý.

Runner cung cấp status, start, stop, restart, update, cấu hình biến môi trường, rollback, logs, stats, metric Prometheus và deployment từ source tin cậy. App A/B dùng catalog cố định; Web Service động chỉ nhận repository công khai thuộc owner allowlist, nhánh `main`, build context tương đối và cổng 3000. Quản trị viên có thể gửi SHA 40 ký tự hoặc yêu cầu Runner phân giải HEAD của nhánh mặc định thành SHA bất biến; Dashboard không gửi tên nhánh tùy ý. Runner tải archive tối đa 16 MiB, build image qua Docker API rồi tạo container thay thế, chờ health trước khi xóa container cũ. Khi một lần thay container thất bại, Runner cố gắng phục hồi container cũ. Ngoài cơ chế phục hồi nội bộ đó, lịch sử release cho phép quản trị viên chủ động rollback về một image ID cũ còn tồn tại trên host.

### 3.4.5. Prometheus và Grafana

Runner xuất metric của các ứng dụng được quản lý tại `/metrics`; App A/B luôn là hai chuỗi lõi và Web Service động hợp lệ có thể xuất hiện thêm. Prometheus scrape mỗi 5 giây, lưu TSDB tối đa 7 ngày/256 MiB và đánh giá ba rule cho health, RAM cao và lỗi đọc stats. Grafana truy vấn Prometheus qua mạng nội bộ, nạp datasource/dashboard từ file trong Git và hiển thị sáu vùng health, CPU, RAM, PID và mạng.

Không dùng cAdvisor trong lát cắt này vì Runner đã có quyền Docker và catalog giới hạn; thêm cAdvisor sẽ phát sinh thêm mount/quyền quan sát toàn host. Đổi lại, metric phụ thuộc Runner và chưa bao phủ các service nền tảng.

### 3.4.6. Ứng dụng mẫu

App A và App B là hai Web server Node.js nhỏ, không có thư viện ngoài. Mỗi app có `/health`, `/version`, log JSON trên stdout và trang minh họa. App A có hai image v1.0.0/v2.0.0; App B dùng để đối chiếu định tuyến và vòng đời độc lập.

Web Service động không nằm sẵn trong Compose. Mỗi service có image, container, alias `service-<slug>` và hostname `<slug>.ai2p.id.vn` riêng. Sản phẩm độc lập `demo` được dùng để chứng minh luồng này không chỉ tạo bản sao của App A/B dưới một đường dẫn con.

## 3.5. Thiết kế mạng và cổng

| Thành phần | `edge` | `control` | `source-egress` | Cổng host | Docker socket |
|---|---:|---:|---:|---:|---:|
| Gateway | Có | Có | Không | `127.0.0.1:8080` | Không |
| Dashboard | Không | Có | Không | Không | Không |
| Control API | Có | Có | Không | Không | Không |
| Runner | Không | Có | Có | Không | Có |
| Prometheus | Không | Có | Không | Không | Không |
| Grafana | Không | Có | Không | Không | Không |
| App A/App B | Có | Không | Không | Không | Không |
| Web Service động | Có | Không | Không | Không | Không |

Mạng `control` được đặt nội bộ. `source-egress` chỉ phục vụ Runner tải archive của repository allowlist và không publish cổng. Việc tách mạng làm giảm kết nối trực tiếp không cần thiết, nhưng không biến Docker socket thành quyền hạn chế. Nếu Runner bị chiếm quyền, host Docker vẫn có nguy cơ cao.

## 3.6. Thiết kế dữ liệu và trạng thái

SQLite hiện lưu các nhóm dữ liệu:

- `users`: tên đăng nhập, salt và password hash `scrypt`.
- `sessions`: hash của session token và thời gian hết hạn.
- `applications`: danh mục, loại ứng dụng, repository, nhánh, build context, hostname, cổng và phiên bản mong muốn.
- `operations`: action, phiên bản đích, người yêu cầu, trạng thái và thông báo.
- `deployments`: source, commit, trạng thái, version, image, build log, người yêu cầu và các mốc thời gian.
- `application_environment_variables`: tên biến, ciphertext AES-256-GCM, cờ nhạy cảm và thời điểm cập nhật.
- `audit_events`: người thực hiện, tài nguyên, kết quả, địa chỉ nguồn và thời gian.

Operation và deployment chuyển qua `queued → running → succeeded|failed`. Partial unique index ngăn hai bản ghi cùng loại đang hoạt động trên một ứng dụng; Control API còn đối chiếu chéo operation/deployment trước khi nhận yêu cầu. Runner có khóa trong bộ nhớ để bảo vệ lớp Docker nếu request đi ngoài luồng thông thường.

Stats snapshot không được lưu vào SQLite vì dữ liệu này không phù hợp với cơ sở dữ liệu nghiệp vụ. Prometheus lưu chuỗi thời gian trong volume `prometheus-data`; Grafana lưu metadata riêng trong `grafana-data` nhưng dashboard nguồn vẫn được cấp từ file trong repository.

## 3.7. Các luồng chính

### 3.7.1. Đăng nhập

1. Dashboard gửi username/password cùng origin tới Control API.
2. API đối chiếu password bằng `scrypt`.
3. Token ngẫu nhiên được gửi bằng cookie `HttpOnly`, `SameSite=Strict`; SQLite chỉ lưu SHA-256 của token.
4. Các API quản trị kiểm tra session trước khi xử lý.

### 3.7.2. Thao tác vòng đời

1. Dashboard gửi `appId`, action và version nếu là update.
2. API kiểm tra session, origin, schema, ứng dụng và operation đang hoạt động.
3. API tạo operation `queued`, trả HTTP 202 rồi xử lý bất đồng bộ.
4. Runner kiểm tra lại allowlist và container có nhãn đúng.
5. Kết quả được lưu vào operation và audit; Dashboard đọc lại bằng polling.

### 3.7.3. Cập nhật phiên bản

1. Runner kiểm tra image đích đã được chuẩn bị và nằm trong catalog.
2. Container cũ được dừng và đổi tên tạm.
3. Container mới được tạo với network, health check, giới hạn tài nguyên và cấu hình an toàn cố định.
4. Runner chờ bản mới khỏe trước khi xóa bản cũ.
5. Nếu lỗi, bản mới bị loại bỏ và Runner cố gắng trả tên/khởi động bản cũ.

### 3.7.4. Triển khai từ commit Git

1. Dashboard đọc danh sách source allowlist hoặc dữ liệu Web Service đã đăng ký, rồi gửi yêu cầu triển khai commit mới nhất hoặc SHA đầy đủ.
2. Control API kiểm tra session, origin, schema, ứng dụng và tác vụ đang hoạt động; sau đó tạo deployment `queued`.
3. Runner kiểm tra source lần nữa, tải archive cố định, giới hạn dung lượng và giải nén vào tmpfs.
4. Docker Engine build image `git-<12 ký tự>` với label revision/source.
5. Runner thay container bằng image vừa build và chờ health.
6. Control API lưu image ID, build log, kết quả và audit; Dashboard đọc lại bằng polling.

### 3.7.5. Đọc log và tài nguyên

1. Dashboard yêu cầu tối đa 200 dòng log và một snapshot stats cho app đã chọn.
2. API kiểm tra session và danh mục ứng dụng.
3. Runner tìm container bằng nhãn, không dùng container ID từ request.
4. Log multiplex của Docker được giải mã thành stdout/stderr, giới hạn kích thước và che một số mẫu bí mật.
5. CPU được tính từ chênh lệch hai mẫu; RAM dùng working set; PID và byte mạng được tổng hợp.
6. Dashboard hiển thị kết quả cùng thời điểm lấy mẫu. Nếu người dùng đổi ứng dụng nhanh, phản hồi cũ bị bỏ.

### 3.7.6. Thu thập và hiển thị chuỗi thời gian

1. Prometheus gọi `runner:3001/metrics` mỗi 5 giây trong mạng `control`.
2. Runner tự duyệt catalog, tìm container bằng nhãn và lấy stats; request không truyền container ID.
3. Metric trạng thái vẫn được xuất khi app dừng; metric tài nguyên không được tạo giả nếu không lấy được stats.
4. Prometheus lưu mẫu, đánh giá rule và cung cấp PromQL cho Grafana.
5. Grafana dùng datasource nội bộ và dashboard provisioning; người quản trị truy cập qua `/monitoring/` sau khi xác thực.

### 3.7.7. Kiểm thử tải có đối chiếu tài nguyên

1. Container k6 tạm thời tham gia mạng `edge` và gửi tải qua DNS `gateway`, không gọi trực tiếp App A/App B.
2. Sau warm-up, công cụ chạy ba mức arrival rate cố định; mỗi request xen kẽ endpoint `/version` của hai ứng dụng.
3. k6 ghi request rate, p95, tỷ lệ lỗi, check nội dung và dropped iteration thành dữ liệu gốc nén cùng summary JSON/CSV.
4. Script ghi mốc bắt đầu/kết thúc và truy vấn Prometheus range tương ứng cho CPU, working set RAM, tỷ lệ RAM và health của hai ứng dụng.
5. Bộ tổng hợp ghép hai nguồn thành bảng so sánh; nếu một threshold thất bại hoặc thiếu metric, lệnh trả mã lỗi.

k6 không được thêm vào stack chạy thường xuyên và không có Docker socket. Cách này giữ công cụ tạo tải tách khỏi control plane, nhưng vòng Mac vẫn có nhiễu do generator và hệ thống dùng chung host.

### 3.7.8. Cấu hình biến môi trường

1. Dashboard đọc danh sách biến theo ứng dụng; Control API chỉ trả giá trị thường, secret chỉ có tên và cờ nhạy cảm.
2. Khi lưu, API kiểm tra tên, kích thước, biến lặp và danh sách biến lõi bị khóa.
3. Toàn bộ giá trị được mã hóa AES-256-GCM trước khi ghi SQLite; audit chỉ ghi số lượng biến.
4. Control API gửi danh sách đầy đủ qua mạng `control` cho Runner bằng shared secret.
5. Runner thay các biến đã quản lý trong `Config.Env`, ghi danh sách tên vào label rồi tái tạo container theo cơ chế health/rollback.
6. Nếu Runner thất bại, Control API khôi phục snapshot cấu hình SQLite trước đó. Cập nhật image về sau giữ nguyên môi trường và label này.

Thay cấu hình gây gián đoạn ngắn do một ứng dụng chỉ có một replica. Giá trị trong Docker `Config.Env` vẫn có thể bị người có quyền host/socket đọc; mã hóa SQLite và che API không tương đương secret manager production.

## 3.8. Thiết kế an toàn

Các biện pháp đã triển khai gồm:

- Gateway chỉ bind localhost ở môi trường phát triển.
- Session dùng cookie `HttpOnly`; POST kiểm tra origin.
- Mật khẩu và Runner secret chỉ lấy từ biến môi trường, không có giá trị mặc định dùng được.
- Giá trị cấu hình ứng dụng được mã hóa trong SQLite; secret không trả lại Dashboard, audit hoặc log vận hành.
- Control API và Runner đều kiểm tra đầu vào; Runner có catalog cố định.
- Không có endpoint `exec` hoặc khả năng nhận shell command.
- Docker socket không xuất hiện trong Dashboard, API, Gateway hoặc app mẫu.
- Runner và Prometheus không publish cổng; endpoint `/metrics` chỉ nằm trong mạng `control` và không nhận tham số điều khiển.
- Grafana tắt anonymous access và đăng ký tài khoản; provisioning được mount chỉ đọc.
- Log giới hạn 200 dòng, 2 MiB dữ liệu thô và 4.096 ký tự mỗi dòng.
- Container chạy non-root, filesystem chỉ đọc, drop capability, `no-new-privileges`, giới hạn CPU/RAM/PID.

Biện pháp che log chỉ là phòng vệ bổ sung. Quy tắc chính vẫn là ứng dụng không ghi token, mật khẩu hoặc khóa vào log. Môi trường VPS cần HTTPS và bật cookie `Secure` trước khi truy cập từ mạng ngoài.

## 3.9. Lý do lựa chọn công nghệ

- Docker Compose phù hợp mô hình một host, có cấu hình tái hiện và dễ giải thích hơn Kubernetes trong phạm vi một tháng.
- Nginx ổn định, nhẹ và thể hiện rõ kiến thức reverse proxy, path routing và DNS nội bộ.
- React/Vite/TypeScript phù hợp năng lực hiện có, đồng thời cho phép xây Dashboard thật thay vì trang HTML tĩnh.
- Fastify có JSON Schema, footprint nhỏ và phù hợp API Node.js.
- SQLite giảm số service ở MVP, đủ cho một quản trị viên và lịch sử quy mô nhỏ.
- Docker Engine API qua Unix socket tránh ghép command shell từ input, nhưng vẫn phải coi Runner là đặc quyền cao.
- Quan sát on-demand phục vụ chẩn đoán tức thời; Prometheus/Grafana lưu lịch sử và tách dữ liệu giám sát khỏi SQLite nghiệp vụ.
- Runner exporter được chọn thay cAdvisor để chỉ xuất metric của allowlist và không thêm một container có mount/quyền nhạy cảm.
- k6 dùng executor `constant-arrival-rate` để đặt request rate độc lập hơn với thời gian phản hồi; image được ghim version/digest và chỉ chạy theo lệnh riêng, không kéo dài CI mặc định.

## 3.10. Giới hạn thiết kế và hướng tiếp theo

Hệ thống vẫn phụ thuộc một host, một Gateway, một API, một Runner và một SQLite; do đó không có high availability. Operation/deployment bất đồng bộ chưa có message broker bền vững. Sản phẩm đã nhận một source tin cậy, build commit và triển khai image cục bộ, nhưng chưa đẩy registry hoặc triển khai theo registry digest. Metric ứng dụng đã có chuỗi thời gian nhưng log chưa được tập trung; Prometheus/Grafana cùng host nên không còn quan sát được nếu host hỏng.

Kịch bản k6 đã chạy ba vòng chuẩn 10/25/50 req/s trên VPS; cả chín tổ hợp đều đạt ngưỡng đã đặt, nhưng nguồn tạo tải vẫn dùng chung máy nên không đại diện năng lực production. Biến môi trường đã được triển khai ở mức một host, có mã hóa SQLite và che secret nhưng chưa dùng secret manager chuyên dụng. Lịch sử release và rollback đã đối chiếu image ID trước khi thay container, nhưng vẫn phụ thuộc image cache trên cùng Docker host; nếu image bị xóa hoặc chuyển máy thì metadata SQLite chưa đủ để phục hồi.

Release candidate, T08, ma trận bằng chứng và sơ đồ kiến trúc cuối đã hoàn thành. Công việc còn lại tập trung vào biên tập báo cáo 12–18 trang, slide, video và phiếu đóng góp. Registry digest, webhook hoặc chức năng mở rộng không được làm trì hoãn hồ sơ; mọi phần sau vẫn phải giữ nguyên nguyên tắc không công khai Docker socket và chỉ triển khai repository/image đã cho phép.
