# CHƯƠNG 3. PHÂN TÍCH YÊU CẦU VÀ THIẾT KẾ HỆ THỐNG

> Bản nháp cập nhật đến mốc P1.1A ngày 12/10/2026. Nội dung dùng thì hiện tại cho phần đã kiểm thử; triển khai tự động từ registry, Prometheus/Grafana và kiểm thử tải vẫn là nội dung dự kiến của P1.

## 3.1. Phân tích bài toán

Mini PaaS được xây dựng nhằm minh họa một quy trình quản lý vòng đời ứng dụng Web trên hạ tầng container. Thay vì chỉ chạy riêng một Web Server hoặc một container, hệ thống kết nối các bước: định tuyến truy cập, xem trạng thái, điều khiển vòng đời, cập nhật phiên bản, đọc log và quan sát tài nguyên.

Phạm vi phù hợp với bài tập lớn là một máy chạy Docker và các ứng dụng mẫu do nhóm kiểm soát. Mục tiêu không phải tạo dịch vụ đám mây thương mại mà là xây dựng một mô hình có thể cài lại, kiểm thử, đo đạc và giải thích được. Vì vậy thiết kế ưu tiên ranh giới quyền rõ ràng, ít phụ thuộc và dữ liệu kiểm chứng thật.

## 3.2. Yêu cầu hệ thống

### 3.2.1. Yêu cầu chức năng

| Mã | Yêu cầu | Trạng thái đến P0.2C |
|---|---|---|
| FR01 | Phục vụ hai ứng dụng Web qua một Gateway | Đã triển khai, kiểm thử |
| FR02 | Hiển thị health, phiên bản mong muốn và phiên bản thực tế | Đã triển khai, kiểm thử |
| FR03 | Đăng nhập quản trị và duy trì phiên | Đã triển khai, kiểm thử |
| FR04 | Dừng, khởi động, khởi động lại ứng dụng | Đã triển khai, kiểm thử |
| FR05 | Cập nhật App A giữa v1.0.0 và v2.0.0 | Đã triển khai, kiểm thử |
| FR06 | Lưu lịch sử operation và audit | Đã triển khai, kiểm thử |
| FR07 | Xem log gần nhất theo giới hạn | Đã triển khai, kiểm thử |
| FR08 | Xem ảnh chụp CPU/RAM/PID/mạng | Đã triển khai, kiểm thử |
| FR09 | Triển khai dựa trên Git bằng CI/CD | Đang thực hiện P1: đã cấu hình build/test theo commit, chưa push registry hoặc deploy |
| FR10 | Lưu chuỗi thời gian và hiển thị đồ thị | Dự kiến P1 |

### 3.2.2. Yêu cầu phi chức năng

- Chỉ Gateway mở cổng ra máy phát triển; các service nội bộ dùng mạng Docker.
- Dashboard và Control API không được truy cập Docker socket.
- Runner không nhận shell command, container ID, image hay volume tùy ý từ người dùng.
- Các container có health check, giới hạn CPU/RAM/PID, filesystem gốc chỉ đọc và xoay vòng log.
- Dữ liệu đầu vào được kiểm tra schema; thao tác quản trị yêu cầu session.
- Hệ thống phải có lệnh dựng, kiểm thử và dừng rõ ràng; không dùng lệnh dọn Docker có tính phá hủy.
- Giao diện hỗ trợ desktop, tablet và mobile; thao tác chính có trạng thái tải, lỗi và rỗng.

## 3.3. Kiến trúc tổng thể một máy

Hệ thống được chia thành mặt phẳng điều khiển và mặt phẳng dữ liệu. P0.2C bổ sung đường quan sát nhưng chưa tạo mặt phẳng giám sát chuỗi thời gian riêng.

```text
                        NGƯỜI QUẢN TRỊ
                              |
                              v
                     Nginx Gateway :8080
                    /          |           \
                   v           v            v
             Dashboard    Control API    App A / App B
                              |              ^
                              v              |
                           SQLite        mạng edge
                              |
                              v
                     Deployment Runner
                              |
                    Docker Engine API
                    /       |        \
                 trạng thái log      stats
```

Mặt phẳng dữ liệu là lưu lượng từ Gateway tới App A/App B. Mặt phẳng điều khiển gồm Dashboard, Control API, SQLite và Runner. Gateway tham gia cả hai mạng để chuyển tiếp request, nhưng quyền Docker chỉ nằm ở Runner.

## 3.4. Thiết kế thành phần

### 3.4.1. Nginx Gateway

Gateway là cổng HTTP duy nhất bind vào `127.0.0.1:8080` trong môi trường phát triển. Các nhóm route gồm:

- `/`: Dashboard.
- `/api/*`: Control API.
- `/apps/app-a/*`: App A.
- `/apps/app-b/*`: App B.
- `/healthz`: health của Gateway.

Nginx dùng DNS nội bộ Docker và phân giải động để tiếp tục chuyển tiếp đúng sau khi Runner thay container trong quy trình cập nhật.

### 3.4.2. Dashboard

Dashboard dùng React, Vite và TypeScript. Giao diện trình bày riêng health HTTP, trạng thái container, phiên bản mong muốn và phiên bản quan sát được để tránh coi các khái niệm này là tương đương.

Các thao tác vòng đời trả về `202 Accepted`; Dashboard theo dõi operation qua polling. Log và stats chỉ được tải khi người quản trị mở vùng quan sát hoặc bấm làm mới. Hai nguồn có trạng thái lỗi độc lập để lỗi stats không che log và ngược lại.

### 3.4.3. Control API

Control API dùng Fastify và TypeScript, thực hiện:

- Xác thực, session và kiểm tra cùng nguồn cho POST.
- Kiểm tra schema body, params và query.
- Đọc/ghi metadata, operation và audit trong SQLite.
- Kiểm tra health/phiên bản qua đường truy cập Gateway.
- Chuyển yêu cầu vòng đời và quan sát tới Runner bằng secret nội bộ.

Control API không được gắn Docker socket và không thực hiện lệnh shell.

### 3.4.4. Deployment Runner

Runner là service đặc quyền duy nhất được gắn `/var/run/docker.sock`. Catalog trong mã nguồn ánh xạ `appId` sang service, network và image cho phép. Runner chỉ quản lý container có đủ nhãn dự án, service và nhãn quản lý.

Runner cung cấp status, start, stop, restart, update, logs và stats. Update tạo container thay thế, chờ health rồi mới xóa container cũ; khi thất bại trong quá trình này, Runner cố gắng phục hồi container cũ. Đây là phục hồi của một operation, chưa phải lịch sử rollback độc lập.

### 3.4.5. Ứng dụng mẫu

App A và App B là hai Web server Node.js nhỏ, không có thư viện ngoài. Mỗi app có `/health`, `/version`, log JSON trên stdout và trang minh họa. App A có hai image v1.0.0/v2.0.0; App B dùng để đối chiếu định tuyến và vòng đời độc lập.

## 3.5. Thiết kế mạng và cổng

| Thành phần | `edge` | `control` | Cổng host | Docker socket |
|---|---:|---:|---:|---:|
| Gateway | Có | Có | `127.0.0.1:8080` | Không |
| Dashboard | Không | Có | Không | Không |
| Control API | Không | Có | Không | Không |
| Runner | Không | Có | Không | Có |
| App A/App B | Có | Không | Không | Không |

Mạng `control` được đặt nội bộ. Việc tách mạng làm giảm kết nối trực tiếp không cần thiết, nhưng không biến Docker socket thành quyền hạn chế. Nếu Runner bị chiếm quyền, host Docker vẫn có nguy cơ cao.

## 3.6. Thiết kế dữ liệu và trạng thái

SQLite hiện lưu các nhóm dữ liệu:

- `users`: tên đăng nhập, salt và password hash `scrypt`.
- `sessions`: hash của session token và thời gian hết hạn.
- `applications`: danh mục, route và phiên bản mong muốn.
- `operations`: action, phiên bản đích, người yêu cầu, trạng thái và thông báo.
- `audit_events`: người thực hiện, tài nguyên, kết quả, địa chỉ nguồn và thời gian.

Operation chuyển qua `queued → running → succeeded|failed`. Partial unique index ngăn hai operation đang hoạt động trên cùng một ứng dụng. Runner còn có khóa trong bộ nhớ để bảo vệ lớp Docker nếu request đi ngoài luồng thông thường.

Stats snapshot không được lưu vào SQLite vì dữ liệu này không phù hợp với cơ sở dữ liệu nghiệp vụ. P1 dự kiến dùng Prometheus cho chuỗi thời gian.

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

### 3.7.4. Đọc log và tài nguyên

1. Dashboard yêu cầu tối đa 200 dòng log và một snapshot stats cho app đã chọn.
2. API kiểm tra session và danh mục ứng dụng.
3. Runner tìm container bằng nhãn, không dùng container ID từ request.
4. Log multiplex của Docker được giải mã thành stdout/stderr, giới hạn kích thước và che một số mẫu bí mật.
5. CPU được tính từ chênh lệch hai mẫu; RAM dùng working set; PID và byte mạng được tổng hợp.
6. Dashboard hiển thị kết quả cùng thời điểm lấy mẫu. Nếu người dùng đổi ứng dụng nhanh, phản hồi cũ bị bỏ.

## 3.8. Thiết kế an toàn

Các biện pháp đã triển khai gồm:

- Gateway chỉ bind localhost ở môi trường phát triển.
- Session dùng cookie `HttpOnly`; POST kiểm tra origin.
- Mật khẩu và Runner secret chỉ lấy từ biến môi trường, không có giá trị mặc định dùng được.
- Control API và Runner đều kiểm tra đầu vào; Runner có catalog cố định.
- Không có endpoint `exec` hoặc khả năng nhận shell command.
- Docker socket không xuất hiện trong Dashboard, API, Gateway hoặc app mẫu.
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
- Quan sát on-demand hoàn thành MVP trước; Prometheus/Grafana được tách sang P1 để cung cấp lịch sử đúng chức năng.

## 3.10. Giới hạn thiết kế và hướng tiếp theo

Hệ thống vẫn phụ thuộc một host, một Gateway, một API, một Runner và một SQLite; do đó không có high availability. Operation bất đồng bộ chưa có message broker bền vững. P1.1A đã cấu hình CI build/test và tạo image manifest theo commit, nhưng workflow chưa chạy trên GitHub, ảnh chưa được đẩy lên registry và Runner chưa triển khai theo registry digest. Stats chỉ là snapshot và log chưa được tập trung.

Phần tiếp theo của P1 dự kiến chạy CI thật trên GitHub, bổ sung push/deploy theo registry digest có kiểm soát, sau đó tích hợp cAdvisor/Prometheus/Grafana, kiểm thử tải và số liệu thực nghiệm. Các thành phần này phải giữ nguyên nguyên tắc không công khai Docker socket và chỉ triển khai repository/image đã cho phép.
