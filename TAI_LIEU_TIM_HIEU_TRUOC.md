# BỘ TÀI LIỆU TÌM HIỂU TRƯỚC KHI TRIỂN KHAI MINI PAAS

## 1. Mục đích

Tài liệu này dùng để chia việc tìm hiểu cho nhóm bốn người trước khi bắt đầu triển khai P0.1.

Mục tiêu không phải học hết Docker, DevOps hay Cloud. Sau đợt tìm hiểu, cả nhóm phải:

1. Hiểu kiến trúc Mini PaaS một host.
2. Giải thích được luồng request từ người dùng đến Web App.
3. Phân biệt control plane và data plane.
4. Hiểu image, container, network, volume, health check và reverse proxy.
5. Nhận biết rủi ro của Docker socket.
6. Biết cần thu thập bằng chứng gì cho báo cáo.
7. Có đủ kiến thức để thực hiện hoặc kiểm thử phần được giao.

Thời gian đề xuất:

- Phần chung: khoảng 2 giờ mỗi người.
- Phần chuyên trách: khoảng 3 đến 5 giờ mỗi người.
- Chuẩn bị đầu ra: khoảng 1 đến 2 giờ mỗi người.
- Hạn đề xuất: hoàn thành trong 48 giờ, trước khi bắt đầu milestone P0.1.

Ưu tiên tài liệu chính thức. Không dùng video hoặc bài blog không rõ nguồn làm nguồn trích dẫn chính trong báo cáo.

## 2. Cách sử dụng tài liệu

Mỗi thành viên thực hiện ba bước:

1. Đọc Phần 3: kiến thức chung bắt buộc.
2. Đọc gói chuyên trách tương ứng trong Phần 4.
3. Nộp đầu ra theo Phần 5 và trả lời câu hỏi kiểm tra ở Phần 8.

Quy ước mức ưu tiên:

- Bắt buộc: phải đọc trước P0.1.
- Nên đọc: đọc trong tuần đầu.
- Tham khảo: chỉ mở khi triển khai hoặc viết báo cáo liên quan.

## 3. Kiến thức chung bắt buộc cho cả nhóm

### 3.1. Docker: image, container và vòng đời

Nguồn:

- Bắt buộc: [Docker overview](https://docs.docker.com/get-started/docker-overview/)
- Bắt buộc: [Docker Compose Quickstart](https://docs.docker.com/compose/gettingstarted/)
- Nên đọc: [Docker CLI cheat sheet](https://docs.docker.com/get-started/docker_cheatsheet.pdf)

Cần trả lời:

1. Image khác container như thế nào?
2. Vì sao container không phải máy ảo?
3. docker compose up, stop, start, restart và down khác nhau thế nào?
4. Dữ liệu trong writable layer của container có bền vững không?
5. Tại sao không được dùng image tag latest làm bằng chứng phiên bản?

Đầu ra ngắn:

- Một bảng so sánh image, container và VM.
- Một sơ đồ vòng đời container.

### 3.2. Docker Compose: service, network, volume và health check

Nguồn:

- Bắt buộc: [Compose services reference](https://docs.docker.com/reference/compose-file/services/)
- Bắt buộc: [Networking in Compose](https://docs.docker.com/compose/how-tos/networking/)
- Bắt buộc: [Volumes in Compose](https://docs.docker.com/reference/compose-file/volumes/)
- Nên đọc: [Compose deploy specification và resource limits](https://docs.docker.com/reference/compose-file/deploy/)

Cần trả lời:

1. Service name được Docker DNS phân giải như thế nào?
2. ports khác expose như thế nào?
3. Vì sao App A và App B không nên publish cổng trực tiếp?
4. Named volume khác bind mount ở mục đích sử dụng nào?
5. Health check đo điều gì và không đảm bảo điều gì?
6. restart policy có thay thế health check không?
7. CPU, RAM và PID limit giúp gì cho Mini PaaS?

### 3.3. HTTP, TCP/IP, DNS và reverse proxy

Nguồn:

- Bắt buộc: [RFC 9110 – HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html), chỉ cần đọc phần khái niệm client/server, URI, method, status code và header.
- Bắt buộc: [NGINX Web Server và Reverse Proxy](https://docs.nginx.com/nginx/admin-guide/web-server/)
- Nên đọc: [NGINX Admin Guide](https://docs.nginx.com/nginx/admin-guide)
- Tham khảo: [RFC 9293 – TCP](https://www.rfc-editor.org/rfc/rfc9293.html), đọc phần mục đích và khái niệm kết nối.

Cần giải thích được luồng:

    Trình duyệt
        |
        | HTTP request
        v
    Nginx reverse proxy
        |
        | Docker internal network
        v
    App A hoặc App B
        |
        | HTTP response
        v
    Trình duyệt

Câu hỏi:

1. Client, server, port và HTTP request/response là gì?
2. Reverse proxy khác forward proxy như thế nào?
3. Nginx chọn upstream dựa trên path hoặc host ra sao?
4. Mã 200, 400, 401, 403, 404, 502 và 503 có ý nghĩa gì?
5. Vì sao Nginx có thể trả 502 khi container ứng dụng dừng?
6. DNS của Docker khác DNS công cộng ở phạm vi nào?

### 3.4. Kiến trúc Mini PaaS

Tất cả thành viên phải đọc:

- [AGENTS.md](./AGENTS.md)
- [Kế hoạch triển khai một tháng](./KE_HOACH_TRIEN_KHAI_1_THANG.md)

Kiến trúc phải nhớ:

    Control plane
    Dashboard -> Control API -> Deployment Runner -> Docker Engine

    Data plane
    Client -> Nginx -> App A / App B

    Observability
    cAdvisor -> Prometheus -> Grafana

Cần trả lời:

1. Thành phần nào trực tiếp điều khiển Docker?
2. Thành phần nào được publish cổng ra host?
3. SQLite lưu loại dữ liệu nào?
4. Docker Engine là nguồn trạng thái thực tế nghĩa là gì?
5. Vì sao một host không thể được gọi là high availability?

### 3.5. An toàn Docker và API

Nguồn:

- Bắt buộc: [Docker Engine security](https://docs.docker.com/engine/security/)
- Bắt buộc: [Protect the Docker daemon socket](https://docs.docker.com/engine/security/protect-access/)
- Bắt buộc: [OWASP API Security Top 10 2023](https://api-security.owasp.org/editions/2023/en/0x10-api-security-risks/)

Những điều bắt buộc ghi nhớ:

- Người có quyền điều khiển Docker daemon có thể đạt quyền rất cao trên host.
- Không đưa Docker socket hoặc Docker daemon API ra Internet.
- Không cho người dùng truyền tùy ý image, command, mount, host path hoặc file Compose.
- Chỉ cho phép appId, version và action nằm trong danh sách cho phép.
- Không commit password, token, private key hoặc session secret.
- API quản trị phải từ chối yêu cầu không xác thực.
- Container isolation không có nghĩa ứng dụng tùy ý đã an toàn.

## 4. Gói tài liệu theo thành viên

Tên thành viên được thay sau khi nhóm phân công chính thức.

### 4.1. Thành viên 1 — Kiến trúc, API và Deployment Runner

Vai trò dự kiến: người làm lõi kỹ thuật và tích hợp toàn hệ thống.

#### Tài liệu bắt buộc

- [Fastify Getting Started](https://fastify.dev/docs/latest/Guides/Getting-Started/)
- [Fastify Validation and Serialization](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/)
- [SQLite Quickstart](https://www.sqlite.org/quickstart.html)
- [Docker Engine security](https://docs.docker.com/engine/security/)
- [Protect the Docker daemon socket](https://docs.docker.com/engine/security/protect-access/)

#### Chủ đề cần nắm

- Fastify route, plugin, hook, validation, error handling và logging.
- Schema validation cho path, body và response.
- SQLite transaction và quan hệ giữa applications, deployments và operations.
- Operation state: queued, running, succeeded, failed.
- Khóa theo ứng dụng để tránh thao tác đồng thời.
- Allowlist appId, version và action.
- Spawn tiến trình với mảng tham số, không ghép chuỗi shell.
- Phân biệt desired state và actual state.
- Xử lý trường hợp API chạy nhưng Docker daemon không sẵn sàng.

#### Câu hỏi phải trả lời

1. API nào cần cho MVP?
2. Dữ liệu nào lấy từ SQLite, dữ liệu nào lấy từ Docker?
3. Runner phải từ chối những trường đầu vào nào?
4. Nếu deploy đang chạy mà API khởi động lại thì operation có trạng thái gì?
5. Làm sao ngăn hai yêu cầu update cùng một ứng dụng?
6. Vì sao Control API không được mount Docker socket?

#### Đầu ra

- Một sơ đồ sequence cho deploy/update.
- Danh sách endpoint MVP và mã HTTP dự kiến.
- Schema dữ liệu mức bảng.
- Threat model tối thiểu gồm tài sản, tác nhân, bề mặt tấn công và biện pháp.
- Một trang ghi rõ giới hạn bảo mật còn lại.

### 4.2. Thành viên 2 — Dashboard và trải nghiệm quản trị

Vai trò dự kiến: hỗ trợ frontend, giao diện Dashboard và App B.

#### Tài liệu bắt buộc

- [React Quick Start](https://react.dev/learn)
- [Vite Getting Started](https://vite.dev/guide/)
- [React reference](https://react.dev/reference/react)
- [Web Content Accessibility Guidelines Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/)

#### Chủ đề cần nắm

- React component, props, state và event.
- Fetch dữ liệu và xử lý loading, empty, error, success.
- Form đăng nhập và validation cơ bản.
- Bảng danh sách ứng dụng.
- Status badge nhưng không chỉ dùng màu để truyền đạt trạng thái.
- Dialog xác nhận stop, restart và update.
- Hiển thị log dài, overflow và copy.
- Polling trạng thái có giới hạn; tránh gọi API liên tục.
- Disabled state khi operation đang chạy.
- Responsive layout ở màn hình laptop.

#### Các màn hình MVP

1. Login.
2. Applications list.
3. Application details.
4. Operation history.
5. Logs.
6. Update version confirmation.

#### Trạng thái bắt buộc của giao diện

- Loading.
- Không có ứng dụng.
- API mất kết nối.
- Docker daemon không sẵn sàng.
- Ứng dụng stopped.
- Ứng dụng starting.
- Ứng dụng running nhưng unhealthy.
- Ứng dụng healthy.
- Operation failed.
- Người dùng hết phiên đăng nhập.

#### Câu hỏi phải trả lời

1. Làm sao người dùng phân biệt stopped, unhealthy và API unavailable?
2. Nút nào phải bị khóa khi deploy đang chạy?
3. Thao tác nào cần xác nhận?
4. Giao diện hiển thị version tag và digest ở đâu?
5. Khi API trả 401, frontend phải xử lý thế nào?
6. Có cần realtime WebSocket cho MVP không? Vì sao?

#### Đầu ra

- Wireframe sáu màn hình MVP.
- Danh sách component.
- Bảng trạng thái giao diện và cách hiển thị.
- Hợp đồng dữ liệu frontend cần từ API.
- Một bản mock Dashboard dùng dữ liệu giả; chưa cần kết nối Docker.

### 4.3. Thành viên 3 — Linux, Docker, mạng, Nginx và cơ sở lý thuyết

Vai trò dự kiến: tìm hiểu hạ tầng, hỗ trợ cấu hình và chủ trì nội dung Chương 2.

#### Tài liệu bắt buộc

- [Ubuntu Server documentation](https://ubuntu.com/server/docs/)
- [Docker for system administrators trên Ubuntu](https://ubuntu.com/server/docs/how-to/containers/docker-for-system-admins/)
- [Docker Compose Quickstart](https://docs.docker.com/compose/gettingstarted/)
- [Networking in Compose](https://docs.docker.com/compose/how-tos/networking/)
- [NGINX Web Server guide](https://docs.nginx.com/nginx/admin-guide/web-server/)
- [OpenSSH Server trên Ubuntu](https://ubuntu.com/server/docs/openssh-server/)
- [Ubuntu Firewall](https://ubuntu.com/server/docs/firewalls/)

#### Tài liệu tham khảo học thuật

- [RFC 9110 – HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)
- [RFC 9293 – TCP](https://www.rfc-editor.org/rfc/rfc9293.html)

Không cần đọc toàn bộ RFC. Chỉ chọn phần khái niệm cần trích dẫn và giải thích lại bằng tiếng Việt.

#### Chủ đề cần nắm

- Linux process, user, group, file permission, port và service.
- Client–Server, TCP/IP, DNS, HTTP/HTTPS.
- Container so với VM.
- Docker bridge network và embedded DNS.
- Port publishing và attack surface.
- Reverse proxy và upstream.
- Named volume, bind mount và dữ liệu bền vững.
- SSH key và UFW.
- Khác biệt macOS Docker VM với Docker Engine trên Linux.
- Điểm lỗi đơn của một host và một reverse proxy.

#### Câu hỏi phải trả lời

1. Request đi qua những lớp nào từ trình duyệt đến App A?
2. Tại sao container dùng service name thay vì IP cố định?
3. Cổng nào cần mở trên VPS?
4. Cổng nào tuyệt đối không mở công khai?
5. Container và VM khác nhau ở kernel và mức cách ly như thế nào?
6. Vì sao restart policy không phải failover?
7. Vì sao chạy nhiều container trên một VPS không chống được lỗi VPS?

#### Đầu ra

- Bản nháp Chương 2 dài vừa đủ, ưu tiên hiểu đúng hơn số trang.
- Sơ đồ mạng có port, network và thành phần.
- Bảng container so với VM.
- Bảng restart policy, health check, failover và autoscaling.
- Danh sách nguồn chính thức kèm ngày truy cập.
- Checklist cấu hình VPS: user, SSH, firewall, Docker, dung lượng và thời gian hệ thống.

### 4.4. Thành viên 4 — Kiểm thử, giám sát, CI/CD và minh chứng

Vai trò dự kiến: chủ trì T01–T08, evidence và hỗ trợ Chương 5.

#### Tài liệu bắt buộc

- [Prometheus Overview](https://prometheus.io/docs/introduction/overview/)
- [Prometheus Querying Basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [cAdvisor README](https://github.com/google/cadvisor/blob/master/README.md)
- [Monitoring cAdvisor with Prometheus](https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md)
- [Grafana: Create dashboards](https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/create-dashboard/)
- [k6 Metrics](https://grafana.com/docs/k6/latest/using-k6/metrics/)
- [k6 Performance Testing](https://grafana.com/docs/k6/latest/examples/get-started-with-k6/test-for-performance/)
- [GitHub Actions: Publishing Docker images](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images)
- [Secure use of GitHub Actions](https://docs.github.com/en/actions/reference/security/secure-use)

#### Chủ đề cần nắm

- Metric, time series, label và scrape.
- CPU, memory, health và container state.
- Grafana data source, dashboard và panel.
- Virtual user, request rate, throughput và latency.
- p50, p95 và p99.
- Error rate.
- Warm-up, steady state, cool-down và lặp lại phép đo.
- Smoke test, load test và stress test.
- GitHub workflow, job, step, artifact, secret và GITHUB_TOKEN.
- Least privilege cho workflow.
- Mối liên hệ commit SHA, image tag, digest và deployment.

#### Câu hỏi phải trả lời

1. p95 khác average như thế nào?
2. Tại sao phải ghi cả error rate và throughput?
3. Vì sao phải theo dõi máy chạy k6?
4. Dùng CPU/RAM của Mac để so với VPS có hợp lệ không?
5. cAdvisor thu thập gì và Prometheus làm gì với dữ liệu đó?
6. Grafana có phải nơi lưu metric không?
7. Vì sao một test cần lặp lại?
8. GITHUB_TOKEN nên có những quyền tối thiểu nào cho job build?

#### Đầu ra

- Test plan T01–T08.
- Mẫu biên bản kiểm thử.
- Cấu trúc thư mục evidence.
- Danh sách metric và biểu đồ cần cho T05/T06.
- Thiết kế k6 gồm warm-up, mức tải, thời gian và số lần lặp.
- Sơ đồ pipeline commit -> build -> image -> deploy.
- Checklist secret và quyền GitHub Actions.
- Khung Chương 5.

## 5. Đầu ra nhóm cần nộp sau 48 giờ

Mỗi người tạo một tài liệu Markdown, tên dự kiến:

- THANH_VIEN_1_KIEN_TRUC_API.md
- THANH_VIEN_2_DASHBOARD.md
- THANH_VIEN_3_HA_TANG_LY_THUYET.md
- THANH_VIEN_4_KIEM_THU_GIAM_SAT.md

Mỗi tài liệu phải có:

1. Tóm tắt nội dung đã đọc bằng lời của người viết.
2. Câu trả lời cho các câu hỏi được giao.
3. Sơ đồ hoặc bảng theo yêu cầu.
4. Danh sách thuật ngữ.
5. Nguồn chính thức và ngày truy cập.
6. Điều chưa hiểu hoặc cần nhóm quyết định.
7. Phần nội dung có thể đưa vào báo cáo.

Không chép nguyên văn nhiều đoạn từ tài liệu. Mỗi ý phải được hiểu, viết lại và gắn nguồn.

## 6. Bài thực hành nhỏ trước P0.1

Các bài thực hành chỉ chạy trên máy hoặc dịch vụ nhóm được phép sử dụng.

### Lab A — Docker cơ bản

Người thực hiện: thành viên 1 và 3.

Yêu cầu:

- Chạy một container Web đơn giản.
- Xem danh sách container.
- Xem log.
- Inspect network.
- Stop rồi start lại.
- Quan sát sự khác nhau giữa stop và remove.
- Tạo một named volume thử nghiệm và kiểm tra dữ liệu còn sau khi container được tạo lại.

Không dùng docker system prune. Không xóa volume có dữ liệu không thuộc lab.

Đầu ra:

- Danh sách lệnh.
- Giải thích tác dụng từng lệnh.
- Ảnh hoặc log đã loại bỏ thông tin nhạy cảm.

### Lab B — Reverse proxy

Người thực hiện: thành viên 1 và 3.

Yêu cầu:

- Hai HTTP service nội bộ.
- Một Nginx đứng trước.
- Hai path đi đến hai service khác nhau.
- Chỉ Nginx publish cổng ra host.
- Dừng một service và giải thích mã lỗi quan sát được.

Đầu ra:

- Sơ đồ.
- Cấu hình Nginx tối thiểu.
- curl result.
- Giải thích 200 và 502/503 nếu xuất hiện.

Lab này là bài học riêng; cấu hình chính thức của dự án sẽ được tạo trong P0.1.

### Lab C — Dashboard mock

Người thực hiện: thành viên 2.

Yêu cầu:

- Dùng dữ liệu giả cho hai ứng dụng.
- Hiển thị name, version, status và health.
- Có nút deploy, stop, restart và update ở trạng thái phù hợp.
- Có loading, error và empty state.

Đầu ra:

- Wireframe hoặc bản chạy mock.
- Ảnh sáu trạng thái chính.
- Danh sách dữ liệu cần từ API.

### Lab D — Đọc và phân tích kết quả tải

Người thực hiện: thành viên 4.

Yêu cầu:

- Đọc một output mẫu của k6 từ tài liệu chính thức.
- Xác định p95, throughput, error rate và số virtual users.
- Viết một đoạn giải thích vì sao average không đủ.

Không gửi tải đến dịch vụ bên thứ ba ngoài ví dụ hoặc môi trường được cho phép.

## 7. Phần nào dùng cho báo cáo

| Nội dung tìm hiểu | Vị trí dự kiến trong báo cáo |
|---|---|
| Client–Server, TCP/IP, DNS, HTTP | Chương 2 |
| Linux process, port, permission | Chương 2 |
| Container và VM | Chương 2 |
| Docker Compose, network, volume | Chương 2 và 4 |
| Nginx reverse proxy | Chương 2, 3 và 4 |
| PaaS, control plane, data plane | Chương 2 và 3 |
| Kiến trúc và threat model | Chương 3 |
| React/Fastify/SQLite | Chương 3 và 4 |
| CI/CD và image version | Chương 2 và 4 |
| Prometheus/Grafana/cAdvisor | Chương 2, 4 và 5 |
| k6, p95, throughput, error rate | Chương 5 |
| T01–T08 | Chương 5 |
| Điểm lỗi đơn và giới hạn | Chương 5 và 6 |

Khi viết Chương 2, không biến chương thành danh sách định nghĩa công nghệ. Mỗi khái niệm phải liên hệ với một quyết định hoặc bài kiểm thử của Mini PaaS.

## 8. Bộ câu hỏi kiểm tra chung

Mỗi thành viên phải trả lời được bằng lời, không đọc tài liệu:

1. Image và container khác nhau thế nào?
2. Container và VM khác nhau ở điểm cốt lõi nào?
3. Reverse proxy làm gì?
4. Vì sao chỉ Nginx được publish cổng?
5. Docker network giúp các service tìm nhau thế nào?
6. Named volume giải quyết vấn đề gì?
7. Health check khác restart policy thế nào?
8. Control plane và data plane của đề tài gồm những gì?
9. Vì sao Docker socket nguy hiểm?
10. Desired state khác actual state thế nào?
11. Mã 401 và 403 khác nhau thế nào?
12. p95 là gì và vì sao cần đo?
13. Throughput và error rate phản ánh gì?
14. Vì sao phải ghi cấu hình máy khi kiểm thử tải?
15. Vì sao nhiều container trên một VPS vẫn có điểm lỗi đơn?
16. Commit SHA, image tag và image digest liên quan thế nào?
17. Tính năng nào thuộc P0, P1 và P2?
18. Khi nào mới được viết một tính năng ở thì hiện tại trong báo cáo?

## 9. Tiêu chí hoàn thành đợt tìm hiểu

Một thành viên được coi là hoàn thành khi:

- Đã đọc phần chung.
- Có tài liệu chuyên trách.
- Trả lời được câu hỏi của vai trò.
- Có đầu ra cụ thể, không chỉ gửi danh sách link.
- Nguồn có tổ chức phát hành, tiêu đề, URL và ngày truy cập.
- Phân biệt rõ kiến thức từ nguồn với nhận xét của cá nhân.
- Trình bày lại cho nhóm trong 5 đến 10 phút.
- Nêu được ít nhất hai rủi ro hoặc giới hạn liên quan phần mình.

## 10. Cách ghi nguồn cho báo cáo

Mẫu thông tin tối thiểu:

    Tổ chức/tác giả. Tên tài liệu. URL. Ngày truy cập: 11/10/2026.

Ví dụ:

    Docker, Inc. Docker Compose Quickstart.
    https://docs.docker.com/compose/gettingstarted/
    Ngày truy cập: 11/10/2026.

Quy tắc:

- Ưu tiên tài liệu chính thức, RFC và tài liệu dự án.
- Ghi nguồn ngay khi lấy thông tin.
- Trích dẫn gần nội dung được sử dụng.
- Không trích dẫn một nguồn mà thành viên chưa đọc.
- Không dùng bài marketing làm căn cứ cho tuyên bố kỹ thuật.
- Không sao chép nguyên đoạn dài.
- Chưa khóa kiểu trích dẫn cuối cùng cho đến khi biết quy định của giảng viên.

## 11. Danh sách nguồn chính thức tập trung

### Docker và Compose

- [Docker overview](https://docs.docker.com/get-started/docker-overview/)
- [Docker Compose Quickstart](https://docs.docker.com/compose/gettingstarted/)
- [Compose services](https://docs.docker.com/reference/compose-file/services/)
- [Compose networking](https://docs.docker.com/compose/how-tos/networking/)
- [Compose volumes](https://docs.docker.com/reference/compose-file/volumes/)
- [Compose resource constraints](https://docs.docker.com/reference/compose-file/deploy/)
- [Docker Engine security](https://docs.docker.com/engine/security/)
- [Protect Docker daemon socket](https://docs.docker.com/engine/security/protect-access/)
- [Docker multi-platform builds](https://docs.docker.com/build/building/multi-platform/)

### Linux, mạng và Nginx

- [Ubuntu Server documentation](https://ubuntu.com/server/docs/)
- [Docker for Ubuntu system administrators](https://ubuntu.com/server/docs/how-to/containers/docker-for-system-admins/)
- [Ubuntu OpenSSH](https://ubuntu.com/server/docs/openssh-server/)
- [Ubuntu Firewall](https://ubuntu.com/server/docs/firewalls/)
- [NGINX Admin Guide](https://docs.nginx.com/nginx/admin-guide)
- [NGINX Web Server](https://docs.nginx.com/nginx/admin-guide/web-server/)
- [RFC 9110 – HTTP](https://www.rfc-editor.org/rfc/rfc9110.html)
- [RFC 9293 – TCP](https://www.rfc-editor.org/rfc/rfc9293.html)

### Frontend và API

- [React Learn](https://react.dev/learn)
- [React Reference](https://react.dev/reference/react)
- [Vite Guide](https://vite.dev/guide/)
- [Fastify Getting Started](https://fastify.dev/docs/latest/Guides/Getting-Started/)
- [Fastify Validation](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/)
- [SQLite Quickstart](https://www.sqlite.org/quickstart.html)
- [OWASP API Security Top 10 2023](https://api-security.owasp.org/editions/2023/en/0x10-api-security-risks/)

### Monitoring và kiểm thử

- [Prometheus Overview](https://prometheus.io/docs/introduction/overview/)
- [Prometheus Querying Basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [cAdvisor README](https://github.com/google/cadvisor/blob/master/README.md)
- [cAdvisor Prometheus metrics](https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md)
- [Grafana dashboards](https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/create-dashboard/)
- [k6 Metrics](https://grafana.com/docs/k6/latest/using-k6/metrics/)
- [k6 Performance Testing](https://grafana.com/docs/k6/latest/examples/get-started-with-k6/test-for-performance/)

### GitHub Actions

- [Publishing Docker images](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images)
- [GITHUB_TOKEN](https://docs.github.com/en/actions/concepts/security/github_token)
- [Use GITHUB_TOKEN securely](https://docs.github.com/en/actions/tutorials/authenticate-with-github_token)
- [GitHub Actions secure use](https://docs.github.com/en/actions/reference/security/secure-use)

## 12. Những chủ đề chưa cần học lúc này

Không dành thời gian trong hai ngày đầu cho:

- Kubernetes.
- Terraform.
- Ansible nâng cao.
- Service mesh.
- Distributed tracing.
- Message queue.
- GitOps.
- Multi-cloud.
- Autoscaling phức tạp.
- Database cluster.
- Multi-tenant PaaS.
- Tự viết container runtime.

Các chủ đề này không giúp hoàn thành P0.1 và có nguy cơ làm trễ sản phẩm, kiểm thử và báo cáo.

## 13. Kết quả mong đợi sau buổi chia sẻ

Sau khi bốn thành viên trình bày, nhóm phải chốt được:

1. Sơ đồ kiến trúc P0.
2. Hai ứng dụng mẫu.
3. Danh sách endpoint MVP.
4. Wireframe Dashboard.
5. Sơ đồ mạng và cổng.
6. Test plan T01–T08.
7. Cấu trúc Chương 2, 3 và 5.
8. Danh sách rủi ro và giới hạn.
9. Phân công triển khai P0.1.

Chỉ sau khi các mục trên đủ rõ, nhóm bắt đầu tạo mã nguồn chính thức.
