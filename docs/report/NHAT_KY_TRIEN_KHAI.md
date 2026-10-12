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
