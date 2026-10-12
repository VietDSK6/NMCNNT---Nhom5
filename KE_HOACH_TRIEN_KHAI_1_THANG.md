# KẾ HOẠCH TRIỂN KHAI MINI PAAS TRONG 30 NGÀY

## 1. Thông tin và trạng thái kế hoạch

- Tên đề tài: Nghiên cứu, thiết kế và xây dựng nền tảng triển khai, quản lý ứng dụng Web tự động trên hạ tầng Container (Mini PaaS).
- Thời gian kế hoạch: từ ngày 11/10/2026 đến hết ngày 10/11/2026, theo múi giờ Việt Nam.
- Mục tiêu: hoàn thành sản phẩm chạy được, bộ kiểm thử và minh chứng, báo cáo cuối kỳ, slide và kịch bản demo trong một tháng.
- Trạng thái ban đầu ngày 11/10/2026: repository mới chỉ có AGENTS.md; chưa có mã nguồn, cấu hình, Git repository hoặc kết quả kiểm thử.
- Trạng thái phê duyệt đề tài: chưa có thông tin xác nhận giảng viên đã phê duyệt.
- Tại thời điểm lập bản đầu ngày 11/10/2026, quy mô nhóm, thời lượng làm việc mỗi thành viên và cấu hình máy chủ chưa được cung cấp; các thông tin đã xác nhận sau đó được ghi ở phần cập nhật thực tế.

### Cập nhật thực tế ngày 12/10/2026

- P0.1, P0.2A, P0.2B và P0.2C đã được triển khai, kiểm thử trên máy phát triển macOS/OrbStack.
- Đã có workflow CI nội bộ, script build ảnh mẫu theo commit và manifest; kiểm thử cục bộ đạt. Workflow run đầu tiên trên GitHub đã thành công và tạo artifact ngày 12/10/2026. Đây là công cụ kiểm tra repository Mini PaaS, chưa phải chức năng triển khai ứng dụng từ Git của sản phẩm.
- MVP hiện có hai app, Gateway, Dashboard, Control API, SQLite, Runner, vòng đời ứng dụng, cập nhật v1/v2, log gần nhất và snapshot CPU/RAM/PID/mạng.
- G1 và phần kỹ thuật của G2 đã đạt trên môi trường phát triển sớm hơn lịch dự kiến; chưa thay thế nghiệm thu máy Linux sạch hoặc VPS.
- T03, T04, T05 phần phát triển và T07 đã có bằng chứng. T01/T02 cần chạy lại trên môi trường sạch; T06/T08 và kết quả VPS chưa hoàn tất.
- Bản nháp Chương 3 đã được tạo song song tại `docs/report/CHUONG_3_PHAN_TICH_VA_THIET_KE.md`.
- Bước tiếp theo của sản phẩm là luồng repository tin cậy → chọn commit → build image → lưu log/digest → triển khai image đã cho phép. Prometheus/Grafana và k6 vẫn thuộc G3; không mở P2 trước khi các phần này ổn định.
- Theo quyết định của chủ dự án, từ ngày 12/10/2026 không chạy kiểm tra responsive hoặc kiểm tra trực quan bằng trình duyệt ở bất kỳ giai đoạn nào, trừ khi được yêu cầu riêng. Dashboard vẫn phải qua typecheck/build và các kiểm thử chức năng qua API/unit/integration; không được ghi responsive là đã xác minh cho thay đổi mới nếu chưa kiểm tra.
- Yêu cầu nộp mới: báo cáo 12–18 trang nội dung chính, video 5–7 phút, bảng kiểm thử đủ đầu vào/thao tác/kỳ vọng/thực tế/kết quả/bằng chứng có dấu thời gian, dữ liệu đo gốc, bảng tài nguyên/IP/quyền, phiếu đóng góp cá nhân và khai báo nguồn tham khảo/cách dùng AI.
- Nhóm có 04 thành viên. Mỗi người phải có sản phẩm kỹ thuật riêng; nhiệm vụ chỉ tìm tài liệu hoặc viết báo cáo không đủ điều kiện đóng góp cá nhân.

Kế hoạch này dùng ba luồng công việc song song:

1. Sản phẩm và hạ tầng.
2. Kiểm thử và thu thập minh chứng.
3. Báo cáo, tài liệu, slide và demo.

Báo cáo không để đến cuối tháng mới viết. Mỗi tính năng chỉ được xem là hoàn thành khi đã có tài liệu và bằng chứng tương ứng.

## 2. Các giả định dùng để lập kế hoạch

Các giả định dưới đây phải được xác nhận trong hai ngày đầu. Nếu một giả định sai, nhóm phải cập nhật kế hoạch nhưng không tự nâng phạm vi.

1. Môi trường demo chuẩn là một máy Linux hoặc máy ảo Linux; macOS được dùng để phát triển.
2. Mô hình chỉ chạy trên một host, chấp nhận host và reverse proxy là điểm lỗi đơn.
3. Chỉ triển khai các ứng dụng mẫu do nhóm kiểm soát; không chạy mã hoặc file Compose tùy ý do người ngoài cung cấp.
4. Docker Engine và Docker Compose là nền tảng container.
5. Nginx là reverse proxy.
6. Dashboard dùng React, Vite và TypeScript.
7. Control API và Deployment Runner dùng Node.js, TypeScript và Fastify.
8. SQLite lưu metadata, lịch sử triển khai và lịch sử thao tác; Docker Engine là nguồn xác nhận trạng thái chạy thực tế.
9. Prometheus, Grafana và cAdvisor được triển khai sau khi P0 ổn định.
10. CI/CD chỉ xây dựng và triển khai các repository hoặc image đã được cho phép.
11. Nhóm có thể dành đủ năng lực để duy trì đồng thời ba luồng công việc nêu trên.

Nếu chưa có Linux VM trước ngày 18/10/2026, nhóm vẫn phát triển P0 trên máy cá nhân nhưng phải bố trí Linux VM trước giai đoạn đo kiểm chính thức. Không dùng số liệu macOS và số liệu Linux lẫn lộn trong cùng một bảng so sánh.

## 3. Mục tiêu cuối tháng và phạm vi cam kết

### 3.1. Sản phẩm bắt buộc phải bàn giao

- Một Mini PaaS chạy được trên một host.
- Hai Web App mẫu được đóng gói bằng container.
- Một Nginx reverse proxy làm cổng truy cập duy nhất.
- Định tuyến rõ ràng đến App A và App B.
- Dashboard quản trị tối thiểu.
- Đăng nhập quản trị và từ chối yêu cầu không hợp lệ.
- Xem tên ứng dụng, phiên bản mong muốn, phiên bản đang chạy, trạng thái và health check.
- Triển khai, khởi động, dừng và khởi động lại ứng dụng theo cách có kiểm soát.
- Cập nhật App A từ phiên bản v1 sang v2.
- Xem log gần nhất và số liệu CPU/RAM.
- Có giới hạn tài nguyên cơ bản cho các container.
- Có lịch sử thao tác và kết quả triển khai.
- Một luồng CI/CD tối thiểu, có kiểm soát, xây image theo commit và triển khai image đã được phép.
- Prometheus/Grafana hoặc phương án giám sát tương đương có dữ liệu thực.
- Kiểm thử tải với p95, thông lượng, tỷ lệ lỗi và tài nguyên.
- README, tài liệu kiến trúc, tài liệu vận hành và xử lý lỗi.
- Kết quả T01 đến T08 kèm bằng chứng.
- Báo cáo 12–18 trang nội dung chính; phụ lục cấu hình và dữ liệu đo gốc tách riêng.
- Sơ đồ hệ thống và bảng tài nguyên/IP/quyền đúng với mạng Docker, cổng, DNS và ranh giới đặc quyền thực tế.
- Video demo 5–7 phút, slide và kịch bản demo.
- Phiếu đóng góp cá nhân cho 04 thành viên, mỗi người có file/sản phẩm kỹ thuật, bằng chứng và lỗi đã xử lý.
- Mục nguồn tham khảo và cách sử dụng AI.

### 3.2. Phạm vi không cam kết trong một tháng

- Kubernetes.
- Mô hình nhiều host.
- High availability hoặc SLA.
- Multi-tenant.
- Triển khai mã nguồn tùy ý từ người dùng bên ngoài.
- Autoscaling hoàn chỉnh.
- Zero-downtime deployment.
- Hệ thống secrets cấp doanh nghiệp.
- Phân tán dữ liệu hoặc database cluster.
- Tự động khôi phục khi máy vật lý hỏng.

Các nội dung trên chỉ được thực hiện nếu toàn bộ phạm vi bắt buộc đã qua kiểm thử và báo cáo đã đạt bản gần hoàn chỉnh.

## 4. Tiêu chí hoàn thành toàn dự án

Dự án chỉ được tuyên bố hoàn thành khi đồng thời thỏa mãn các điều kiện sau:

1. Một thành viên khác người viết hướng dẫn có thể dựng hệ thống từ môi trường sạch theo README.
2. Hai ứng dụng truy cập được qua reverse proxy mà không publish cổng ứng dụng trực tiếp.
3. Dashboard và API phản ánh đúng trạng thái thực tế của container.
4. Các thao tác deploy, start, stop, restart và update có log kết quả.
5. App A được cập nhật từ v1 sang v2 và có bằng chứng trước/sau.
6. Yêu cầu quản trị không xác thực bị trả về mã 401 hoặc 403 phù hợp.
7. Có health check, log và số liệu CPU/RAM thực.
8. T01 đến T08 có biên bản, dữ liệu, ảnh hoặc log và kết luận.
9. Kết quả tải ghi rõ cấu hình máy, phiên bản phần mềm, điều kiện chạy và số lần đo.
10. Không có token, mật khẩu, khóa riêng hoặc bí mật trong Git.
11. Báo cáo không mô tả tính năng dự kiến như tính năng đã hoàn thành.
12. Slide và demo thống nhất với mã nguồn và số liệu trong báo cáo.
13. Có bản đóng gói cuối cùng và hướng dẫn khôi phục nếu demo trực tiếp gặp lỗi.
14. Báo cáo có 12–18 trang nội dung chính; phụ lục không bị tính lẫn vào nội dung chính.
15. Mỗi dòng kiểm thử có đầu vào, thao tác, kỳ vọng, thực tế, đạt/chưa đạt, thời gian và bằng chứng.
16. Có dữ liệu gốc cho các phép đo hiệu năng, không chỉ có bảng tổng hợp hoặc ảnh.
17. Đủ 04 phiếu đóng góp; mỗi thành viên có sản phẩm kỹ thuật riêng và giải thích được phần mình làm.
18. Có mục nguồn tham khảo, mã/cấu hình kế thừa và cách sử dụng AI.

## 5. Kiến trúc mục tiêu

### 5.1. Phân tách thành phần

Control plane, tức mặt phẳng điều khiển:

- Dashboard: giao diện quản trị.
- Control API: xác thực, validation, metadata, lịch sử thao tác và điều phối yêu cầu.
- Deployment Runner: thành phần duy nhất được phép điều khiển Docker.
- SQLite: lưu ứng dụng, phiên bản, deployment và operation.

Data plane, tức mặt phẳng lưu lượng ứng dụng:

- Nginx Gateway: nhận lưu lượng từ quản trị viên và người dùng.
- App A và App B: các ứng dụng mẫu.

Observability plane, tức mặt phẳng quan sát:

- cAdvisor: thu thập thông tin container.
- Prometheus: lưu chuỗi thời gian.
- Grafana: trực quan hóa số liệu.
- Docker logs: nguồn log ứng dụng ở phạm vi bài tập.

Luồng chính:

    Quản trị viên
         |
         v
    Nginx Gateway ---> Dashboard
         |
         +-- /api ---> Control API ---> SQLite
                              |
                              v
                       Deployment Runner
                              |
                              v
                         Docker Engine

    Người dùng
         |
         v
    Nginx Gateway ---> App A / App B

### 5.2. Phân tách mạng

- edge: Nginx và các Web App.
- control: Nginx, Control API và Deployment Runner.
- observability: cAdvisor, Prometheus và Grafana.

Chỉ Nginx được publish cổng ra host trong cấu hình demo chuẩn. App A, App B, Control API, Runner và Docker socket không được công khai trực tiếp.

### 5.3. Nguyên tắc điều khiển Docker

- Control API không truy cập Docker socket trực tiếp.
- Runner chỉ chấp nhận appId, version và action nằm trong danh sách cho phép.
- Runner chỉ đọc manifest ở đường dẫn cố định.
- Không ghép chuỗi shell từ dữ liệu đầu vào.
- Không cho API truyền tùy ý image, command, volume mount, network mode hoặc host path.
- Mỗi ứng dụng có khóa thao tác để tránh hai lần triển khai đồng thời.
- Mọi operation có trạng thái queued, running, succeeded hoặc failed.
- Runner chỉ tồn tại trong mạng control và không có cổng công khai.
- Báo cáo phải ghi rõ Runner vẫn là thành phần quyền cao; nếu Runner bị chiếm quyền thì host có thể bị ảnh hưởng.

## 6. Cấu trúc repository dự kiến

Cấu trúc này là mục tiêu tổ chức, chưa phải trạng thái đã triển khai:

    /
    ├── AGENTS.md
    ├── README.md
    ├── .env.example
    ├── compose.yaml
    ├── apps/
    │   ├── app-a/
    │   └── app-b/
    ├── platform/
    │   ├── dashboard/
    │   ├── control-api/
    │   ├── runner/
    │   └── gateway/
    ├── manifests/
    │   ├── app-a/
    │   └── app-b/
    ├── monitoring/
    │   ├── prometheus/
    │   └── grafana/
    ├── tests/
    │   ├── smoke/
    │   ├── integration/
    │   ├── security/
    │   └── load/
    ├── docs/
    │   ├── architecture/
    │   ├── operations/
    │   ├── test-plan/
    │   ├── report/
    │   └── presentation/
    └── evidence/
        ├── T01/
        ├── T02/
        ├── T03/
        ├── T04/
        ├── T05/
        ├── T06/
        ├── T07/
        └── T08/

Không commit file .env thật, token CI/CD, private key, dữ liệu giám sát dung lượng lớn hoặc log chứa bí mật.

## 7. Phân chia giai đoạn và cổng nghiệm thu

### G0 — Chốt thiết kế và phạm vi

Thời gian: 11/10 đến 12/10/2026.

Đầu ra:

- Xác nhận deadline, số thành viên, môi trường demo và tình trạng duyệt đề tài.
- Chốt stack và sơ đồ kiến trúc.
- Chốt API, dữ liệu chính và hai ứng dụng mẫu.
- Chốt Definition of Done và quy tắc cắt phạm vi.
- Khởi tạo Git sau khi thiết kế được nhóm đồng ý.
- Tạo khung báo cáo và danh mục nguồn tham khảo.

Cổng nghiệm thu G0:

- Không còn quyết định kiến trúc P0 quan trọng chưa có người chịu trách nhiệm.
- Mỗi yêu cầu P0 có cách kiểm thử và bằng chứng dự kiến.

### G1 — Nền tảng container và định tuyến

Thời gian: 13/10 đến 18/10/2026.

Đầu ra:

- App A và App B có health endpoint.
- App A hiển thị version rõ ràng và có v1, v2.
- Nginx định tuyến đến hai ứng dụng.
- Mạng edge và control tách biệt.
- Ứng dụng không publish cổng trực tiếp.
- Có health check và resource limit.
- README khởi động tối thiểu.
- T01 và T02 chạy qua.
- Bản nháp Chương 1 và Chương 2 của báo cáo.

Cổng nghiệm thu G1:

- Từ máy sạch có thể khởi động và truy cập hai ứng dụng bằng các lệnh đã ghi.
- Không cần chỉnh file thủ công ngoài quy trình tài liệu.

### G2 — Control plane và hoàn thành MVP

Thời gian: 19/10 đến 25/10/2026.

Đầu ra:

- Schema SQLite và migration ban đầu.
- Đăng nhập quản trị.
- Dashboard danh sách ứng dụng và trạng thái.
- Control API có validation và audit event.
- Runner allowlist thao tác.
- Deploy, start, stop, restart và update.
- Xem health, log và Docker stats snapshot.
- T03, T04 và T07 chạy qua.
- Bản nháp Chương 3.

Cổng nghiệm thu G2:

- Có thể trình diễn trọn chu trình deploy, truy cập, update, quan sát, dừng và khôi phục.
- Docker socket không xuất hiện ở Dashboard hoặc Control API.
- MVP không còn lỗi P0 đã biết có mức nghiêm trọng cao.

### G3 — CI/CD, giám sát và đo kiểm

Thời gian: 26/10 đến 31/10/2026.

Đầu ra:

- Pipeline xây image, gắn tag theo commit SHA và lưu kết quả.
- Bước deploy chỉ nhận image hoặc repository cho phép.
- Prometheus, Grafana và cAdvisor hoạt động trên môi trường Linux.
- Dashboard giám sát có CPU, RAM và trạng thái.
- Kịch bản k6 có warm-up, tải ổn định và nhiều mức tải.
- T05 và T06 có dữ liệu ban đầu.
- Thử nghiệm sự cố có thời gian phục hồi.
- Bản nháp phần triển khai của Chương 4.

Cổng nghiệm thu G3:

- Pipeline không làm lộ secret.
- Có thể truy vết từ commit đến image tag/digest và lần triển khai.
- Số liệu tải có đủ điều kiện thí nghiệm để người khác hiểu và lặp lại.

### G4 — Ổn định, kiểm thử lại và hoàn thiện báo cáo

Thời gian: 01/11 đến 07/11/2026.

Đầu ra:

- T08 hoàn thành.
- Toàn bộ T01 đến T08 được chạy lại trên bản release candidate.
- Sửa lỗi P0/P1 cần thiết.
- README, tài liệu kiến trúc và tài liệu vận hành hoàn chỉnh.
- Chương 4, 5, 6 và phụ lục hoàn chỉnh.
- Báo cáo qua ít nhất một vòng phản biện chéo.
- Chốt release candidate vào cuối ngày 07/11.

Cổng nghiệm thu G4:

- Không còn thay đổi tính năng sau feature freeze nếu không phải lỗi chặn demo hoặc sai nội dung báo cáo.
- Mọi bảng số liệu trong báo cáo có file nguồn hoặc log tương ứng.

### G5 — Dự phòng và bàn giao

Thời gian: 08/11 đến 10/11/2026.

Đầu ra:

- Soát lỗi báo cáo, trích dẫn, hình ảnh và đánh số bảng.
- Slide hoàn chỉnh.
- Video demo dự phòng.
- Diễn tập bảo vệ và kịch bản xử lý lỗi.
- Chạy smoke test cuối cùng.
- Đóng gói mã nguồn, cấu hình, tài liệu và bằng chứng.

Cổng nghiệm thu G5:

- Gói bàn giao mở được, không chứa secret và có hướng dẫn bắt đầu.
- Demo chính và phương án dự phòng đều sẵn sàng.
- Báo cáo đúng 12–18 trang nội dung chính; video nằm trong 5–7 phút; đủ 04 phiếu đóng góp kỹ thuật.

## 8. Lịch triển khai chi tiết theo ngày

| Ngày | Sản phẩm/hạ tầng | Kiểm thử và minh chứng | Báo cáo/tài liệu |
|---|---|---|---|
| 11/10 | Kiểm kê môi trường; chốt phạm vi và stack | Lập danh sách tiêu chí nghiệm thu | Tạo đề cương báo cáo, nhật ký quyết định và danh mục nguồn |
| 12/10 | Chốt sơ đồ thành phần, mạng, dữ liệu và API | Viết test plan T01–T08 | Viết mục bài toán, mục tiêu, phạm vi và giới hạn |
| 13/10 | Khởi tạo Git, cấu trúc thư mục, quy ước nhánh và môi trường | Tạo mẫu biên bản test và cấu trúc evidence | Viết Chương 1 bản đầu |
| 14/10 | Xây App A v1/v2 và App B; thêm health/version endpoint | Unit/smoke test hai app | Thu thập nội dung container, image, process, port |
| 15/10 | Cấu hình Nginx và mạng edge | Kiểm tra route đúng/sai, mã HTTP, access log | Viết phần mạng, HTTP và reverse proxy |
| 16/10 | Thêm health check, restart policy và resource limit | Kiểm tra unhealthy, restart và giới hạn | Viết phần container so với máy ảo |
| 17/10 | Hoàn thiện Compose nền tảng tối thiểu | Chạy T01 và T02 vòng 1 | Cập nhật hướng dẫn cài đặt và Chương 2 |
| 18/10 | Sửa lỗi G1; xác nhận Linux VM | Chạy lại T01/T02; lưu evidence | Rà soát Chương 1–2 và sơ đồ kiến trúc |
| 19/10 | Thiết kế schema SQLite và hợp đồng API | Viết test API và trường hợp lỗi | Viết mô hình dữ liệu và luồng triển khai |
| 20/10 | Xây đăng nhập và session quản trị | Kiểm tra 401/403, cookie và logout | Viết mô hình phân quyền và ranh giới tin cậy |
| 21/10 | Xây Runner với allowlist app/action | Test đầu vào sai, path traversal và action không cho phép | Ghi quyết định về Docker socket và giới hạn bảo mật |
| 22/10 | Hoàn thiện start/stop/restart/status | Test đồng bộ trạng thái và khóa theo app | Viết luồng quản lý vòng đời |
| 23/10 | Hoàn thiện deploy/update App A v1 sang v2 | Chạy T03; đo thời gian và gián đoạn | Viết mô tả cập nhật phiên bản |
| 24/10 | Thêm log, health và CPU/RAM snapshot vào Dashboard | Chạy T04 và các trường hợp lỗi | Cập nhật hướng dẫn vận hành |
| 25/10 | Tích hợp và sửa lỗi MVP | Chạy T03/T04/T07 vòng nghiệm thu | Hoàn thiện bản nháp Chương 3 |
| 26/10 | Thêm API/giao diện đăng ký repository tin cậy và build theo commit SHA | Xác minh đầu vào repository, tag, digest và build log | Viết phần luồng Git của sản phẩm đúng trạng thái |
| 27/10 | Thêm deploy có kiểm soát từ image được phép và lưu lịch sử release | Test build/deploy thất bại, allowlist và che secret | Cập nhật tài liệu release/deploy |
| 28/10 | Tích hợp cAdvisor, Prometheus, Grafana | Xác minh metric target và timestamp | Viết phần giám sát và chỉ số |
| 29/10 | Tạo dashboard CPU/RAM/trạng thái | Chạy T05; chụp và xuất dashboard | Ghi cách đọc và giới hạn của metric |
| 30/10 | Viết kịch bản k6 và chuẩn hóa môi trường đo | Chạy pilot, chọn mức tải an toàn | Viết phương pháp thực nghiệm |
| 31/10 | Ổn định monitoring và ứng dụng dưới tải | Chạy T06 tối thiểu ba lần mỗi cấu hình | Ghi bảng dữ liệu thô, chưa kết luận quá sớm |
| 01/11 | Chuẩn hóa reset/redeploy | Chạy T08 từ môi trường sạch | Viết quy trình khôi phục |
| 02/11 | Sửa toàn bộ lỗi P0 còn lại | Regression test sau sửa lỗi | Cập nhật Chương 4 theo bản chạy thực tế |
| 03/11 | Tạo release candidate đầu tiên | Chạy T01–T08 đầy đủ | Chọn ảnh, log và bảng số liệu chính thức |
| 04/11 | Chỉ sửa lỗi ảnh hưởng nghiệm thu | Lặp lại test bị ảnh hưởng | Hoàn thiện Chương 4 |
| 05/11 | Kiểm tra tài nguyên và cấu hình cuối | Phân tích p95, throughput, error rate, CPU/RAM | Hoàn thiện Chương 5 |
| 06/11 | Kiểm tra bảo mật cấu hình và secret | Chạy security checklist | Hoàn thiện Chương 6, phụ lục và tài liệu tham khảo |
| 07/11 | Feature freeze; tạo release candidate cuối | Smoke test toàn hệ thống | Phản biện chéo báo cáo và README |
| 08/11 | Chỉ sửa lỗi chặn bàn giao | Đối chiếu evidence với báo cáo | Soát giới hạn 12–18 trang, hình, bảng, trích dẫn, nguồn tham khảo và mục sử dụng AI |
| 09/11 | Chuẩn bị môi trường demo và bản offline | Diễn tập demo lỗi và phương án phục hồi | Hoàn thiện slide, video 5–7 phút và 04 phiếu đóng góp cá nhân |
| 10/11 | Đóng gói release cuối | Smoke test cuối; kiểm tra gói bàn giao và dữ liệu đo gốc | Chốt báo cáo, slide, video, phụ lục và phiếu đóng góp |

Nếu ngày bắt đầu hoặc deadline thực tế khác, giữ nguyên thứ tự và tỷ lệ thời gian:

- 7% chốt thiết kế.
- 23% nền tảng và định tuyến.
- 23% control plane.
- 20% CI/CD, giám sát và đo kiểm.
- 17% ổn định và hoàn thiện báo cáo.
- 10% dự phòng, slide và bàn giao.

## 9. Kế hoạch kiểm thử T01–T08

### Quy tắc chung

- Ghi cấu hình CPU, RAM, ổ đĩa, hệ điều hành, Docker, Compose và commit trước khi đo.
- Đồng bộ thời gian hệ thống.
- Mỗi phép đo hiệu năng hoặc phục hồi thực hiện tối thiểu ba lần nếu điều kiện cho phép.
- Không thay đổi code, cấu hình hoặc tài nguyên giữa các lần đo trong cùng một nhóm so sánh.
- Ghi cả kết quả thành công và thất bại.
- Không cắt ảnh hoặc log theo cách che mất điều kiện thử.
- Xóa hoặc che token, mật khẩu và cookie trước khi lưu bằng chứng.
- Không mặc định chụp ảnh hoặc chạy trình duyệt để nghiệm thu giao diện; chỉ thực hiện khi chủ dự án yêu cầu riêng. Với các thay đổi Dashboard, bằng chứng mặc định là typecheck/build, phản hồi API và integration test.
- Mỗi biên bản test phải có: mã test, yêu cầu liên quan, thời gian, môi trường/commit, đầu vào hoặc điều kiện trước, thao tác, kết quả mong đợi, kết quả thực tế, đạt/chưa đạt, người thực hiện và đường dẫn bằng chứng.
- T06 và mọi đánh giá hiệu năng phải giữ file dữ liệu gốc; không chỉ lưu ảnh hoặc số liệu đã chép vào báo cáo.

| Mã | Mục tiêu | Cách thực hiện dự kiến | Tiêu chí chấp nhận | Bằng chứng |
|---|---|---|---|---|
| T01 | Dựng từ máy sạch | Làm đúng README trên VM sạch hoặc snapshot sạch | Không cần bước thủ công ngoài tài liệu; mọi service bắt buộc healthy | Lệnh, thời gian, phiên bản, log Compose, phản hồi HTTP |
| T02 | Triển khai App A và B | Khởi tạo hai app rồi truy cập qua Nginx | Đúng nội dung, version và mã HTTP; app không mở cổng host trực tiếp | curl, access log, inspect network; ảnh chỉ khi được yêu cầu |
| T03 | Cập nhật App A v1 lên v2 | Deploy v1, ghi trạng thái, cập nhật v2, kiểm tra health | Version/digest thay đổi đúng; ghi được thời gian và gián đoạn thực tế | Phản hồi API trước/sau, operation log, digest, timestamp |
| T04 | Dừng/khởi động lại | Stop/restart app, quan sát API và truy cập | Trạng thái phản ánh đúng; log ghi nguyên nhân/kết quả; truy cập phục hồi | Timeline, health, HTTP response, container log |
| T05 | Giám sát tài nguyên | Tạo tải nhẹ và quan sát CPU/RAM | Có metric thật, cùng timestamp và giải thích đúng ý nghĩa | Export Prometheus/Grafana và dữ liệu thô; ảnh chỉ khi được yêu cầu |
| T06 | Kiểm thử tải | Warm-up rồi chạy các mức tải cố định | Có p95, throughput, error rate, CPU/RAM; điều kiện so sánh giữ nguyên | File k6, JSON/CSV, dữ liệu metric và bảng tổng hợp |
| T07 | Truy cập quản trị không hợp lệ | Gọi API không đăng nhập, session sai và action không cho phép | Trả 401/403; không thực thi Docker action; có audit phù hợp | HTTP transcript, API log, operation table |
| T08 | Khôi phục theo tài liệu | Dừng/xóa container có kiểm soát rồi redeploy theo README | Dịch vụ và cấu hình cần thiết được phục hồi; không dùng lệnh phá hủy ngoài phạm vi | Lệnh, thời gian, log, ảnh trước/sau |

### Thiết kế T06

Mức tải ban đầu để chạy pilot:

- Mức 1: 10 virtual users.
- Mức 2: 25 virtual users.
- Mức 3: 50 virtual users.

Mỗi mức gồm:

- Warm-up khoảng 60 giây.
- Khoảng đo ổn định tối thiểu 3 phút.
- Cool-down khoảng 30 giây.
- Lặp lại tối thiểu 3 lần nếu máy không bị quá tải ngoài kiểm soát.

Các mức trên là điểm xuất phát, không phải cam kết hiệu năng. Sau pilot có thể hạ hoặc nâng mức tải, nhưng phải ghi lý do. Không đặt ngưỡng p95 tùy ý trước khi có baseline. Kết luận phải dựa trên phần cứng, loại request, tỷ lệ lỗi và mức sử dụng tài nguyên thực tế.

## 10. Ma trận yêu cầu, triển khai, kiểm thử và bằng chứng

| Mức | Yêu cầu | Thành phần thực hiện | Test | Bằng chứng bắt buộc |
|---|---|---|---|---|
| P0 | Kiến trúc một host | Compose, sơ đồ mạng, tài liệu | Review G0, T01 | Sơ đồ, quyết định kiến trúc, cấu hình |
| P0 | Hai Web App | App A, App B, manifests | T02 | Image/tag, health, ảnh và log |
| P0 | Reverse proxy | Nginx, mạng edge | T02 | Cấu hình, curl, access log |
| P0 | Quản lý vòng đời | API, Runner, operation history | T03, T04 | Audit, timeline, trạng thái |
| P0 | Cập nhật v1 sang v2 | Immutable image tag/digest | T03 | Ảnh trước/sau, digest, thời gian |
| P0 | Dashboard | React/Vite | T03, T04, T05 | Ảnh thao tác, đối chiếu API |
| P0 | Xác thực quản trị | Session, middleware, allowlist | T07 | 401/403, audit và log |
| P0 | Khôi phục | README, Compose, manifest | T01, T08 | Biên bản chạy lại |
| P1 | Triển khai từ Git | Đăng ký repository tin cậy, build theo commit, lưu digest và triển khai có kiểm soát | Kiểm thử pipeline của sản phẩm | Repository/commit, build log, tag/digest, operation và phiên bản quan sát được |
| P1 | Giám sát | cAdvisor, Prometheus, Grafana | T05 | Dữ liệu thô và dashboard |
| P1 | Kiểm thử tải | k6 | T06 | Script, JSON/CSV, bảng và biểu đồ |
| P1 | Xử lý sự cố | Health, restart, log | T04, T08 | Timeline và thời gian phục hồi |
| P2 | Nhiều replica | Nginx/Compose scale | Test nâng cao | So sánh cấu hình và kết quả |
| P2 | Rollback | Deployment history | Test nâng cao | Version/digest trước và sau |
| P2 | Sao lưu dữ liệu | Backup/restore script có kiểm soát | Test nâng cao | File backup, checksum, restore log |

## 11. Kế hoạch viết báo cáo

### 11.1. Nguyên tắc

- Mỗi ngày dành thời gian cập nhật báo cáo hoặc nhật ký kỹ thuật.
- Mọi sơ đồ, bảng và kết luận phải có nguồn hoặc bằng chứng.
- Tính năng đã chạy và đã kiểm thử mới viết ở thì hiện tại.
- Tính năng chưa làm phải dùng các từ dự kiến, đề xuất hoặc hướng phát triển.
- Không chép tài liệu công cụ thành nội dung báo cáo; phải giải thích công cụ phục vụ yêu cầu nào.
- Nội dung chính phải nằm trong 12–18 trang. Mục tiêu biên tập là 14–16 trang để còn biên độ điều chỉnh; cấu hình dài, dữ liệu đo gốc và mã nguồn minh họa chuyển sang phụ lục.
- Lưu nguồn tài liệu ngay khi sử dụng, không bổ sung trích dẫn theo trí nhớ ở cuối dự án.
- Ghi rõ nguồn mã/cấu hình tham khảo và cách sử dụng AI; không ghi AI là tác giả thay cho trách nhiệm kiểm tra, sửa đổi và chạy lại của sinh viên.

Phân bổ trang dự kiến cho nội dung chính:

| Phần | Số trang mục tiêu |
|---|---:|
| Chương 1: yêu cầu, giả định, phạm vi | 1,5–2 |
| Chương 2: cơ sở lý thuyết có chọn lọc | 2–2,5 |
| Chương 3: kiến trúc, mạng, tài nguyên và quyền | 3–3,5 |
| Chương 4: triển khai và sử dụng | 2,5–3 |
| Chương 5: kiểm thử và đánh giá | 3–4 |
| Chương 6: kết luận và giới hạn | 1–1,5 |
| Tài liệu tham khảo | 0,5–1 |

### 11.2. Tiến độ theo chương

| Nội dung | Hạn bản nháp | Hạn hoàn chỉnh | Nguồn đầu vào |
|---|---|---|---|
| Chương 1: Tổng quan, lý do chọn đề tài | 17/10 | 25/10 | AGENTS.md, yêu cầu đề tài, quyết định phạm vi |
| Chương 2: Cơ sở lý thuyết | 18/10 | 28/10 | Tài liệu chính thức về Linux, mạng, Docker, Nginx, PaaS |
| Chương 3: Phân tích yêu cầu và kiến trúc | 25/10 | 02/11 | Sơ đồ, API, mô hình dữ liệu, threat model |
| Chương 4: Triển khai và sử dụng | 31/10 | 04/11 | Mã nguồn, Compose, README, phản hồi API và log triển khai |
| Chương 5: Kiểm thử và đánh giá | 03/11 | 05/11 | T01–T08, k6, Prometheus/Grafana, log |
| Chương 6: Kết luận và hướng phát triển | 05/11 | 06/11 | Kết quả thực tế, giới hạn, P2 |
| Phụ lục | 03/11 | 07/11 | Cấu hình chính, API, dữ liệu đo, tài liệu tham khảo |
| Rà soát toàn văn | 07/11 | 08/11 | Bản báo cáo hợp nhất |

### 11.3. Nội dung bắt buộc của Chương 5

- Môi trường thử nghiệm.
- Phiên bản phần mềm.
- Mục tiêu từng test.
- Dữ liệu đầu vào và điều kiện tải.
- Số lần đo.
- Kết quả thô hoặc liên kết đến phụ lục.
- Bảng tổng hợp.
- Giải thích p95, throughput, error rate, CPU và RAM.
- Đối chiếu kỳ vọng với thực tế.
- Sai số, giới hạn và yếu tố gây nhiễu.
- Kết luận không vượt quá dữ liệu.

### 11.4. Kiểm tra chất lượng báo cáo

Trước ngày 08/11, báo cáo phải qua hai lượt:

1. Rà kỹ thuật: đối chiếu từng mô tả với repository và evidence.
2. Rà trình bày: thuật ngữ, hình, bảng, trích dẫn, chính tả và đánh số.

Người rà kỹ thuật không nên là người viết chính phần đó nếu nhóm có đủ thành viên.

## 12. Kế hoạch slide, demo và video

### Slide

Slide nên tập trung vào:

1. Bài toán và giới hạn.
2. Kiến trúc control plane/data plane.
3. Luồng triển khai.
4. Bảo mật Docker socket.
5. Demo v1 sang v2.
6. Giám sát và xử lý sự cố.
7. Kết quả tải.
8. Giới hạn và hướng phát triển.

Không đưa quá nhiều ảnh giao diện hoặc danh sách công nghệ mà thiếu giải thích.

### Kịch bản demo chính

Video nộp chính thức phải dài 5–7 phút. Kịch bản video mục tiêu khoảng 6 phút:

1. 0:00–0:40 — bài toán, phạm vi và sơ đồ kiến trúc.
2. 0:40–1:20 — Dashboard, hai ứng dụng và đường truy cập qua Gateway.
3. 1:20–3:10 — chọn repository/commit mẫu, build image và triển khai qua Mini PaaS.
4. 3:10–4:15 — cập nhật phiên bản, xem trạng thái, log và metric.
5. 4:15–5:10 — dừng/khôi phục một ứng dụng hoặc minh họa lỗi có kiểm soát.
6. 5:10–5:45 — kết quả kiểm thử tải chính.
7. 5:45–6:15 — giới hạn một host, Docker socket và hướng phát triển.

Demo trực tiếp khi bảo vệ có thể dài hơn nếu giảng viên cho phép, nhưng video nộp vẫn phải nằm trong 5–7 phút.

### Phương án dự phòng

- Video quay trước đúng bản release cuối.
- Ảnh chụp và log cho từng bước.
- Image cần thiết đã có sẵn trên máy demo.
- Bản export Grafana.
- File kết quả k6.
- Lệnh smoke test ngắn.
- Không phụ thuộc Internet cho luồng demo cốt lõi nếu có thể.

## 13. Phân công theo vai trò

Nhóm có 04 thành viên. Chưa có tên và phân công cuối, vì vậy tạm dùng mã TV1–TV4. Mỗi vai trò dưới đây phải kết thúc bằng file kỹ thuật, commit hoặc cấu hình chạy được; chỉ tìm tài liệu không được tính là sản phẩm kỹ thuật riêng.

### Vai trò A — Hạ tầng và orchestration

- Compose, mạng, Nginx.
- Runner và Docker integration.
- CI/CD.
- Linux VM và release.
- Đồng tác giả Chương 2, 3 và 4.

### Vai trò B — Ứng dụng và giao diện

- App A/App B.
- Dashboard và Control API.
- Xác thực, trạng thái, log.
- Integration test.
- Đồng tác giả Chương 3 và 4.

### Vai trò C — Quan sát và kiểm thử tải

- Prometheus, Grafana, cAdvisor.
- k6 và T01–T08.
- Tạo cấu hình monitoring và dữ liệu T05.
- Tạo script k6, dữ liệu đo gốc và bảng T06.

### Vai trò D — QA, bằng chứng và tích hợp hồ sơ

- Tạo/duy trì test runner hoặc script tái lập T01/T08.
- Chuẩn hóa bảng tài nguyên/IP/quyền và bảng kiểm thử.
- Kiểm tra README trên môi trường sạch; ghi lỗi và bản sửa tương ứng.
- Tích hợp hồ sơ, video 5–7 phút và phiếu đóng góp, nhưng vẫn phải có script/cấu hình kỹ thuật riêng.

Tất cả thành viên:

- Review pull request.
- Viết phần báo cáo liên quan đến phần mình làm.
- Tham gia chạy test chính thức.
- Hiểu toàn bộ kiến trúc để bảo vệ.
- Duy trì phiếu đóng góp gồm nhiệm vụ, file/commit, bằng chứng, lỗi đã xử lý và cách chạy lại.

Phân công cuối phải ánh xạ đủ 04 người vào A/B/C/D. Một người có thể hỗ trợ nhiều vai trò, nhưng không được ghi sản phẩm kỹ thuật của cùng một file/commit cho nhiều người nếu không chỉ ra phần đóng góp riêng và bằng chứng review/sửa lỗi.

## 14. Ước lượng công sức

Đây là ước lượng để lập lịch, không phải số liệu đã xác nhận:

| Hạng mục | Ước lượng |
|---|---:|
| Chốt yêu cầu và kiến trúc | 8–12 giờ |
| Compose, mạng, Nginx, hai app | 20–30 giờ |
| Dashboard, API, auth | 30–45 giờ |
| Runner và vòng đời triển khai | 25–40 giờ |
| CI/CD và quản lý phiên bản | 15–25 giờ |
| Monitoring | 15–25 giờ |
| T01–T08 và sửa lỗi | 25–40 giờ |
| Báo cáo và tài liệu | 35–55 giờ |
| Slide, video và diễn tập | 10–18 giờ |
| Tổng dự kiến | 183–290 giờ-người |

Sau ba ngày đầu, nhóm phải thay ước lượng này bằng tốc độ thực tế. Nếu năng lực nhóm thấp hơn khoảng cần thiết, cắt P2 và giảm độ bóng giao diện trước; không cắt kiểm thử, báo cáo hoặc chức năng lõi.

## 15. Nhịp quản lý dự án

### Hằng ngày

- Họp ngắn tối đa 15 phút: đã làm, sẽ làm, trở ngại.
- Cập nhật bảng công việc.
- Ghi quyết định kỹ thuật.
- Đưa evidence vào đúng thư mục ngay sau khi test.
- Cập nhật phần báo cáo liên quan.

### Hai lần mỗi tuần

- Demo bản hiện tại cho toàn nhóm.
- Rà lại đường găng và lỗi chặn.
- Đối chiếu tính năng với test và báo cáo.
- Không nhận tính năng mới nếu lỗi P0 chưa xử lý.

### Cuối mỗi cổng

- Chạy checklist nghiệm thu.
- Chốt commit hoặc tag.
- Lưu log môi trường.
- Cập nhật danh sách giới hạn thực tế.
- Quyết định tiếp tục, sửa hoặc cắt phạm vi.

## 16. Quy tắc Git và kiểm soát thay đổi

- Nhánh chính luôn ở trạng thái có thể dựng lại.
- Thay đổi đi qua nhánh ngắn và pull request nếu quy mô nhóm cho phép.
- Commit nhỏ, mô tả được mục tiêu.
- Không commit secret hoặc file dữ liệu lớn.
- Mỗi thay đổi ảnh hưởng kiến trúc phải cập nhật tài liệu quyết định.
- Image phát hành gắn commit SHA; không dùng latest làm bằng chứng phiên bản.
- Tạo tag tại các cổng G1, G2, G3 và release cuối.
- Sau feature freeze ngày 07/11, chỉ nhận sửa lỗi chặn demo, lỗi bảo mật, sai dữ liệu hoặc sai báo cáo.

## 17. Quản lý minh chứng

Mỗi lần chạy test tạo một thư mục có thời gian và commit, ví dụ:

    evidence/T03/2026-10-23T0900/

Nội dung tối thiểu:

- environment.md: máy, hệ điều hành, CPU/RAM, phiên bản công cụ.
- procedure.md: mục tiêu và bước thực hiện.
- commands.txt: lệnh đã chạy sau khi loại bỏ secret.
- result.json hoặc result.csv nếu có dữ liệu máy đọc.
- screenshots/: ảnh cần thiết.
- logs/: log đã làm sạch.
- conclusion.md: kết quả, sai lệch, giới hạn và kết luận.
- test-record.md hoặc bảng tổng hợp: đầu vào, thao tác, kết quả mong đợi, kết quả thực tế, đạt/chưa đạt, dấu thời gian, người thực hiện và đường dẫn dữ liệu.

Ảnh chụp không thay thế dữ liệu thô. Dữ liệu thô không thay thế phần giải thích.

## 18. Rủi ro và phương án xử lý

| Rủi ro | Mức ảnh hưởng | Dấu hiệu kích hoạt | Phương án |
|---|---|---|---|
| Đề tài chưa được duyệt hoặc bị đổi phạm vi | Rất cao | Có phản hồi mới từ giảng viên | Dừng phần mở rộng; đối chiếu yêu cầu mới; giữ phần tái sử dụng được |
| Không có Linux VM | Cao | Chưa có VM trước 18/10 | Phát triển tạm trên macOS; ưu tiên cấp VM; không chốt số liệu chính thức trên môi trường khác |
| Thiếu nhân lực hoặc thời gian | Rất cao | Trễ cổng quá hai ngày | Cắt P2, giảm UI, giữ P0/P1 cần cho báo cáo và kiểm thử |
| Runner/Docker socket gây rủi ro | Rất cao | API có thể truyền lệnh hoặc mount tùy ý | Allowlist, mạng nội bộ, validation, không công khai Runner, kiểm thử T07 |
| CI/CD phụ thuộc secret hoặc dịch vụ ngoài | Cao | Pipeline không chạy ổn định | Dùng manual approval; chuẩn bị quy trình build/deploy cục bộ có tài liệu |
| Monitoring quá nặng | Trung bình | VM swap hoặc metric làm sai tải | Chạy profile riêng; giảm retention/scrape; ghi overhead |
| Kết quả tải không ổn định | Cao | Sai lệch lớn giữa các lần đo | Kiểm soát môi trường, warm-up, lặp lại, ghi median và phạm vi |
| Cập nhật gây downtime | Trung bình | T03 có request lỗi | Đo và báo cáo trung thực; zero-downtime để P2 |
| Báo cáo bị dồn cuối kỳ | Rất cao | Chương tương ứng trễ hơn ba ngày | Dừng tính năng mới; ưu tiên viết và review theo lịch |
| Demo phụ thuộc Internet | Cao | Image hoặc dashboard không tải được | Pre-pull image, video dự phòng, export metric, demo cục bộ |
| Lộ secret trong log/repository | Rất cao | Scanner hoặc review phát hiện | Thu hồi secret, làm sạch Git phù hợp, cập nhật quy trình |

## 19. Quy tắc cắt phạm vi để chắc chắn kịp hạn

Thứ tự cắt khi chậm tiến độ:

1. Autoscaling, tracing, alerting nâng cao.
2. HTTPS/domain công khai.
3. Backup dữ liệu ứng dụng nâng cao.
4. Nhiều replica và cân bằng tải.
5. Rollback tự động; giữ rollback thủ công có tài liệu nếu đã làm.
6. Giao diện nâng cao, animation và biểu đồ tự xây.
7. Tích hợp Git linh hoạt; giữ một pipeline với repository tin cậy.
8. Grafana tùy biến sâu; giữ metric và dashboard tối thiểu.

Không được cắt:

- Hai ứng dụng mẫu.
- Reverse proxy và mạng hợp lý.
- Quản lý vòng đời cơ bản.
- Update v1 sang v2.
- Xác thực quản trị.
- Health, log và CPU/RAM.
- T01 đến T08.
- README và tài liệu cài đặt.
- Báo cáo, slide và demo.
- Phân tích giới hạn và bảo mật Docker socket.

## 20. Checklist bàn giao cuối cùng

### Mã nguồn và cấu hình

- [ ] Repository có lịch sử rõ ràng.
- [ ] compose.yaml hợp lệ.
- [ ] .env.example đầy đủ nhưng không chứa secret.
- [ ] Image tag/digest truy vết được.
- [ ] Không có cổng nội bộ bị publish ngoài dự kiến.
- [ ] Health check và resource limit tồn tại.
- [ ] Có lệnh start, stop, status và smoke test.

### Kiểm thử và minh chứng

- [ ] T01 đạt.
- [ ] T02 đạt.
- [ ] T03 đạt.
- [ ] T04 đạt.
- [ ] T05 đạt.
- [ ] T06 có dữ liệu và phân tích.
- [ ] T07 đạt.
- [ ] T08 đạt.
- [ ] Evidence không chứa secret.
- [ ] Mọi bảng trong báo cáo có nguồn dữ liệu.

### Báo cáo và tài liệu

- [ ] Nội dung chính nằm trong 12–18 trang; phụ lục tách riêng.
- [ ] Chương 1 hoàn chỉnh.
- [ ] Chương 2 hoàn chỉnh.
- [ ] Chương 3 hoàn chỉnh.
- [ ] Chương 4 hoàn chỉnh.
- [ ] Chương 5 hoàn chỉnh.
- [ ] Chương 6 hoàn chỉnh.
- [ ] Phụ lục và tài liệu tham khảo hoàn chỉnh.
- [ ] Phân biệt rõ đã làm, dự kiến và hướng phát triển.
- [ ] Có sơ đồ kiến trúc, mạng, luồng triển khai và ranh giới bảo mật.
- [ ] Có bảng tài nguyên/IP/quyền phù hợp với hệ thống thực.
- [ ] Có bảng kiểm thử đủ đầu vào, thao tác, kỳ vọng, thực tế, đạt/chưa đạt và bằng chứng có dấu thời gian.
- [ ] Có dữ liệu đo gốc cho phần hiệu năng.
- [ ] Có nguồn mã/cấu hình tham khảo và mục mô tả cách sử dụng AI.
- [ ] README được kiểm chứng bởi người khác.

### Bảo vệ

- [ ] Slide thống nhất với báo cáo.
- [ ] Video nộp dài 5–7 phút.
- [ ] Có 04 phiếu đóng góp cá nhân, mỗi người có sản phẩm kỹ thuật riêng.
- [ ] Có bản export dashboard và dữ liệu tải.
- [ ] Mọi thành viên giải thích được control plane, data plane, Docker, Nginx, health check, restart policy và giới hạn một host.
- [ ] Có câu trả lời trung thực về điểm lỗi đơn, Docker socket, downtime và khả năng mở rộng.

## 21. Việc phải xác nhận ngay trong ngày đầu

1. Giảng viên đã duyệt đề tài hay chưa.
2. Deadline chính xác và định dạng bàn giao.
3. Tên 04 thành viên, thời gian mỗi người có thể dành và ánh xạ vai trò A/B/C/D.
4. Máy Linux/VM, CPU, RAM và dung lượng.
5. Git provider và CI/CD provider được phép dùng.
6. Demo chỉ trong mạng nội bộ hay cần domain/Internet.
7. Mẫu định dạng báo cáo, quy định trích dẫn và quy định slide nếu có; giới hạn nội dung chính đã xác nhận là 12–18 trang.
8. Hai ứng dụng mẫu cuối cùng.

Nếu chưa có câu trả lời ngay, nhóm vẫn bắt đầu G0 và G1 theo giả định trong Mục 2, nhưng không triển khai tính năng P2 hoặc mua dịch vụ.

## 22. Quyết định ưu tiên cuối cùng

Trong một tháng, ưu tiên đúng là:

1. Quy trình chạy thật và dựng lại được.
2. Tính đúng đắn và an toàn cơ bản.
3. Kiểm thử cùng bằng chứng.
4. Báo cáo được viết song song.
5. Demo rõ ràng.
6. Mở rộng nếu còn thời gian.

Sản phẩm đạt yêu cầu không được đánh giá bằng số lượng công nghệ. Kết quả cần chứng minh một quy trình triển khai và quản lý ứng dụng có thể chạy lại, đo được, giải thích được và bảo vệ được bằng dữ liệu thực.
