# AGENTS.md — Bối cảnh và hướng dẫn làm bài tập lớn Mini PaaS

> **Mục đích:** Đây là tài liệu bàn giao bối cảnh từ cuộc trao đổi với ChatGPT sang Codex. Đọc tài liệu này trước khi nghiên cứu, đề xuất kiến trúc, tạo mã nguồn hoặc viết báo cáo.
>
> **Ngôn ngữ làm việc:** Tiếng Việt; giải thích dễ hiểu, chính xác về kỹ thuật. Dùng thuật ngữ tiếng Anh khi thực sự cần và giải thích ở lần xuất hiện đầu tiên.
>
> **Tình trạng:** Nhóm đã **chốt hướng đề xuất Mini PaaS**; đã soạn báo cáo **đề xuất đề tài** để gửi giảng viên. **Chưa có thông tin xác nhận giảng viên đã phê duyệt.** Repository đã có P0.1–P0.2C, CI nội bộ, lát cắt Git → build → image → deploy cho App A và Web Service động từ repository GitHub công khai thuộc owner tin cậy, giám sát Runner exporter → Prometheus → Grafana, Dashboard tách góc nhìn toàn hệ thống/chi tiết từng ứng dụng, quản lý biến môi trường có mã hóa/che secret và lịch sử release/rollback theo image ID cục bộ. Ngày 14/10/2026, stack 8 service đã được dựng lại trên VPS Debian 12; `make smoke`, `make test`, triển khai commit mới nhất và ba vòng T06 10/25/50 req/s đều đạt. Ngày 15/10/2026, Cloudflare Tunnel đã đưa Gateway loopback ra Internet tại `https://paas.ai2p.id.vn`; kiểm tra HTTPS, xác thực/session từ máy ngoài và P0.2 qua URL public đều đạt. Cùng ngày, Web Service động `vps-demo` đã được build, chạy, kiểm tra health và restart thành công trên VPS; URL nội bộ theo hostname đạt, còn truy cập Internet qua `https://vps-demo.ai2p.id.vn` đang chờ route/DNS wildcard `*.ai2p.id.vn` trên Cloudflare. Hệ thống chưa tự deploy bằng webhook, chưa nhận repository ngoài owner allowlist và chưa có registry digest. Trạng thái chi tiết phải đối chiếu mã nguồn, README, nhật ký và evidence.

## Quy tắc kiểm tra giao diện — áp dụng cho toàn dự án

> Theo quyết định mới nhất của chủ dự án ngày 12/10/2026, quy tắc này thay thế ngoại lệ tạm thời từng dùng ở P0.2B và áp dụng cho mọi mốc tiếp theo.

- Không chủ động chạy kiểm tra responsive, kiểm tra trực quan bằng trình duyệt, Playwright/CUA hoặc chụp ảnh giao diện, trừ khi chủ dự án yêu cầu riêng.
- Khi thay đổi Dashboard vẫn phải chạy typecheck/production build và kiểm thử API, unit, integration liên quan; không được coi việc bỏ kiểm tra trình duyệt là bỏ kiểm thử chức năng.
- Không tuyên bố một thay đổi giao diện mới đã được xác minh responsive nếu chưa có lần kiểm tra riêng. Các kết quả responsive của P0.2A/P0.2C chỉ là bằng chứng lịch sử cho đúng phiên bản đã kiểm tra khi đó.
- Khi viết kế hoạch, bằng chứng và báo cáo, ảnh giao diện chỉ là tùy chọn; ưu tiên log, phản hồi API, kết quả build và dữ liệu kiểm thử để giảm chi phí thực hiện.

## Yêu cầu hồ sơ nộp chính thức — bổ sung ngày 12/10/2026

Các yêu cầu dưới đây là chỉ đạo mới nhất của giảng viên và được ưu tiên hơn các giả định cũ trong repository:

- Báo cáo có **12–18 trang nội dung chính**, gồm yêu cầu, giả định, kiến trúc, triển khai, kiểm thử, đánh giá và tài liệu tham khảo. Phụ lục cấu hình không tính vào giới hạn trang.
- Hồ sơ có sơ đồ hệ thống, bảng tài nguyên/IP/quyền phù hợp đề tài, cấu hình/script/mã nguồn cần thiết và README ghi phiên bản, cách dựng lại, cách chạy kiểm thử. File `.pkt` chỉ cần khi mô hình Packet Tracer phù hợp; Mini PaaS ưu tiên sơ đồ hệ thống, mạng Docker, cổng, DNS và ranh giới quyền đúng với hệ thống thực.
- Bảng kiểm thử phải ghi đầu vào, thao tác, kết quả mong đợi, kết quả thực tế, đạt/chưa đạt và đường dẫn bằng chứng có dấu thời gian. Nếu đánh giá hiệu năng phải nộp dữ liệu đo gốc.
- Video demo dài **5–7 phút**. Mỗi thành viên có phiếu đóng góp cá nhân ghi nhiệm vụ, file tạo ra, bằng chứng và lỗi đã xử lý; mỗi thành viên bắt buộc có ít nhất một sản phẩm kỹ thuật riêng có thể giải thích và chạy lại.
- Chỉ dùng dữ liệu giả và môi trường được phép. Không bắt buộc mua thiết bị, thuê Cloud hoặc xây ứng dụng nghiệp vụ hoàn chỉnh. Báo cáo phải nêu nguồn mã/cấu hình tham khảo, cách sử dụng AI và trách nhiệm của sinh viên trong việc giải thích, chỉnh sửa, kiểm thử và chạy lại sản phẩm.

---

## 1. Bối cảnh học phần

- **Học phần:** Nhập môn công nghệ nền tảng (PTIT).
- **Hình thức công việc:** Bài tập lớn cuối kỳ theo nhóm, gồm sản phẩm kỹ thuật, báo cáo và bảo vệ/thuyết trình.
- **Thông tin từ sinh viên về giảng viên:** Thầy khuyến khích nhóm đầu tư làm càng nhiều và càng đầy đủ càng tốt, gồm **báo cáo, sản phẩm và các thành phần minh chứng**. Đây là định hướng được sinh viên thuật lại, **không phải thang điểm/chỉ tiêu chính thức**.
- **Mục tiêu của nhóm:** Đầu tư một bài chất lượng cao nhằm tối đa hóa kết quả học tập/điểm số; ưu tiên sản phẩm hoạt động thật, demo thuyết phục, thiết kế rõ ràng, thực nghiệm có số liệu, tài liệu chỉn chu.
- **Điều kiện:** Nhóm **không làm phần cứng**, không cần mua thiết bị IoT. Ưu tiên mô hình phần mềm có thể chạy trên máy tính cá nhân hoặc máy chủ ảo, sử dụng công cụ mã nguồn mở/chi phí thấp.
- **Năng lực đã biết của một thành viên:** Có kinh nghiệm thực tế với React Native, JavaScript/TypeScript, tích hợp API, Git, gỡ lỗi ứng dụng Android/iOS và luồng build/phát hành ứng dụng. **Chưa xác nhận** kinh nghiệm Linux server, Docker, Nginx, CI/CD hạ tầng, Prometheus/Grafana của cả nhóm; không được mặc định các mảng đó đã thành thạo.
- **Quy mô nhóm:** 04 thành viên. Một thành viên dự kiến thực hiện phần lớn sản phẩm; các thành viên còn lại hỗ trợ tìm hiểu tài liệu và một số phần giao diện. Do yêu cầu mới bắt buộc mỗi thành viên có sản phẩm kỹ thuật riêng, phân công cuối phải bổ sung đầu ra kỹ thuật, file và kiểm thử cụ thể cho cả bốn người.
- **Các thông tin chưa biết:** Thời hạn nộp chính thức, tài nguyên VPS, mẫu định dạng báo cáo/trích dẫn, mức độ chấp thuận đề tài và danh sách công nghệ bắt buộc. Hỏi khi chúng thực sự ảnh hưởng đến quyết định triển khai.

### Trọng tâm học thuật cần luôn thể hiện

Đây là môn **Nhập môn công nghệ nền tảng**, không phải chỉ là môn lập trình Website. Sản phẩm và báo cáo cần chứng minh hiểu biết về:

1. Phần cứng, hệ điều hành, tiến trình và quản lý tài nguyên CPU/RAM/ổ đĩa.
2. Mạng máy tính, Client–Server, TCP/IP, DNS, HTTP/HTTPS, cổng mạng, định tuyến, reverse proxy.
3. Máy chủ, triển khai dịch vụ, container và phân biệt container với máy ảo.
4. Lưu trữ dữ liệu, cấu hình, sao lưu/khôi phục khi có triển khai.
5. Bảo mật cơ bản, xác thực, phân quyền, cách ly dịch vụ và quản lý bí mật.
6. Giám sát, nhật ký, kiểm thử, xử lý lỗi, giới hạn và khả năng mở rộng của mô hình.

Lập trình giao diện đẹp chỉ là một phần; **kiến trúc, vận hành, kiểm thử, phân tích và minh chứng kỹ thuật** mới là phần tạo giá trị cho học phần.

---

## 2. Đề tài đã chốt để đề xuất

**Tên đề tài chính thức đang sử dụng trong bản báo cáo đề xuất:**

> **Nghiên cứu, thiết kế và xây dựng nền tảng triển khai, quản lý ứng dụng Web tự động trên hạ tầng Container (Mini PaaS).**

**Ý tưởng cốt lõi:** Tạo một nền tảng PaaS quy mô thực hành, cho phép đưa các ứng dụng Web mẫu từ mã nguồn/cấu hình vào môi trường container, quản lý vòng đời triển khai, định tuyến truy cập, xem trạng thái, theo dõi tài nguyên và thử nghiệm sự cố.

**Điểm khác biệt mong muốn:** Không chỉ dựng một Web Server, một máy ảo hoặc một màn hình giám sát riêng lẻ. Mini PaaS kết nối các thành phần thành một **quy trình quản lý vòng đời ứng dụng**, từ triển khai mới → truy cập → cập nhật → theo dõi → xử lý vấn đề.

### Lý do chọn hướng này

- Có thể làm bằng phần mềm, không cần thiết bị vật lý chuyên dụng.
- Tận dụng kỹ năng lập trình hiện có để tự xây một phần hệ thống quản trị, đồng thời học thêm mạng/máy chủ/container/DevOps.
- Có thể tạo demo trực tiếp và kiểm chứng bằng kết quả thực nghiệm.
- Có thể mở rộng theo từng mức, tránh phụ thuộc một chức năng quá khó.
- Có nhiều nội dung để viết báo cáo một cách thực chất.

### Phân biệt với các đề trong danh sách gốc của giảng viên

Danh sách gốc có 24 đề, gồm các chủ đề gần như: thiết kế hạ tầng CNTT, triển khai Website, máy chủ ảo, chuyển đổi Cloud, giám sát và xử lý sự cố, tối ưu hiệu năng. Những đề có khả năng giao thoa với Mini PaaS gồm:

- **05:** Phân tích và triển khai hệ thống Website cho trường học.
- **07:** Thiết kế hạ tầng CNTT cho hệ thống thương mại điện tử.
- **09:** Xây dựng môi trường máy chủ ảo cho doanh nghiệp.
- **11:** Thiết kế hệ thống cung cấp dịch vụ Web trên nền tảng ảo hóa.
- **17:** Giám sát và xử lý sự cố hạ tầng CNTT.
- **19:** Thiết kế giải pháp duy trì hoạt động của hệ thống CNTT khi xảy ra sự cố.
- **20:** Thiết kế hệ thống giám sát và tối ưu hiệu năng máy chủ.

**Khi viết đề cương phải làm rõ:** Mini PaaS lấy **tự động hóa triển khai và quản lý vòng đời nhiều ứng dụng** làm chức năng trung tâm; mạng, container, giám sát, kiểm thử là các cấu phần hỗ trợ. Không tuyên bố đề tài hoàn toàn không liên quan tới các đề cũ.

---

## 3. Phạm vi đã nêu trong báo cáo đề xuất gửi thầy

Đây là các nội dung lấy từ bản báo cáo đề xuất Mini PaaS đã soạn; phân biệt với các ý tưởng mở rộng về sau.

### Mục tiêu

1. Thiết kế nền tảng quản lý, triển khai và cập nhật một số ứng dụng Web minh họa theo quy trình thống nhất.
2. Tổ chức ứng dụng trong container; cấu hình mạng nội bộ, reverse proxy, đường dẫn truy cập, quản lý tài nguyên và trạng thái dịch vụ.
3. Theo dõi nhật ký hoạt động, CPU/RAM và trạng thái; kiểm thử triển khai, cập nhật, dừng/khởi động lại, tăng tải và xử lý sự cố cơ bản.

### Giải pháp dự kiến (chưa phải quyết định bất biến)

- **Docker / Docker Compose:** Môi trường container và quản lý các dịch vụ.
- **Nginx hoặc tương đương:** Reverse proxy và định tuyến ứng dụng; cân bằng tải nếu làm nhiều bản sao.
- **Giao diện quản trị đơn giản:** Danh sách ứng dụng, trạng thái, phiên bản, thao tác cơ bản.
- **CI/CD phù hợp:** Tự động hóa bước xây dựng và triển khai từ kho mã nguồn ở mức khả thi.
- **Prometheus/Grafana hoặc tương đương:** Giám sát; có cơ chế xem/truy xuất log.
- **Các ứng dụng Web mẫu:** Phục vụ chứng minh quy trình triển khai, nâng cấp và vận hành.

Không khóa sớm React/NestJS/PostgreSQL, nhà cung cấp Git hoặc công nghệ lưu trữ cụ thể nếu chưa phân tích nhu cầu; có thể đề xuất stack tối giản hơn nếu tốt hơn.

### Sản phẩm đã cam kết ở mức đề xuất

- Mô hình **Mini PaaS chạy được**.
- Triển khai **tối thiểu 02 ứng dụng Web mẫu**.
- Có **định tuyến, cập nhật phiên bản, theo dõi trạng thái**.
- Có **giao diện quản trị hoặc bảng điều khiển vận hành**.
- Có **mã nguồn/cấu hình/hướng dẫn cài đặt**.
- Có **kiểm thử triển khai, cập nhật, dừng/khởi động lại, giám sát tài nguyên và đo tải cơ bản**.
- Có **báo cáo, tài liệu kỹ thuật, slide và demo/video**.

### Ranh giới bắt buộc phải trung thực

- Mô hình thử nghiệm trên **một máy hoặc máy chủ ảo** là đủ cho phạm vi đề xuất, nếu tài nguyên nhóm không cho phép hơn.
- Đây **không phải nền tảng PaaS thương mại**, không cam kết độ sẵn sàng, SLA, bảo mật, đa thuê hoặc khả năng mở rộng như Cloud lớn.
- Chạy nhiều container trên **cùng một máy vật lý không bảo vệ được khi máy vật lý đó hỏng**.
- Container tự khởi động lại không đồng nghĩa ứng dụng chắc chắn khỏe; cần định nghĩa health check phù hợp.
- CI/CD, cân bằng tải, failover hay autoscaling phải được mô tả đúng mức đã triển khai, không dùng từ "tự động" nếu còn phải thao tác thủ công.

---

## 4. Cách hiểu sản phẩm mong muốn

Hình dung trải nghiệm demo ở mức hoàn thiện:

1. Người quản trị mở Dashboard của Mini PaaS.
2. Tạo ứng dụng mẫu mới từ cấu hình hoặc repository Git đã cho phép.
3. Hệ thống tạo/build/chạy container và đưa ra địa chỉ truy cập.
4. Người dùng truy cập ứng dụng qua reverse proxy.
5. Thay đổi phiên bản mã nguồn/cấu hình và kích hoạt quy trình cập nhật.
6. Quan sát ứng dụng đã được cập nhật, trạng thái, log và chỉ số tài nguyên.
7. Dừng một instance/dịch vụ, quan sát diễn biến và khôi phục.
8. Tạo tải thử nghiệm, xem số liệu và phân tích nút thắt, tỷ lệ lỗi, giới hạn hệ thống.

**Lưu ý:** Đây là *kịch bản đích*, không khẳng định đã có tính năng; từng bước phải đi qua thiết kế, kiểm thử và xác nhận kết quả.

### Sơ đồ kiến trúc tham khảo, chưa chốt

```text
                      NGƯỜI DÙNG / QUẢN TRỊ
                               |
                +--------------+--------------+
                |                             |
          Mini PaaS Dashboard           Client truy cập Web
                |                             |
          Control API                  Reverse Proxy
                |                             |
                v                    +--------+--------+
      Deployment Orchestrator         |                 |
                |                  Web App A          Web App B
           Docker Engine                (containers)
                |
         Trạng thái / Log / Metrics --> Hệ thống giám sát
                |
           (CI/CD / Git integration nếu triển khai)
```

Kiến trúc chi tiết cần phân tách **control plane** (quản trị/triển khai) và **data plane** (lưu lượng tới ứng dụng); xác định đúng các thành phần trực tiếp điều khiển container, luồng sự kiện và quyền truy cập. Sơ đồ trên chỉ để giao tiếp ý tưởng, không phải chỉ dẫn kết nối bảo mật cuối cùng.

---

## 5. Phạm vi thực hiện theo mức ưu tiên

### P0 — Lõi bắt buộc, làm xong trước mọi mở rộng

- [ ] Thiết kế kiến trúc cơ bản và sơ đồ mạng/luồng truy cập.
- [ ] Chuẩn hóa cách dựng môi trường bằng Docker Compose.
- [ ] Triển khai thành công **ít nhất 2 Web App mẫu** qua một địa chỉ/đường dẫn rõ ràng.
- [ ] Reverse proxy định tuyến đúng; tách mạng/dịch vụ hợp lý.
- [ ] Xem trạng thái, khởi động/dừng/khởi động lại ứng dụng theo cách có kiểm soát.
- [ ] Cập nhật một ứng dụng từ phiên bản v1 sang v2, ghi nhận kết quả.
- [ ] Có giao diện hoặc bảng điều khiển tối thiểu.
- [ ] Có hướng dẫn cài đặt lại từ môi trường sạch và bộ thử nghiệm cơ bản.

### P1 — Nâng chất lượng và chiều sâu học thuật

- [ ] Tích hợp một luồng CI/CD triển khai dựa trên Git, với phương án xác thực thích hợp.
- [ ] Dashboard hiển thị trạng thái, phiên bản, log, CPU/RAM; có thể dùng Grafana cho đồ thị.
- [ ] Kiểm thử tải bằng k6/Locust hoặc tương đương; đo thời gian phản hồi (đặc biệt p95), thông lượng, tỷ lệ lỗi và tài nguyên.
- [ ] Thử nghiệm dừng ứng dụng/container; ghi nhận thời gian phục hồi và giới hạn chịu lỗi thực tế.
- [ ] Phân quyền tối thiểu cho thao tác quản trị, quản lý secrets cơ bản.
- [ ] Báo cáo có kết quả đo, ảnh chụp, nhật ký kiểm thử và giải thích kết quả.

### P2 — Phần mở rộng *chỉ làm sau khi P0/P1 ổn định*

- [ ] Cân bằng tải giữa nhiều bản sao ứng dụng và so sánh các cấu hình/thuật toán phù hợp.
- [ ] Theo dõi nhiều lần triển khai, lịch sử phiên bản, rollback có kiểm chứng.
- [ ] Sao lưu/phục hồi cấu hình hoặc dữ liệu ứng dụng mẫu.
- [ ] HTTPS trên môi trường thích hợp, quản lý domain/tên miền thử nghiệm.
- [ ] Mở rộng/thu hẹp bản sao ứng dụng có điều kiện và đo hiệu quả.
- [ ] Tăng khả năng quan sát qua tracing/alerting hoặc trải nghiệm Dashboard sâu hơn.

**Quy tắc:** Không hy sinh độ ổn định của P0 để thêm tính năng P2. Việc "làm càng nhiều càng tốt" phải là **nhiều giá trị kiểm chứng được**, không phải nhiều màn hình hoặc chức năng trình diễn giả.

---

## 6. Các tình huống kiểm thử bắt buộc nên chuẩn bị

Mỗi tình huống cần ghi: mục tiêu, cách tạo dữ liệu/điều kiện thử, số lần đo, chỉ số, kết quả thực tế, ảnh/log minh chứng và kết luận. Không bịa số liệu.

| Mã | Tình huống | Dấu hiệu hoàn thành |
|---|---|---|
| T01 | Khởi tạo nền tảng từ máy sạch | Làm theo README có thể dựng lại ứng dụng và truy cập được |
| T02 | Triển khai Web App A và B | Truy cập đúng từng ứng dụng qua một reverse proxy |
| T03 | Đưa App A từ v1 sang v2 | Phiên bản mới hiển thị đúng; ghi nhận thời gian/gián đoạn nếu có |
| T04 | Dừng / khởi động lại một ứng dụng | Trạng thái/log phản ánh đúng diễn biến và kết quả truy cập |
| T05 | Giám sát tài nguyên | Có số liệu CPU/RAM và giải thích chúng phản ánh điều gì |
| T06 | Kiểm thử tải ở các mức cố định | Bảng kết quả p95/thông lượng/tỷ lệ lỗi, cùng điều kiện so sánh |
| T07 | Thử truy cập quản trị không hợp lệ | Tác vụ nhạy cảm bị từ chối; không công khai API điều khiển Docker |
| T08 | Khôi phục theo tài liệu | Quy trình tái triển khai/khôi phục được kiểm chứng |

Thử nghiệm nâng cao (nếu làm P2): một instance Web ngừng hoạt động trong cụm có cân bằng tải, rollback, sao lưu/khôi phục dữ liệu, scale replicas. Phân tích điểm lỗi đơn tại reverse proxy hoặc máy vật lý thay vì tuyên bố "high availability" tuyệt đối.

---

## 7. Yêu cầu báo cáo, sản phẩm bàn giao và bảo vệ

Sản phẩm cuối kỳ mong muốn bao gồm:

1. **Mã nguồn và cấu hình:** Các thành phần nhóm tự phát triển; file Compose, cấu hình reverse proxy, script và công cụ cần thiết.
2. **Ứng dụng mẫu và giao diện quản trị:** Bản chạy thật có thể tái hiện demo.
3. **README và tài liệu cài đặt:** Yêu cầu môi trường, biến môi trường mẫu, thứ tự chạy, lệnh khởi động/dừng, xử lý lỗi thường gặp.
4. **Tài liệu kiến trúc:** Sơ đồ thành phần, luồng HTTP, mạng và phân quyền, giải thích lý do chọn công nghệ.
5. **Kế hoạch và kết quả kiểm thử:** Kịch bản, bảng số liệu thực tế, log/screenshot, đối chiếu kỳ vọng–thực tế, điểm hạn chế.
6. **Báo cáo cuối kỳ:** Bài toán, tổng quan kiến thức nền tảng, phân tích yêu cầu, thiết kế, triển khai, thực nghiệm, nhận xét, kết luận, hướng phát triển.
7. **Video demo 5–7 phút và slide:** Diễn giải trọng tâm, có một kịch bản triển khai hoặc xử lý sự cố trực quan.
8. **Phiếu đóng góp cá nhân:** Đủ 04 thành viên; ghi nhiệm vụ, file tạo ra, bằng chứng, lỗi đã xử lý và sản phẩm kỹ thuật riêng.
9. **Nguồn tham khảo và sử dụng AI:** Ghi nguồn mã/cấu hình tham khảo, phạm vi AI hỗ trợ và phần sinh viên đã kiểm tra, sửa đổi, chạy lại.

Báo cáo phải giữ phần nội dung chính trong **12–18 trang**; cấu hình dài, dữ liệu đo gốc và trích đoạn mã nên chuyển sang phụ lục để không làm loãng nội dung. Chưa có mẫu trình bày/trích dẫn hoặc thang điểm chi tiết. Văn phong tài liệu gửi giảng viên nên **trang trọng, dễ đọc, thiên hướng hành chính Việt Nam, không màu mè, hạn chế tiếng Anh không cần thiết**.

### Gợi ý bố cục báo cáo cuối kỳ

- Chương 1: Tổng quan và lý do chọn đề tài.
- Chương 2: Cơ sở lý thuyết (mạng, Linux/hệ điều hành, Docker, Web Server, PaaS, CI/CD, giám sát).
- Chương 3: Phân tích yêu cầu và thiết kế kiến trúc.
- Chương 4: Triển khai và hướng dẫn sử dụng.
- Chương 5: Kiểm thử, kết quả thực nghiệm và đánh giá.
- Chương 6: Kết luận, giới hạn và định hướng phát triển.
- Phụ lục: Mã nguồn quan trọng, cấu hình, sơ đồ, dữ liệu đo, tài liệu tham khảo.

---

## 8. Quy tắc an toàn và chất lượng kỹ thuật

- Chạy demo trên máy/lab và môi trường được phép; ưu tiên nội bộ, không yêu cầu dịch vụ trả phí nếu chưa thống nhất.
- **Không phơi bày Docker socket / Docker daemon API ra Internet**. Quyền điều khiển Docker có mức rủi ro rất cao; chỉ dùng cơ chế điều khiển hạn chế quyền trong môi trường thử nghiệm. Không chạy mã nguồn Git không tin cậy trực tiếp trên host.
- Không commit token, mật khẩu, SSH key, khóa CI/CD hoặc bí mật vào repository; dùng `.env.example`, biến môi trường, phân quyền phù hợp.
- Không thiết kế hệ thống chạy mã tùy ý từ người dùng bên ngoài khi chưa có sandbox, giới hạn tài nguyên, cách ly và kiểm soát truy cập phù hợp. Có thể giới hạn dự án ở các app mẫu được tin cậy.
- Không tự động xóa dữ liệu, `docker system prune`, xóa volumes, ghi đè cấu hình hoặc chạy lệnh phá hủy nếu chưa được chủ dự án xác nhận.
- Phân biệt `restart policy`, health check, kiểm tra lỗi thụ động, failover, autoscaling; không nói chúng tương đương.
- Đo tải có giới hạn trên tài nguyên kiểm thử được phép; không gửi tải lên dịch vụ của bên thứ ba khi chưa được cho phép.
- Luôn có lệnh khởi động, lệnh thử nhanh, cách reset an toàn, cách thu thập minh chứng, và tiêu chí chấp nhận rõ ràng.

---

## 9. Hướng dẫn Codex bắt đầu làm việc

### Khi lần đầu được mở trong repository

1. Đọc kỹ tệp `AGENTS.md` này.
2. Khảo sát cấu trúc repository và tệp có sẵn **trước khi tạo code**; không được mặc định repo trống. Nếu đang có mã nguồn, tóm tắt hiện trạng, những gì chạy được, những gì chưa rõ và các rủi ro tương thích.
3. Trình bày **MVP tối thiểu** của Mini PaaS, kiến trúc 1 máy, danh sách thành phần và luồng triển khai. Nêu rõ vì sao mỗi thành phần có mặt.
4. Lập bảng **requirement → implementation → test → bằng chứng**; phân loại P0, P1, P2 như trong tài liệu.
5. Ước lượng phụ thuộc, tài nguyên tối thiểu, thời gian và rủi ro theo quy mô nhóm thực tế. Không đoán số tuần/thành viên như sự thật.
6. Hỏi tối đa vài thông tin còn thiếu ảnh hưởng lớn nhất (VD: đã được duyệt chưa, deadline, OS/tài nguyên máy, nhóm bao nhiêu người, có repository nào chưa). Nếu có thể triển khai an toàn khi thiếu thông tin, nêu giả định và đề xuất phương án.
7. **Đề xuất bước thực hiện nhỏ nhất** có thể chạy, thử và chứng minh. Không tự tạo quá nhiều service hoặc kiến trúc microservices chỉ để trông phức tạp.
8. Chỉ chỉnh sửa mã hoặc thêm file khi có yêu cầu triển khai cụ thể. Nếu người dùng bảo "bắt đầu làm", chọn một milestone P0 nhỏ, triển khai trọn vẹn, chạy test rồi báo kết quả.

### Trong quá trình làm

- Mỗi lần thay đổi phải nêu: **mục tiêu, file liên quan, cách chạy/kiểm thử, kết quả thực, việc còn thiếu**.
- Thích giải pháp ít phụ thuộc, dễ cài lại và kiểm tra được. Có thể tận dụng công cụ sẵn có thay vì viết lại cả hệ thống.
- Không tuyên bố đã đạt điều kiện nào nếu chưa kiểm thử.
- Giữ tiến độ theo milestone và báo cáo các thay đổi kiến trúc/giới hạn sản phẩm cho người dùng.
- Tôn trọng mã nguồn hoặc hướng triển khai đã có, không tự ý tái kiến trúc toàn bộ.
- Khi viết báo cáo, chỉ mô tả tính năng đã triển khai bằng thì hiện tại; các tính năng chưa làm phải ghi "dự kiến", "đề xuất" hoặc "hướng phát triển".

### Gợi ý câu mở đầu người dùng có thể gửi Codex

> Hãy đọc `AGENTS.md`, sau đó kiểm tra repository hiện tại (nếu có). Tôi đang làm bài tập lớn môn Nhập môn công nghệ nền tảng và đã chọn hướng Mini PaaS. Trước khi viết code, hãy đánh giá tính khả thi, đề xuất kiến trúc MVP, chia milestone P0/P1/P2, liệt kê các câu hỏi quan trọng và đưa ra bước triển khai đầu tiên có thể kiểm thử được. Không tự giả định các tính năng đã hoàn thành.

---

## 10. Nguồn thông tin và cách giải quyết mâu thuẫn

**Nguồn bối cảnh của file này:** Trao đổi với sinh viên về bài tập lớn môn Nhập môn công nghệ nền tảng; danh sách 24 đề tài do giảng viên đưa; bản Word đề xuất Mini PaaS đã được soạn trong cuộc trao đổi, tiêu đề *BÁO CÁO ĐỀ XUẤT ĐỀ TÀI BÀI TẬP LỚN*.

Thứ tự ưu tiên khi có cập nhật:

1. **Chỉ đạo mới nhất của giảng viên / đề cương chính thức.**
2. **Quyết định mới nhất của sinh viên/nhóm.**
3. **Mã nguồn, cấu hình và bằng chứng kiểm thử thực tế trong repository.**
4. **Phạm vi đã viết trong báo cáo đề xuất Mini PaaS**, nếu vẫn là bản được nhóm dùng.
5. **Những gợi ý kỹ thuật và mở rộng trong file này** (có thể điều chỉnh).

Nếu các nguồn mâu thuẫn, chỉ ra chỗ mâu thuẫn để người dùng quyết định; **không im lặng tự nâng phạm vi, tự đổi đề hoặc tự suy diễn phê duyệt**.

**Ghi chú cuối:** Thành công của đề tài không phải số lượng công nghệ được liệt kê. Đó là một **quy trình triển khai và quản lý ứng dụng có thể chạy lại, kiểm thử được, giải thích được và bảo vệ được bằng minh chứng**.
