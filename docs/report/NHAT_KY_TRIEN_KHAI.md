# Nhật ký triển khai và đầu vào cho báo cáo

## 11/10/2026 — Bắt đầu P0.1

### Trạng thái trước thay đổi

- Repository chỉ có tài liệu bối cảnh, kế hoạch và tài liệu học tập.
- Chưa có mã nguồn, Compose, cấu hình Nginx hoặc kết quả kiểm thử sản phẩm.
- Máy phát triển là macOS ARM64, chạy Docker qua OrbStack.

### Quyết định trong ngày

- P0.1 chỉ gồm hai ứng dụng mẫu, Nginx Gateway, mạng Docker, health check, giới hạn tài nguyên, kiểm thử nhanh và hướng dẫn chạy.
- Dashboard, Control API và Deployment Runner được giữ cho P0.2.
- Chỉ Gateway mở cổng trên máy phát triển; cổng ứng dụng không được công khai.
- Hai ứng dụng dùng Node.js không có thư viện ngoài để giảm phụ thuộc và tập trung vào kiến thức nền tảng.

### Nội dung có thể dùng cho báo cáo

- Chương 2: container, ảnh Docker, mạng cầu nối, DNS nội bộ, cổng mạng, Nginx và health check.
- Chương 3: phân tách lưu lượng ứng dụng với mạng điều khiển; ranh giới quyền; điểm lỗi đơn.
- Chương 4: cấu trúc Compose, quy trình build/up/smoke/down.
- Chương 5: kết quả T01/T02 sau khi chạy và lưu minh chứng.

### Quy tắc cập nhật

Chỉ chuyển nội dung từ “dự kiến” sang “đã triển khai” sau khi cấu hình được chạy và kiểm thử thành công. Số liệu trên macOS chỉ dùng cho phát triển, không trộn với kết quả đo chính thức trên VPS Linux.

### Kết quả kiểm chứng P0.1

- `docker compose config --quiet`: đạt.
- Gateway, App A và App B: đều đạt trạng thái `healthy`.
- Smoke test cấu hình App A v1: 9/9 kiểm tra đạt.
- Smoke test cấu hình App A v2: 9/9 kiểm tra đạt.
- Môi trường cuối cùng đã được đưa về App A v1.0.0.
- App A và App B không có ánh xạ cổng ra máy chủ.
- Gateway bind tại `127.0.0.1:8080`.
- Mạng `control` được xác nhận là mạng nội bộ.
- Các container chạy bằng người dùng không phải root, hệ thống tệp gốc chỉ đọc và drop toàn bộ Linux capability.

### Sự cố và cách xử lý

Trong lần chạy đầu, Gateway bị lặp khởi động vì tmpfs gắn tại `/tmp` che mất thư mục `/tmp/nginx` được tạo trong lúc build. Cấu hình Nginx được đổi sang dùng trực tiếp `/tmp/client_temp`, `/tmp/proxy_temp` và các thư mục tương tự. Sau khi rebuild, health check đạt.

Chi tiết dữ liệu thô nằm tại `evidence/T01/2026-10-11T0906/` và `evidence/T02/2026-10-11T0906/`. Đây là kết quả vòng phát triển trên macOS, chưa thay thế nghiệm thu chính thức trên VPS Linux sạch.

## 11/10/2026 — Bắt đầu P0.2A: nền tảng control plane

### Phạm vi thực hiện

- Thêm Dashboard bằng React, Vite và TypeScript.
- Thêm Control API bằng Fastify và TypeScript.
- Thêm migration SQLite ban đầu cho user, session, application và audit event.
- Thêm đăng nhập, kiểm tra session, logout, danh sách ứng dụng, audit.
- Nginx định tuyến `/` đến Dashboard và `/api/*` đến Control API.
- Giữ Docker socket ngoài Dashboard/Control API; Runner chuyển sang bước P0.2B.

### Kết quả kiểm chứng

- Control API unit test: 4/4 đạt.
- Dashboard production build: đạt.
- Docker Compose: 5/5 service healthy.
- Regression P0.1: 9/9 đạt.
- Integration P0.2: 14/14 đạt.
- Dashboard hiển thị health 2/2 và phiên bản v1.0.0 của hai app qua dữ liệu API thực.
- Kiểm tra giao diện 390×844 và 1440×900 đạt; không có console error/warning.

### Sự cố và cách xử lý

Lần kiểm tra trình duyệt đầu tiên cho thấy vùng nội dung Dashboard bị co hẹp. Nguyên nhân là Sidebar đã `position: fixed` nhưng shell vẫn dùng CSS Grid, làm phần tử Workspace bị xếp vào cột sai và cộng thêm `margin-left`. Shell được đổi về luồng block, Workspace giữ khoảng bù đúng bằng chiều rộng Sidebar. Sau khi rebuild, bố cục desktop và mobile đều đúng.

### Nội dung có thể dùng cho báo cáo

- Chương 3: control plane/data plane, mạng `edge`/`control`, ranh giới Docker socket.
- Chương 3: mô hình user/session/application/audit trong SQLite.
- Chương 4: auth flow, proxy `/api`, health/version qua Gateway và Dashboard responsive.
- Chương 5: T07 phần xác thực và port exposure; phần action allowlist chờ Runner.

### Giới hạn cần ghi đúng

- `healthy` hiện là kết quả HTTP qua Gateway, không phải trạng thái Docker.
- `node:sqlite` trên Node.js 24 vẫn phát cảnh báo thử nghiệm.
- Chưa có start/stop/restart/update, log container hoặc CPU/RAM.
- Cookie local chưa bật `Secure` vì chưa có HTTPS; VPS phải bật sau khi cấu hình TLS.

## 11/10/2026 — Hoàn thành P0.2B: Deployment Runner

### Phạm vi thực hiện

- Thêm Deployment Runner nội bộ, là container duy nhất được gắn Docker socket.
- Thêm allowlist cho app, action và version; không có chức năng chạy lệnh shell tùy ý.
- Thêm migration SQLite số 2 và bảng `operations`, cùng khóa một operation hoạt động trên mỗi app.
- Thêm API bất đồng bộ để start, stop, restart, update; lưu kết quả vào operation và audit.
- Dashboard hiển thị riêng health HTTP/trạng thái container, có nút vòng đời và lịch sử operation.
- Chuẩn bị ảnh App A v1/v2; update thay container và phục hồi container cũ nếu bản mới không khỏe.
- Nginx dùng DNS động Docker để theo địa chỉ container sau khi thay thế.

### Kết quả kiểm chứng

- Deployment Runner unit test: 5/5 đạt.
- Control API unit test: 6/6 đạt.
- Dashboard production build: đạt.
- Regression P0.1: 9/9 đạt.
- Integration P0.2: 15/15 đạt.
- Integration P0.2B: 21 kiểm tra đạt.
- Đã thực hiện thật: dừng/khởi động/khởi động lại App B, update App A v1 → v2 → v1.
- Đã xác nhận Runner từ chối request thiếu secret, action `exec` và version `latest`.
- Đã xác nhận Docker socket chỉ được mount vào Runner; Runner không có port host.
- Trạng thái cuối: 6/6 service healthy; App A và App B ở v1.0.0.
- Giao diện desktop hiển thị đúng dữ liệu và control thật; các nút vận hành có thể focus bằng phím Tab. Theo quy tắc tạm thời của mốc này, không thực hiện kiểm tra responsive.

### Sự cố và cách xử lý

Lần chạy đầu cho thấy Gateway trả 502 sau khi Control API được recreate. Nguyên nhân là Nginx giữ IP upstream đã phân giải khi khởi động, trong khi container mới nhận IP khác. Cấu hình được đổi sang Docker DNS `127.0.0.11`, khai báo `resolve` cho từng upstream và thêm shared zone.

Khi App B bị dừng, request có thể chờ lâu trước khi Gateway báo lỗi. Gateway được bổ sung giới hạn `proxy_connect_timeout`, `proxy_send_timeout` và `proxy_read_timeout`. Tùy thời điểm DNS/kết nối, kết quả hợp lệ là 502 hoặc 504; cả hai đều chứng minh data plane không còn phục vụ app đã dừng.

### Nội dung có thể dùng cho báo cáo

- Chương 3: nguyên tắc đặc quyền tối thiểu, ranh giới Runner và nguy cơ Docker socket.
- Chương 3: operation state machine, khóa theo ứng dụng và luồng control plane.
- Chương 4: Docker Engine API qua Unix socket, replace container và Docker DNS động.
- Chương 5: T03 cập nhật phiên bản, T04 dừng/khôi phục, T07 auth/allowlist/socket boundary.

### Giới hạn cần ghi đúng

- Runner có Docker socket nên vẫn là thành phần quyền rất cao, không phải sandbox an toàn để nhận mã không tin cậy.
- Update chỉ dùng image chuẩn bị trước trong catalog; chưa build từ Git repository.
- Cơ chế phục hồi trong một lần update lỗi chưa phải rollback lịch sử release đầy đủ.
- Operation không có message broker bền vững; Control API dừng đột ngột có thể cần đối soát thủ công.
- Kết quả hiện tại chạy trên macOS 27.0 ARM64, OrbStack/Docker Engine 29.4.0; cần nghiệm thu lại trên VPS Linux.

## 12/10/2026 — Hoàn thành P0.2C: log và ảnh chụp tài nguyên

### Phạm vi thực hiện

- Thêm endpoint log và stats tại Runner; chỉ nhận `appId` trong catalog.
- Thêm API có session cho Dashboard, giới hạn log từ 1 đến 200 dòng.
- Giải mã log multiplex stdout/stderr, loại mã ANSI, che một số mẫu bí mật thường gặp.
- Giới hạn 2 MiB log thô mỗi yêu cầu và 4.096 ký tự mỗi dòng.
- Tính CPU, working set RAM, tỷ lệ RAM, PID và lưu lượng mạng từ Docker stats một lần.
- Thêm vùng quan sát trên Dashboard, tải log/stats song song, lỗi độc lập và bảo vệ phản hồi cũ.
- Kiểm tra responsive trở lại sau khi ngoại lệ P0.2B hết hiệu lực.
- Viết tài liệu kiến trúc, ADR, bằng chứng T05 và bản nháp Chương 3.

### Kết quả kiểm chứng

- Deployment Runner unit test: 9/9 đạt.
- Control API unit test: 7/7 đạt.
- Dashboard production build: đạt.
- Integration P0.2C: 12/12 đạt.
- Dashboard không tràn ngang tại 1440×900, 768×1024 và 390×844.
- Ở 390 px, điều khiển quan sát vẫn hiện đầy đủ, thẻ tài nguyên xếp một cột và vùng bấm chính tối thiểu 44 px.
- Vùng log mobile có `white-space: pre-wrap`, không tạo tràn ngang và có vùng cuộn dọc riêng.
- Sau kiểm thử, 6/6 service ở trạng thái healthy; App A/App B ở v1.0.0.

### Mẫu dữ liệu phát triển

App A tại `2026-10-12T02:16:52.047073681Z`:

- CPU: 2,41%.
- Working set RAM: 19.058.688 byte trên giới hạn 134.217.728 byte, tương ứng 14,2%.
- PID: 8.
- Network RX/TX: 36.230/34.805 byte kể từ lúc container chạy.

Mẫu trên chỉ chứng minh đường thu thập hoạt động trên macOS/OrbStack. Đây không phải kết quả tải và không dùng làm số liệu hiệu năng chính thức.

### Sự cố và cách xử lý

Khi bắt đầu kiểm thử, OrbStack chưa chạy nên Docker socket không tồn tại. Runtime được khởi động lại rồi stack mới được build. Kiểm tra mobile lần đầu cho thấy một số điều khiển quan sát cao 38 px; CSS được sửa để các nút/select chính đạt tối thiểu 44 px ở breakpoint mobile, sau đó đo lại đạt.

### Giới hạn cần ghi đúng

- Snapshot không phải chuỗi thời gian hoặc hệ thống cảnh báo.
- Bộ lọc bí mật trong log không thể phát hiện mọi định dạng dữ liệu nhạy cảm.
- Log Docker chỉ tồn tại theo chính sách xoay vòng trên host; chưa có lưu trữ tập trung.
- Cần chạy lại T05 và kiểm thử tải chính thức trên VPS Linux.

## 12/10/2026 — Bổ sung CI nội bộ và ảnh mẫu theo commit

### Phạm vi thực hiện

- Thêm GitHub Actions chạy khi push `main`, pull request hoặc kích hoạt thủ công.
- Ghim Node.js bằng `.node-version`, cài phụ thuộc bằng ba lockfile hiện có.
- Ghim `checkout`, `setup-node` và `upload-artifact` bằng commit SHA đầy đủ.
- Chạy kiểm tra Compose, unit test, production build và toàn bộ regression P0 trong workflow.
- Dựng App A/App B với tag `sha-<12 ký tự commit>`, nhãn OCI chứa commit đầy đủ.
- Sinh và kiểm tra `image-manifest.json`; chưa push registry hoặc triển khai vào VPS.
- Ghi quy tắc mới của dự án: không chạy responsive/trình duyệt nếu không có yêu cầu riêng; vẫn build Dashboard và kiểm thử chức năng.

### Kết quả kiểm chứng cục bộ

- Cú pháp shell/JavaScript/YAML: đạt.
- Deployment Runner unit test: 9/9 đạt.
- Control API unit test: 7/7 đạt.
- Dashboard production build: đạt; không chạy kiểm tra trình duyệt theo quy tắc dự án.
- P0.1: 9/9 đạt; P0.2: 15/15 đạt; P0.2B: 21 đạt; P0.2C: 12 đạt.
- Kiểm tra image manifest của CI nội bộ: 8/8 đạt.
- Hai ảnh local có tag theo commit, image ID riêng và nhãn revision/version đúng.
- Sau regression, 6/6 service healthy; App A/App B trở lại v1.0.0.
- GitHub Actions run số 1 cho commit `4dbd6c1`: toàn bộ job và 14 bước đạt, gồm regression, manifest, tải artifact và dọn stack.
- Artifact `mini-paas-ci-4dbd6c161333b7ef6a5ebc2c3ce2010bedb126fb` được GitHub lưu 14 ngày.

### Giới hạn cần ghi đúng

- `imageId` local không phải registry digest và khác nhau theo kiến trúc CPU.
- Chưa có quyền ghi package, registry, deploy hook hoặc kết nối từ CI đến VPS.
- CI nội bộ chưa phải tính năng triển khai ứng dụng từ Git của Mini PaaS. Sản phẩm còn thiếu API/giao diện đăng ký repository tin cậy, chọn commit, theo dõi build log, lưu registry digest và triển khai image nằm trong allowlist.

### Nội dung có thể dùng cho báo cáo

- Chương 3: tách CI khỏi CD, ranh giới quyền và truy vết commit → tag → image ID.
- Chương 4: workflow, cách dựng ảnh và cách đọc manifest.
- Chương 5: kết quả regression, kiểm tra input SHA và nhãn OCI; bổ sung log GitHub sau khi có remote.

## 12/10/2026 — Cập nhật yêu cầu hồ sơ nộp chính thức

### Yêu cầu mới

- Báo cáo 12–18 trang nội dung chính; phụ lục cấu hình không tính vào giới hạn.
- Có sơ đồ hệ thống, bảng tài nguyên/IP/quyền, mã nguồn/cấu hình/script và README tái lập.
- Bảng kiểm thử phải có đầu vào, thao tác, kỳ vọng, thực tế, đạt/chưa đạt và bằng chứng có dấu thời gian; đánh giá hiệu năng phải nộp dữ liệu gốc.
- Video demo 5–7 phút.
- Đủ phiếu đóng góp cho 04 thành viên; mỗi người có sản phẩm kỹ thuật riêng.
- Khai báo nguồn mã/cấu hình tham khảo và cách sử dụng AI; sinh viên chịu trách nhiệm giải thích, chỉnh sửa và chạy lại.

### Điều chỉnh cách mô tả sản phẩm

- Phân loại workflow GitHub hiện có là **CI nội bộ hỗ trợ phát triển**, không tính thay cho FR09.
- FR09 chỉ đạt khi quản trị viên có thể dùng Mini PaaS để đưa một repository tin cậy qua chuỗi commit → build → image/digest → deployment và quan sát trạng thái/log của lần triển khai.

### Điều chỉnh kế hoạch

- Mục tiêu báo cáo được đặt ở 14–16 trang để có biên độ trong giới hạn 12–18 trang.
- Tạo checklist hồ sơ, mẫu bảng kiểm thử, mẫu phiếu đóng góp và nhật ký AI/nguồn tham khảo.
- Tạo bảng tài nguyên/IP/quyền từ Compose hiện tại; VPS sẽ có bản đối soát riêng.
- Phân công 04 người phải tạo ra bốn đầu ra kỹ thuật riêng. Nhiệm vụ chỉ tìm tài liệu không còn đủ điều kiện.
- Video được rút gọn thành kịch bản khoảng 6 phút; kiểm tra responsive/trình duyệt vẫn không chạy nếu chủ dự án không yêu cầu riêng.

## 12/10/2026 — P1: triển khai App A từ commit Git tin cậy

### Phạm vi thực hiện

- Thêm source catalog cố định tại Runner cho repository GitHub của nhóm và build context `apps/app-a`.
- Dashboard cho phép chọn source, nhập commit SHA đầy đủ và xem lịch sử/build log.
- Control API tạo deployment bất đồng bộ; SQLite migration 003 lưu commit, image, log, người yêu cầu và thời gian.
- Runner tải archive theo commit, giới hạn 16 MiB, giải nén trong tmpfs 128 MiB, build qua Docker Engine API và thay container bằng cơ chế có phục hồi.
- Thêm mạng `source-egress` chỉ cho Runner; mạng `control` vẫn internal và không service nào mở thêm cổng host.
- Không nhận URL repository, Dockerfile, image, volume hoặc shell command từ Dashboard.

### Kết quả thực tế

- Runner unit test: 11/11 đạt.
- Control API unit test: 9/9 đạt.
- Dashboard production build: đạt; không chạy kiểm tra trình duyệt/responsive theo quy tắc dự án.
- P1 Git deployment integration: 10/10 đạt với commit `093f1b29341accae2520ba5854db1a5a992b959f`.
- Archive tải thực tế: 636.145 byte.
- Image: `mini-paas/app-a:git-093f1b29341a`.
- Image ID: `sha256:d383955358670002976ec69c45d3ede503790abc4ab884aa4becd2e6baa88c60`.
- Deployment bắt đầu `2026-10-12T05:01:18.361Z`, kết thúc `2026-10-12T05:01:31.653Z`.
- Toàn bộ regression P0 tiếp tục đạt: P0.1 9/9, P0.2 15/15, P0.2B 21, P0.2C 12.
- App A được đưa về `v1.0.0` sau kiểm thử.

### Giới hạn cần ghi đúng

- Mới hỗ trợ một repository công khai/App A trong allowlist; đây không phải sandbox cho mã nguồn bên ngoài.
- Image chỉ nằm trên Docker Engine cục bộ; `imageId` không phải registry digest.
- Chưa có webhook, nhánh/tag, hủy build, streaming log hoặc deploy không gián đoạn.
- Runner vừa có egress vừa giữ Docker socket nên vẫn là ranh giới đặc quyền lớn nhất.

### Bằng chứng

- `evidence/P1-GIT/2026-10-12T1201/`.
- `docs/architecture/P1_GIT_DEPLOYMENT.md`.
- `docs/decisions/0006-trusted-git-source-deployment.md`.

## 12/10/2026 — P1: giám sát chuỗi thời gian Prometheus/Grafana

### Phạm vi thực hiện

- Bổ sung exporter Prometheus tại Runner, tự duyệt App A/App B trong catalog và không nhận container ID từ request.
- Xuất trạng thái chạy/health, CPU, working set RAM, giới hạn/tỷ lệ RAM, PID và bộ đếm mạng.
- Thêm Prometheus 3.14.0 với scrape 5 giây, retention 7 ngày/256 MiB và ba alert rule.
- Thêm Grafana 13.2.2, datasource và dashboard sáu panel được provisioning từ Git.
- Route Grafana qua Gateway tại `/monitoring/`; tắt anonymous access; không publish cổng Runner/Prometheus/Grafana.
- Ghim version và manifest digest của hai image giám sát.
- Không thêm cAdvisor vì Runner đã có Docker API và allowlist; tránh thêm container có mount/quyền rộng trên host.

### Kết quả thực tế

- Runner unit test: 16/16 đạt.
- Control API unit test: 9/9 đạt.
- Dashboard production build: đạt; không chạy trình duyệt/responsive theo quy tắc dự án.
- P1 observability integration: 15/15 đạt.
- Toàn bộ regression: P0.1 9/9, P0.2 15/15, P0.2B 21, P0.2C 12 và P1 observability 15 đều đạt.
- Luồng P1 Git deployment chạy lại: 10/10 đạt; App A trở lại v1.0.0.
- Tám service ở trạng thái healthy; chỉ Gateway bind `127.0.0.1:8080`.
- Prometheus thu được hai chuỗi App A/App B; Grafana có datasource nội bộ và dashboard sáu panel.

### Sự cố và cách xử lý

Grafana 13.2.2 không khởi động ổn định với giới hạn 100 PID. Health check ghi nhận container bị từ chối tạo tiến trình/namespace trong giai đoạn khởi tạo. Giới hạn được nâng lên 300 PID và RAM 384 MiB; sau khi tạo lại container, health check và toàn bộ test đạt. Đây là ví dụ cho thấy giới hạn tài nguyên phải được đo và điều chỉnh theo đặc tính tiến trình, không đặt tùy ý chỉ để cấu hình trông chặt.

### Giới hạn cần ghi đúng

- Alert rule đã được nạp nhưng chưa có Alertmanager/email/webhook.
- Chưa có log tập trung; log vẫn đọc từ Docker với giới hạn P0.2C.
- Metric mới bao phủ hai app allowlist, chưa bao phủ host và các service nền tảng.
- Dữ liệu macOS/OrbStack chứng minh đường thu thập, chưa phải số liệu hiệu năng chính thức.
- Bước tiếp theo là k6, dữ liệu đo gốc và chạy lại trên VPS Linux.

### Bằng chứng

- `evidence/P1-OBS/2026-10-12T1659/`.
- `docs/architecture/P1_OBSERVABILITY.md`.
- `docs/decisions/0007-runner-prometheus-exporter.md`.

## 12/10/2026 — P1: tách Dashboard theo hệ thống và từng ứng dụng

### Vấn đề trước thay đổi

- Dashboard dùng một trang dài và các liên kết `#...`; menu luôn làm nổi mục Tổng quan.
- Thông tin App A và App B xuất hiện cạnh nhau trong cùng vùng nên chưa phản ánh mô hình quản lý nhiều dịch vụ giống một PaaS.
- Chưa có URL riêng để mở lại màn deployment hoặc quan sát của một ứng dụng.

### Phạm vi thực hiện

- Thêm định tuyến phía trình duyệt bằng History API, không thêm phụ thuộc mới.
- Tách các trang toàn hệ thống: tổng quan, danh sách ứng dụng, deployment, thao tác, kiểm toán và quan sát.
- Tạo màn chi tiết cho từng `appId` với ba tab: tổng quan, triển khai, log và tài nguyên.
- Lọc deployment và operation theo ứng dụng tại màn chi tiết; giữ màn tổng hợp cho vận hành toàn hệ thống.
- Bổ sung empty state khi ứng dụng không có source Git và trang báo lỗi khi route/app không tồn tại.
- Thêm integration test gọi trực tiếp 10 URL qua Gateway để kiểm tra cơ chế SPA fallback.

### Kết quả thực tế

- Dashboard typecheck: đạt.
- Dashboard production build: đạt; bundle JavaScript khoảng 264,35 kB và CSS khoảng 38,45 kB trước nén.
- Toàn bộ `make test` đạt: Runner 16/16, Control API 9/9, P0.1 9/9, P0.2 15/15, P0.2B 21/21, P0.2C 12/12, P1 observability 15/15 và Dashboard navigation 10/10.
- P1 Dashboard navigation: 10/10 đường dẫn đạt HTTP 200 và trả entrypoint React.
- Tám service ở trạng thái `healthy`; App A được đưa về v1.0.0 và App B tiếp tục chạy sau kiểm thử.
- Không chạy trình duyệt, chụp ảnh hoặc responsive theo quy tắc dự án. Vì vậy không tuyên bố phiên bản Dashboard mới đã được kiểm tra trực quan/responsive.

### Giới hạn cần ghi đúng

- Router tự viết phù hợp tập route nhỏ hiện tại; chưa hỗ trợ route lồng/phân quyền phức tạp như router chuyên dụng.
- API deployment và operation vẫn trả tập gần nhất rồi Dashboard lọc theo `appId`; nếu số lượng ứng dụng tăng cần bổ sung lọc/phân trang phía máy chủ.
- Chưa có màn biến môi trường, rollback hoặc đăng ký repository mới.

### Bằng chứng

- `evidence/P1-DASH/2026-10-12T2134/`.
- `docs/architecture/P1_DASHBOARD_NAVIGATION.md`.
- `tests/integration/p1_dashboard_navigation.sh`.

## 12/10/2026 — P1: kiểm thử tải k6 và đối chiếu Prometheus

### Phạm vi thực hiện

- Thêm kịch bản k6 xen kẽ App A/App B qua Gateway bằng executor `constant-arrival-rate`.
- Ghim k6 2.3.0 bằng manifest digest; không yêu cầu cài k6 trực tiếp trên Mac/VPS.
- Thêm profile pilot và standard, warm-up riêng, khoảng nghỉ giữa các mức và threshold tự động.
- Lưu summary JSON, CSV, log và dữ liệu k6 gốc nén.
- Ghi mốc thời gian từng mức rồi truy vấn Prometheus range cho CPU, RAM và health của hai app.
- Bộ tổng hợp trả lỗi nếu k6 threshold thất bại, thiếu dữ liệu quan sát hoặc có mẫu health không khỏe.

### Kết quả thực tế

- Pilot 5/15/30 req/s trong 20 giây/mức: cả ba mức đạt, dùng để kiểm tra pipeline.
- Vòng chuẩn warm-up 5 req/s trong 10 giây, sau đó 10/25/50 req/s trong 60 giây/mức.
- Tổng ba mức chuẩn: 5.103 request.
- Thông lượng thực tế: 10,02; 25,02; 50,01 req/s.
- p95: 6,19; 5,51; 7,32 ms; cao nhất 7,32 ms.
- Tỷ lệ lỗi 0%, check nội dung 100%, dropped iteration bằng 0.
- CPU tối đa App A/App B ở mức high: 1,99%/1,96%; working set RAM tối đa 55,80/37,27 MiB.
- Mọi mẫu health của hai app trong ba khoảng đo đều bằng 1.

### Phân tích và giới hạn

p95 và RAM không tăng đơn điệu ở mọi mức. Một nguyên nhân hợp lý là thời gian đo ngắn, garbage collection và trạng thái tiến trình, nhưng dữ liệu hiện tại chưa đủ để khẳng định quan hệ nhân quả. Generator và hệ thống cùng chạy trên Mac/OrbStack nên tranh chấp tài nguyên có thể tạo nhiễu; endpoint `/version` cũng có payload nhỏ. Do mỗi mức chuẩn mới đo một lần, kết quả chỉ được đánh dấu “đạt vòng phát triển”, không phải benchmark production hoặc nghiệm thu cuối.

Vòng VPS phải chạy ít nhất ba lần/mức, giữ nguyên ngưỡng/tài nguyên, ghi rõ vị trí nguồn phát tải và báo cáo median cùng độ dao động. Không được gọi 50 req/s là “50 người dùng” vì arrival rate và concurrent users là hai khái niệm khác nhau.

### Bằng chứng

- `evidence/T06/2026-10-12T2200-pilot-macos/`.
- `evidence/T06/2026-10-12T2202-macos/`.
- `docs/architecture/P1_LOAD_TESTING.md`.
- `docs/test-plan/T06_KE_HOACH_KIEM_THU_TAI.md`.

## 13/10/2026 — P1: quản lý biến môi trường ứng dụng

### Phạm vi thực hiện

- Thêm bảng SQLite cho biến môi trường theo ứng dụng; mã hóa mọi giá trị bằng AES-256-GCM.
- Thêm API đọc/thay thế toàn bộ danh sách; giá trị nhạy cảm luôn bị che và có thể giữ nguyên bằng `null`.
- Khóa các biến nền tảng như `APP_VERSION`, `PORT`, `NODE_OPTIONS`; giới hạn tên, số lượng và dung lượng.
- Thêm Runner endpoint nội bộ, nhãn theo dõi tên biến và cơ chế tái tạo/rollback container.
- Bảo toàn biến môi trường khi App A cập nhật image v1 → v2.
- Thêm tab **Biến môi trường** trong màn chi tiết từng ứng dụng, không thêm thư viện frontend.
- Bổ sung endpoint `/config` cho app mẫu để kiểm chứng biến thường và sự tồn tại của secret giả mà không trả giá trị secret.

### Kết quả thực tế

- Runner unit test: 19/19 đạt.
- Control API unit test: 12/12 đạt.
- Dashboard production build: đạt; không chạy trình duyệt/responsive theo quy tắc dự án.
- P1 Environment Variables integration: 21 kiểm tra đạt.
- App A nhận biến, giữ biến khi đổi v1 → v2, xóa cấu hình và trở về v1.0.0.
- Audit, API và bằng chứng không chứa giá trị secret giả.
- Tám service ở trạng thái `healthy` sau kiểm thử.

### Sự cố và cách xử lý

Lần chạy tích hợp đầu tiên nhận HTTP 504 ở Gateway. Nguyên nhân là cấu hình toàn cục `proxy_read_timeout 5s`, trong khi tái tạo container phải chờ health check lâu hơn. Gateway được sửa để các request `/api/` có timeout đọc 50 giây; Runner/Control API vẫn giữ timeout hữu hạn. Sau khi rebuild riêng Gateway, toàn bộ 21 kiểm tra đạt.

### Giới hạn cần ghi đúng

- Mỗi thay đổi tái tạo container một replica nên có gián đoạn ngắn.
- Người có quyền Docker/host vẫn đọc được `Config.Env`; đây chưa phải Vault/KMS/Docker Secrets.
- Thay hoặc mất khóa mã hóa khiến cấu hình cũ không giải mã được; khóa phải được sao lưu ngoài Git.
- Chưa nghiệm thu trên VPS Linux.

### Bằng chứng

- `evidence/P1-environment/2026-10-13-macos/`.
- `docs/architecture/P1_ENVIRONMENT_VARIABLES.md`.
- `docs/decisions/0008-encrypted-application-environment.md`.
- `tests/integration/p1_environment.sh`.

## 13/10/2026 — P2: lịch sử release và rollback

### Phạm vi thực hiện

- Thêm migration 005 và bảng release bất biến cho cập nhật catalog, deployment Git và rollback.
- Lưu version, image reference, image ID, source/commit, người thực hiện và release đích.
- Thêm API đọc release và rollback theo `releaseId`; Dashboard không gửi image tùy ý.
- Runner kiểm tra allowlist và image ID trước khi thay container, giữ biến môi trường đang quản lý.
- Thêm vùng **Release có thể rollback** trong tab Triển khai của từng ứng dụng.
- Thêm audit `release.rollback`, tài liệu kiến trúc, ADR và kịch bản tích hợp container thật.

### Kết quả thực tế

- Runner unit test: 23/23 đạt.
- Control API unit/API test: 13/13 đạt.
- Dashboard production build: đạt; không chạy trình duyệt/responsive theo quy tắc dự án.
- P2 Release History / Rollback: 17 kiểm tra tích hợp đạt.
- App A được đưa v2 → v1 → rollback đúng image ID v2 → dọn về v1.
- Audit ghi nhận rollback; yêu cầu chưa đăng nhập bị từ chối.

### Giới hạn cần ghi đúng

- Rollback phụ thuộc image còn trên cùng Docker host; metadata SQLite không thay thế registry.
- Nếu tag trỏ sang image ID khác, Runner từ chối thay vì chạy nhầm.
- Thay một replica gây gián đoạn ngắn và chưa phải zero-downtime.
- Chưa nghiệm thu trên VPS Linux.

### Bằng chứng

- `evidence/P2-rollback/2026-10-13-macos/`.
- `docs/architecture/P2_RELEASE_ROLLBACK.md`.
- `docs/decisions/0009-local-release-rollback.md`.
- `tests/integration/p2_release_rollback.sh`.

## 13/10/2026 — P1 bổ sung triển khai commit mới nhất

### Phạm vi thực hiện

- Thêm `defaultBranch=main` và GitHub ref URL cố định vào source catalog.
- Runner phân giải ref thành SHA 40 ký tự, giới hạn metadata 64 KiB và từ chối phản hồi không hợp lệ.
- Control API thêm `POST /api/v1/deployments/latest`; sau khi phân giải dùng lại luồng deployment theo SHA hiện có.
- Dashboard ưu tiên nút **Triển khai commit mới nhất** và vẫn giữ form **Triển khai commit đã nhập**.
- Không triển khai webhook hoặc tự deploy khi push.

### Kết quả thực tế

- Runner unit test: 27/27 đạt.
- Control API unit/API test: 13/13 đạt.
- Dashboard production build: đạt; không chạy trình duyệt/responsive theo quy tắc dự án.
- Kịch bản tích hợp commit mới nhất: 15 kiểm tra đạt.
- Toàn bộ `make test` đạt, gồm unit/API/build và các regression P0.1–P2.
- SHA phân giải khớp `origin/main` tại `d6297422c3363b1aa728c1df3b88200b8bc0fdf8`.
- Image và release lưu đúng commit; App A được dọn về `v1.0.0`; tám service khỏe.

### Giới hạn

- Chỉ hỗ trợ source GitHub công khai và nhánh `main` đã allowlist.
- GitHub API không xác thực có giới hạn tần suất; chưa dùng GitHub App/token.
- Chưa có webhook/auto-deploy, chọn nhánh tùy ý hoặc hủy build.

### Bằng chứng

- `evidence/P1-git-latest/2026-10-13-macos/`.
- `tests/integration/p1_git_latest.sh`.

## 14/10/2026 — Dựng lại và nghiệm thu bước đầu trên VPS Debian 12

### Môi trường và an toàn vận hành

- VPS 2 vCPU, khoảng 3,8 GiB RAM, 40 GB SSD; Debian 12 x86_64.
- Cài Docker Engine 29.9.0, Compose 5.6.0, Node.js 24.21.0, `make`, UFW và công cụ cần thiết.
- Tạo swap 2 GiB tại `/swapfile`, quyền `0600`, bật thành công và thêm vào `/etc/fstab`.
- Chuyển SSH sang xác thực khóa; tắt đăng nhập mật khẩu, keyboard-interactive và root login.
- UFW mặc định chặn chiều vào; SSH chỉ cho phép trên `tailscale0`. Gateway Compose vẫn chỉ bind `127.0.0.1:8080`.
- Secret được sinh trực tiếp trong `.env` trên VPS với quyền `0600`, không ghi vào Git hoặc evidence.

### Kết quả dựng lại

- Clone repository vào `/home/user/mini-paas`, cấu hình `.env` và chạy `make up`.
- Tám service đạt trạng thái healthy.
- `make smoke`: 9/9 đạt.
- `make test`: Runner 27/27, Control API 13/13, Dashboard production build và toàn bộ regression P0.1–P2 đều đạt.
- `make test-p1-git-latest`: 15/15 đạt; App A được dọn về v1.0.0 sau thử nghiệm.

### Sự cố Linux và cách xử lý

Vòng T06 đầu tiên thất bại trước khi phát tải vì container k6 dùng UID mặc định không ghi được bind mount kết quả trên Linux. Script được sửa để chạy k6 bằng UID/GID của người gọi (`K6_USER`, mặc định `id -u:id -g`). Commit `5cc99b1` được đẩy lên GitHub, VPS fast-forward tới commit này và pilot sau sửa đạt cả ba mức.

### Kết quả T06 chính thức

- Chạy ba vòng chuẩn cùng cấu hình, mỗi vòng gồm 10/25/50 req/s trong 60 giây/mức.
- Cả chín tổ hợp lần đo/mức tải đều đạt; lỗi 0%, check 100%, dropped iteration bằng 0.
- Median p95: 58,00 ms tại 10 req/s; 22,78 ms tại 25 req/s; 35,00 ms tại 50 req/s.
- Khoảng p95 qua ba lần: 45,87–58,92 ms; 19,83–40,19 ms; 18,12–48,81 ms.
- Hai app khỏe trong toàn bộ mẫu Prometheus; chưa quan sát bão hòa CPU/RAM trong phạm vi thử.

Generator chạy cùng VPS và endpoint là JSON nhỏ, vì vậy kết quả chỉ chứng minh ba mức tải đã định trong môi trường này; không dùng để tuyên bố SLA hoặc năng lực production.

### Công khai dịch vụ và tên miền — phương án dự kiến tại thời điểm 14/10

- `PUBLIC_ORIGIN` tạm đặt thành `https://vps2.tail5cce4c.ts.net`; cookie phiên bật cờ `Secure`.
- Tailscale Funnel yêu cầu chủ tailnet đăng nhập và bật quyền một lần. Chỉ ghi Funnel là “đã hoạt động” sau khi `tailscale funnel status` và request HTTPS từ ngoài đều đạt.
- Tên miền `paas.ai2p.id.vn` từng được thiết kế là bản ghi `REDIRECT` sang URL Funnel; phương án này chưa được nghiệm thu và đã được thay bằng Cloudflare Tunnel ngày 15/10/2026.

### Bằng chứng và tài liệu

- `evidence/T06/2026-10-14-vps-linux/`.
- `docs/architecture/BANG_TAI_NGUYEN_IP_QUYEN_VPS.md`.

## 15/10/2026 — Web Service động và hostname riêng

### Phạm vi triển khai

- Bổ sung migration SQLite 006 để lưu loại ứng dụng, repository, nhánh, build context, hostname và cổng nội bộ.
- Dashboard có biểu mẫu tạo Web Service từ repository GitHub công khai thuộc owner allowlist.
- Runner xác minh lại repository/owner/context, build commit SHA và tạo container riêng với giới hạn quyền/tài nguyên cố định.
- Gateway định tuyến hostname `slug.localhost` hoặc `slug.ai2p.id.vn` tới Docker alias `service-<slug>:3000`.
- Web Service dùng lại quản lý vòng đời, log, stats, biến môi trường, deployment history và rollback hiện có.

### Kết quả vòng phát triển macOS

- Runner unit: 30/30 đạt; Control API: 14/14 đạt.
- Dashboard typecheck và production build đạt; Compose config hợp lệ.
- Tạo `render-demo` từ `VietDSK6/NMCNNT---Nhom5`, context `apps/app-a`.
- Commit `680e789e551fa6270d2751d6a7d8d54cdce86e70` được build thành `mini-paas/service-render-demo:git-680e789e551f`.
- Deployment đạt `succeeded`; container riêng chạy trên `mini-paas-edge`, RAM giới hạn 128 MiB.
- Host route `render-demo.localhost` trả đúng health/version; Control API quan sát đúng version và tổng 3/3 ứng dụng khỏe.

### Giới hạn và bước tiếp theo

- Đã nghiệm thu luồng nội bộ trên VPS Linux; route Tunnel wildcard `*.ai2p.id.vn` được bổ sung và xác minh từ máy ngoài trong cùng ngày.
- Chỉ owner allowlist, repository công khai, nhánh main, cổng 3000 và Dockerfile tại build context.
- Chưa có xóa service, webhook, registry digest hoặc sandbox đa thuê.
- Chi tiết kiến trúc và tiêu chí nghiệm thu nằm tại `docs/architecture/P2_DYNAMIC_WEB_SERVICES.md`.
- `docs/deployment/HUONG_DAN_TEN_MIEN_TENTEN.md`.

### Kết quả nghiệm thu nội bộ trên VPS

- Cập nhật VPS từ `5cc99b1` lên `2c8a4af`; bảo toàn các bộ dữ liệu T06 cũ trong thư mục sao lưu ngoài repository trước khi fast-forward.
- Đặt `SERVICE_BASE_DOMAIN=ai2p.id.vn`, `TRUSTED_GITHUB_OWNERS=VietDSK6`; file `.env` tiếp tục có quyền `0600`.
- Dựng lại Gateway, Control API, Runner và Dashboard; tám service Compose khỏe; `make smoke` đạt 9/9.
- Tạo `vps-demo` qua API, build commit `2c8a4af1ea2292ebdb61071de740fd875d611624` thành `mini-paas/service-vps-demo:git-2c8a4af1ea22`; deployment đạt `succeeded`.
- Host route nội bộ trả đúng health/version; Control API báo 3/3 ứng dụng khỏe và thao tác restart đạt.
- Lần kiểm tra public đầu tiên trả lỗi chưa phân giải tên miền khi wildcard chưa có. Sau khi cấu hình route, `vps-demo.ai2p.id.vn` trả health/version đúng qua HTTPS; đây là bằng chứng lỗi ban đầu thuộc DNS/Tunnel, không phải container hay Gateway.
- Tạo thêm Web Service độc lập `demo` từ repository riêng; URL `https://demo.ai2p.id.vn` trả health/version với phiên bản `git-6ffa63d8b922`.
- Bằng chứng: `evidence/VPS/2026-10-15-dynamic-web-service/`.

## 15/10/2026 — Công khai Mini PaaS bằng Cloudflare Tunnel

### DNS và đường truy cập

- Thêm `ai2p.id.vn` vào Cloudflare, giữ nguyên bản ghi Vercel `@` và `www` ở chế độ DNS only.
- Đổi nameserver tại TenTen sang `carlos.ns.cloudflare.com` và `stella.ns.cloudflare.com`; cả resolver Cloudflare và Google đều trả về cặp NS mới.
- Tạo Tunnel `mini-paas-vps` và published route `paas.ai2p.id.vn` cùng wildcard `*.ai2p.id.vn` tới `http://127.0.0.1:8080`.
- Không mở Docker API hoặc các service nội bộ ra Internet; Gateway tiếp tục chỉ bind loopback.

### Connector và bảo mật

- Dùng `cloudflared` 2026.10.0 với image ghim digest.
- Token lưu ngoài repository tại file quyền `0600`; container đọc qua `--token-file`, không đưa token vào biến môi trường hoặc evidence.
- Sau khi hoàn tất cài đặt, token connector ban đầu đã được xoay trên Cloudflare để thu hồi giá trị cũ. Token mới được chuyển trực tiếp vào file bảo mật trên VPS, không ghi vào Git hoặc nhật ký lệnh.
- Container dùng `restart=unless-stopped`, host network, UID/GID `1000:1000`, root filesystem read-only, bỏ capabilities và bật `no-new-privileges`.
- Phát hiện metrics mặc định lắng nghe mọi interface; đã tái tạo connector để metrics chỉ bind `127.0.0.1:20241`.
- Connector đăng ký bốn kết nối QUIC tới các edge Cloudflare; connectivity pre-check DNS, UDP/QUIC, TCP/HTTP2 và Cloudflare API đều đạt.

### Cấu hình ứng dụng

- Đặt `PUBLIC_ORIGIN=https://paas.ai2p.id.vn` và `SESSION_COOKIE_SECURE=true`.
- Tái tạo Control API, Grafana và Gateway; tám service Compose đều khỏe.

### Kết quả kiểm thử

- HTTPS `/healthz` và `/api/health` từ máy ngoài trả HTTP 200, xác minh TLS thành công.
- 10/10 request health lặp từ máy ngoài đạt.
- Chuỗi chưa đăng nhập → đăng nhập → đọc session → đọc applications → đăng xuất → session cũ cho kết quả `401/200/200/200/204/401`.
- `make smoke`: 9/9 đạt; P0.2 qua URL public: 15/15 đạt.
- Sau khi tái tạo connector để siết metrics, bốn edge kết nối lại và 5/5 request health đạt.
- Sau khi xoay token, connector tiếp tục đăng ký bốn edge mới, tám service vẫn khỏe và 5/5 request health công khai đạt.
- `https://vps-demo.ai2p.id.vn/health` và `/version` trả đúng Web Service `vps-demo`; `https://demo.ai2p.id.vn/health` và `/version` trả đúng sản phẩm độc lập `demo`.
- Dashboard ở commit `2104d64` phục vụ luồng tạo Web Service riêng tại `/applications/new`; bundle công khai chứa đúng nội dung mới.

### Giới hạn quan sát được

VPS không có default route IPv6 toàn cục và resolver LAN xuất hiện lỗi thoáng qua khi chính VPS gọi ngược URL public. Vòng so sánh ghi nhận curl mặc định đạt 29/30, ép IPv4 đạt 30/30; một lần chạy P0.2 khác lỗi phân giải ở request cuối. Kiểm thử public chính được thực hiện từ máy ngoài và đạt, nhưng hạn chế outbound DNS của VPS vẫn phải được giữ trong báo cáo thay vì coi hệ thống có SLA.

### Bằng chứng

- `evidence/VPS/2026-10-15-cloudflare-tunnel/`.
- `docs/deployment/HUONG_DAN_TEN_MIEN_TENTEN.md`.
- `docs/architecture/BANG_TAI_NGUYEN_IP_QUYEN_VPS.md`.

## 15/10/2026 — T08 sao lưu và khôi phục Control Plane

### Phạm vi và an toàn

- Bổ sung online backup SQLite bằng `node:sqlite`, tương thích database WAL đang hoạt động.
- Archive chỉ gồm database, summary và checksum; `.env`/khóa mã hóa được giữ riêng ngoài Git.
- Restore chỉ cho phép volume tạm có tiền tố `mini-paas-t08-restore-*`, không thể ghi đè volume live bằng script thử nghiệm.
- Control API phục hồi chạy không publish cổng; toàn bộ container/volume tạm được dọn sau bài thử.

### Kết quả VPS

- Commit `c6b1be0`; SQLite integrity `ok`, schema v6 và SHA-256 hợp lệ trước/sau restore.
- Khớp số dòng bảy nhóm bảng; dữ liệu phục hồi có đủ bốn ứng dụng `app-a`, `app-b`, `demo`, `vps-demo`.
- Đăng nhập và đọc applications đều HTTP 200; App A qua Gateway HTTP 200.
- Tám service live tiếp tục chạy; API public và `demo.ai2p.id.vn` vẫn khỏe; không còn tài nguyên tạm.

### Sự cố và cách xử lý

Vòng VPS đầu gặp `EPERM` khi Node dùng `copyFileSync` qua bind mount và named volume trên Linux. Cách chép được đổi thành đọc/ghi byte trực tiếp; checksum và `PRAGMA integrity_check` vẫn là điều kiện bắt buộc. Vòng chạy lại đạt.

### Bằng chứng

- `evidence/T08/2026-10-15-vps/`.
- `docs/architecture/P2_BACKUP_RESTORE.md`.

## 16/10/2026 — Chốt release candidate `v1.0.0-rc.1`

### Phạm vi

- Tạo `VERSION`, manifest release và bảng phiên bản môi trường VPS.
- Chạy toàn bộ hồi quy trên macOS và VPS, sau đó chạy riêng deploy latest, T08 và kiểm tra public HTTPS.
- Không thêm tính năng mới, không chạy kiểm tra responsive/trình duyệt.

### Sự cố phát hiện trong hồi quy

P0.2 và P1 observability còn giả định danh mục/metric chỉ có đúng App A và App B. Sau khi nền tảng hỗ trợ Web Service động, local có thêm `render-demo` và Prometheus có ba chuỗi nên hai assertion thất bại dù mọi service đều khỏe. Test được sửa để chọn và bắt buộc hai app lõi tồn tại/khỏe, đồng thời chấp nhận các service động hợp lệ.

### Kết quả

- Commit runtime `37289d852a9e2078490e08528f925d0500781f96`.
- Local và VPS: Runner 30/30, Control API 14/14, Dashboard build đạt; toàn bộ integration P0/P1/P2 đạt.
- Deploy latest 15 kiểm tra đạt và đưa App A về v1 sau thử nghiệm.
- T08 đạt, đủ bốn ứng dụng, stack live không đổi; database backup chuyển ra ngoài repository với quyền `0700/0600`.
- Dashboard/API/`demo`/`vps-demo` public đạt; API applications chưa đăng nhập trả 401.
- 8/8 service VPS running/healthy; chỉ Gateway bind `127.0.0.1:8080`.
- Quét cây và lịch sử Git không phát hiện mẫu secret xác suất cao.

### Bằng chứng

- `evidence/RELEASE/2026-10-16-v1.0.0-rc.1/`.
- `docs/release/RELEASE_CANDIDATE_1.md`.

## 16/10/2026 — Chuẩn hóa ma trận T01–T08 và kiểm toán bằng chứng

### Kết quả

- Chuẩn hóa ma trận T01–T08 theo yêu cầu hồ sơ: điều kiện, thao tác, kỳ vọng, thực tế, kết quả, thời gian, commit, môi trường, người thực hiện và liên kết bằng chứng.
- Đối soát T01–T05/T07 với hồi quy release candidate; dùng đúng dữ liệu gốc ba vòng VPS của T06 và lần chạy lại T08 trên release candidate.
- Xác minh 11/11 manifest checksum đã có đều đạt; tạo thêm manifest SHA-256 cho 29 tệp nguồn lịch sử.
- Ghi rõ T01 là `Đạt có lưu ý` do không còn raw log nguyên bản của lần dựng VPS sạch ngày 14/10. T06 được đo ở commit `5cc99b1`, trên cùng VPS với bộ phát tải, nên không dùng để tuyên bố SLA hoặc năng lực production.
- Nhãn người thực hiện hiện là `TV1 – chủ dự án`; đây là nhãn tạm và phải thay bằng họ tên/MSSV thật trước khi nộp.

### Bằng chứng

- `docs/test-plan/BANG_KIEM_THU_T01_T08.md`.
- `evidence/AUDIT/2026-10-16-v1.0.0-rc.1/`.

## 16/10/2026 — Chốt kiến trúc tổng thể cuối

### Nội dung

- Hợp nhất kiến trúc đã triển khai thành một tài liệu nguồn duy nhất cho báo cáo và slide.
- Bổ sung sơ đồ thành phần cuối gồm Cloudflare Tunnel, Gateway, control plane, data plane, observability plane, GitHub và Docker Engine.
- Bổ sung sơ đồ mạng/ràng buộc quyền, sequence Git → build → image → deploy → route và luồng quan sát/khôi phục.
- Liên kết yêu cầu với T01–T08 và các bài thử P1/P2; ghi rõ điểm lỗi đơn, giới hạn một host, image cache cục bộ và owner allowlist.
- Cập nhật Chương 3 theo trạng thái release candidate; không chạy kiểm tra trình duyệt/responsive vì thay đổi chỉ thuộc tài liệu.

### Tài liệu

- `docs/architecture/KIEN_TRUC_TONG_THE_CUOI.md`.
- `docs/report/CHUONG_3_PHAN_TICH_VA_THIET_KE.md`.
