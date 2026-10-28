# Đối chiếu Mini PaaS với kiến thức học phần RIPT1304

> Tài liệu làm việc cho báo cáo, slide và bảo vệ. Đối chiếu ngày 26/10/2026 với release candidate `v1.0.0-rc.2`, mã runtime `2ce0e1c`. Chỉ những nội dung có mã nguồn, cấu hình hoặc evidence trong repository mới được mô tả là đã triển khai.

## 1. Kết luận tổng quát

Mini PaaS phù hợp trực tiếp với mục tiêu của học phần Nhập môn công nghệ nền tảng vì sản phẩm kết nối nhiều lớp của một hệ thống CNTT thành một quy trình có thể vận hành và kiểm thử:

```text
Mã nguồn Git
    → build Docker image
    → tạo container có giới hạn tài nguyên
    → định tuyến DNS/HTTP/HTTPS
    → giám sát log, health, CPU và RAM
    → cập nhật, rollback, sao lưu và khôi phục
```

Giá trị học thuật chính không nằm ở số lượng màn hình Dashboard. Giá trị nằm ở việc nhóm có thể giải thích quan hệ giữa hệ điều hành, tiến trình, mạng, file system, ảo hóa/container, bảo mật và quản trị hệ thống bằng một sản phẩm chạy thật.

Mức độ bao phủ mạnh nhất thuộc các chương 4, 5, 7 và 8. Chương 2 có liên hệ thực tế tốt qua tiến trình và kiểm soát tương tranh. Chương 3 chỉ được liên hệ ở mức giới hạn/đo tài nguyên CPU; dự án không cài đặt các thuật toán lập lịch CPU của hệ điều hành. Chương 6 được thể hiện qua phân đoạn mạng Docker nhưng không phải VLAN 802.1Q.

## 2. Ma trận kiến thức → triển khai → kiểm thử → giới hạn

| Chương/kiến thức | Thành phần hoặc hành vi của Mini PaaS | Kiểm thử/bằng chứng | Mức bao phủ | Giới hạn phải nêu |
|---|---|---|---|---|
| 1. Các lớp của hệ thống CNTT | VPS Debian, Docker Engine, CPU/RAM/SSD/NIC, Gateway, ứng dụng, SQLite, monitoring và lớp quản trị | Kiến trúc tổng thể; bảng tài nguyên/IP/quyền; hồi quy RC2 | Rất tốt | Đây là mô hình một VPS, không phải hạ tầng Cloud thương mại |
| 2. Program, process, trạng thái tiến trình | Image/chương trình trở thành process trong container; start/stop/restart; PID, health và log | T04; P0.2B; P0.2C | Tốt | Container không đồng nghĩa process; một container có thể chứa nhiều process |
| 2. Race condition và critical section | Unique index chặn hai operation `queued/running` trên cùng ứng dụng; Runner có khóa theo `appId` | Unit/integration Control API và Runner; mã migration/runtime | Tốt | Khóa trong bộ nhớ của Runner chưa phải hàng đợi bền vững khi tiến trình bị dừng đột ngột |
| 2. Thread, PCB, context switch | Có thể giải thích ở tầng Linux/Node.js và ảnh hưởng tới workload | Không có test chuyên biệt | Liên hệ lý thuyết | Không tuyên bố đã quan sát PCB, thread scheduling hoặc context switch |
| 3. CPU và quản lý tài nguyên | Compose đặt `cpus`, RAM và PID limit; Prometheus đo CPU/RAM trong T06 | Compose; T05; T06 | Cơ bản–khá | Giới hạn cgroup không phải FCFS, SJF, Priority hay Round Robin |
| 3. Hiệu năng | k6 đo p95, thông lượng, lỗi và dropped iteration tại 10/25/50 req/s | Dữ liệu gốc T06 ngày 14/10/2026 | Tốt | Nguồn tải chạy cùng VPS; endpoint nhỏ; không chứng minh SLA hoặc tải cực đại |
| 4. Client–Server, TCP/IP, DNS, HTTP/HTTPS | Client → Cloudflare → Tunnel → Nginx Gateway → Docker DNS → container | T02; public checks RC2; evidence Cloudflare | Rất tốt | Cloudflare kết thúc TLS; đoạn Tunnel → Gateway hiện dùng HTTP loopback |
| 4. Port, latency, throughput, packet loss | Chỉ Gateway bind `127.0.0.1:8080`; p95/throughput/error được đo | T02, T06, bảng cổng VPS | Rất tốt | HTTP error rate không đồng nghĩa packet loss; dự án chưa đo jitter/packet loss ở tầng mạng |
| 5. File system, volume và metadata | Bind mount cấu hình read-only; named volume cho SQLite/Prometheus/Grafana; quyền `0600` cho secret trên VPS | Compose; bảng tài nguyên VPS; T08 | Tốt | Chưa có evidence ghi loại file system thực tế của phân vùng VPS |
| 5. Journaling, hash, backup | Online backup SQLite, SHA-256, `integrity_check`, restore vào volume tạm | T08 RC2 và T08 ngày 15/10 | Tốt | Hash/journaling không thay backup; chưa chứng minh chiến lược 3–2–1 hoặc bản sao ngoài VPS |
| 6. Phân đoạn mạng | Ba Docker bridge network `edge`, `control`, `source-egress`; `control` là internal | Compose; sơ đồ mạng; T07 | Khá | Docker network không phải VLAN; không có access/trunk port hoặc 802.1Q |
| 6. Routing, ACL và firewall | Gateway định tuyến HTTP/hostname; UFW giới hạn chiều vào; Tailscale dành cho SSH | Bảng tài nguyên/IP/quyền VPS; public checks | Tốt | Reverse proxy ở tầng ứng dụng không thay router/L3 switch; rule UFW không phải inter-VLAN ACL |
| 7. VM và container | Mini PaaS chạy container trong một VPS; image dùng chung kernel host, VPS có OS riêng | Kiến trúc, Compose, bảng tài nguyên VPS | Rất tốt | Không gọi container là máy ảo; hỏng VPS làm toàn bộ stack dừng |
| 7. PaaS và Cloud | Admin chọn Git source/commit; nền tảng build image, deploy, route, theo dõi và rollback | P1 Git latest; Web Service động; RC2 public checks | Xuất sắc | Chỉ là Mini PaaS: chưa multi-tenant, rapid elasticity, billing, HA hoặc registry ngoài |
| 7. Scale up/scale out | Có thể thay giới hạn CPU/RAM; kiến trúc hiện mỗi app một replica | Compose và tài liệu giới hạn | Liên hệ lý thuyết | Chưa triển khai scale out, load balancing hoặc autoscaling |
| 8. CIA | Confidentiality: auth/mã hóa; Integrity: hash/image ID/audit; Availability: health/restart/backup | T04, T07, T08, rollback | Rất tốt | Một host và một replica vẫn là điểm lỗi đơn; không tuyên bố high availability |
| 8. Authentication/authorization | Password `scrypt`; session token hash; cookie `HttpOnly`, `SameSite=Strict`, `Secure` trên VPS; admin API trả 401 | Unit test auth; T07; public check RC2 | Rất tốt | Chỉ có vai trò quản trị viên; chưa MFA hoặc RBAC nhiều vai trò |
| 8. Least privilege/defense in depth | Chỉ Runner có Docker socket; service không publish port riêng; filesystem read-only, drop capability, allowlist source | Compose, kiến trúc, T07 | Rất tốt | Docker socket trao quyền rất cao; nếu Runner bị chiếm quyền thì host có thể bị ảnh hưởng |
| 8. Encryption, hash và audit | AES-256-GCM cho biến nhạy cảm; SHA-256 cho session/checksum; audit event cho tác vụ | Unit/integration environment, T07/T08 | Rất tốt | Người có quyền host/Docker vẫn có thể đọc môi trường container; mã hóa không thay kiểm soát host |
| 8. Incident response/recovery | Có log, audit, health, alert rule, rollback và restore rehearsal | T04, T05, rollback, T08 | Tốt | Chưa có Alertmanager/kênh thông báo, log tập trung hoặc quy trình ứng cứu sự cố hoàn chỉnh |

## 3. Chuỗi mạng nên dùng khi thuyết trình

Khi người dùng mở `https://demo.ai2p.id.vn`, nhóm có thể giải thích theo thứ tự:

1. DNS phân giải hostname về hạ tầng Cloudflare.
2. Trình duyệt thiết lập kết nối HTTPS/TLS với Cloudflare Edge.
3. Cloudflare chuyển request qua Tunnel outbound đã được VPS thiết lập trước.
4. `cloudflared` đưa request đến Gateway tại `127.0.0.1:8080`.
5. Nginx đọc trường `Host`, chọn Web Service tương ứng và phân giải tên container bằng Docker DNS.
6. Container xử lý HTTP request và trả response theo đường ngược lại.

Chuỗi này minh họa trực tiếp Client–Server, DNS, TCP/IP, HTTP/HTTPS, port, reverse proxy và định tuyến tên miền. Không nên mô tả Cloudflare Tunnel là VPN chung hoặc coi Nginx là router Layer 3.

## 4. Liên hệ Process và Race Condition

Image Docker là gói tĩnh chứa chương trình và môi trường cần thiết. Khi Docker tạo container, chương trình bên trong được hệ điều hành host thực thi thành một hoặc nhiều process. Mini PaaS quan sát PID, CPU, RAM và trạng thái chạy; thao tác stop/start/restart làm thay đổi vòng đời process/container.

Khi hai yêu cầu quản trị cùng thay đổi một ứng dụng, kết quả có thể phụ thuộc thứ tự thực hiện. Dự án bảo vệ vùng thao tác này bằng hai lớp:

- SQLite có partial unique index, chỉ cho phép tối đa một operation `queued` hoặc `running` trên mỗi ứng dụng.
- Runner giữ khóa theo `appId`, từ chối thao tác thứ hai bằng HTTP 409 trong thời gian thao tác trước chưa xong.

Đây là ví dụ thực tế của kiểm soát tương tranh. Tuy nhiên operation queue chưa bền vững như message broker; nếu Control API dừng đột ngột, trạng thái có thể cần đối soát thủ công.

## 5. Diễn giải đúng kết quả T06

Ba vòng T06 tại 10/25/50 req/s đều đạt ngưỡng đã đặt, lỗi 0% và không rơi iteration. Median p95 lần lượt là 58,00 ms, 22,78 ms và 35,00 ms. Không được suy luận rằng tải cao làm hệ thống nhanh hơn. p95 dao động do endpoint JSON nhỏ, cache, lịch tiến trình của hệ điều hành và việc nguồn phát tải chạy cùng VPS.

Kết luận được phép dùng:

> Trong cấu hình VPS và kịch bản đã ghi, hệ thống đáp ứng cả ba mức tải 10, 25 và 50 request/giây theo ngưỡng thử nghiệm; chưa quan sát lỗi hoặc bão hòa tài nguyên ứng dụng mẫu.

Kết luận không được dùng:

- Hệ thống chịu được mọi mức tải hoặc đủ điều kiện production.
- Hệ thống có SLA, high availability hoặc số người dùng đồng thời tương ứng với request/giây.
- 50 req/s nhanh hơn 10 req/s chỉ vì p95 của lần tổng hợp thấp hơn.

## 6. Ranh giới thuật ngữ phải giữ khi viết và bảo vệ

| Không nên nói | Cách nói chính xác |
|---|---|
| Docker network là VLAN | Docker bridge network phân đoạn container theo mục đích; tương đồng về mục tiêu cô lập nhưng không dùng VLAN tagging 802.1Q |
| Container là máy ảo nhẹ | Container cô lập tiến trình và thường dùng chung kernel host; VM có guest OS/kernel riêng |
| `cpus: 0.35` là Round Robin | Đây là hạn mức CPU qua runtime/cgroup; Linux host quyết định lập lịch thực tế |
| Restart policy bảo đảm ứng dụng khỏe | Restart policy xử lý trạng thái process/container; health check mới kiểm tra điều kiện sức khỏe đã định nghĩa |
| Có HTTPS nên hệ thống an toàn | HTTPS bảo vệ đường truyền; hệ thống vẫn cần xác thực, phân quyền, quản lý secret, vá lỗi và bảo vệ host |
| Rollback bảo đảm phục hồi mọi nơi | Rollback hiện phụ thuộc image ID còn tồn tại trên cùng Docker host |
| Cloudflare Tunnel tạo high availability | Tunnel cung cấp đường truy cập HTTPS outbound-only; VPS, Gateway và các service vẫn là điểm lỗi đơn |
| Có backup là đạt 3–2–1 | Hiện đã kiểm tra backup/restore cục bộ; chưa có bằng chứng hai loại phương tiện và một bản ngoài vị trí chính |

## 7. Khoảng trống nên xử lý trong hồ sơ

### Bắt buộc trước khi nộp

1. Dùng `v1.0.0-rc.2` làm phiên bản trình bày thống nhất; giữ nguyên commit/ngày của phép đo lịch sử.
2. Đưa ma trận trong tài liệu này vào Chương 2 hoặc phần đánh giá của báo cáo ở dạng rút gọn.
3. Hoàn thiện bốn phiếu đóng góp cá nhân và đối soát đúng người thực hiện từng evidence.
4. Đồng bộ báo cáo, slide và video với cùng kiến trúc, số liệu T06, giới hạn một host và rủi ro Docker socket.
5. Ghi nguồn bộ slide RIPT1304 và ngày truy cập/nhận tài liệu trong danh mục tham khảo.

### Nên bổ sung nếu còn thời gian

1. Ghi evidence read-only về loại file system và dung lượng VPS bằng `findmnt`, `df -T` và `df -h`; không cần thay cấu hình.
2. Sao chép một bản backup đã mã hóa sang vị trí/thiết bị khác và diễn tập kiểm checksum; nếu chưa làm thì giữ trạng thái “chưa đạt 3–2–1”.
3. Rà lại UFW: TCP 80/443 đang được cho phép dù hiện không có listener; đóng nếu nhóm xác nhận không còn cần phương án dự phòng truy cập trực tiếp.

## 8. Nguồn evidence chính

- Kiến trúc cuối: [`../architecture/KIEN_TRUC_TONG_THE_CUOI.md`](../architecture/KIEN_TRUC_TONG_THE_CUOI.md).
- Tài nguyên, IP và quyền VPS: [`../architecture/BANG_TAI_NGUYEN_IP_QUYEN_VPS.md`](../architecture/BANG_TAI_NGUYEN_IP_QUYEN_VPS.md).
- Ma trận T01–T08: [`../test-plan/BANG_KIEM_THU_T01_T08.md`](../test-plan/BANG_KIEM_THU_T01_T08.md).
- Release candidate RC2: [`../release/RELEASE_CANDIDATE_2.md`](../release/RELEASE_CANDIDATE_2.md).
- T06 VPS: [`../../evidence/T06/2026-10-14-vps-linux/README.md`](../../evidence/T06/2026-10-14-vps-linux/README.md).
- T08 VPS: [`../../evidence/T08/2026-10-15-vps/README.md`](../../evidence/T08/2026-10-15-vps/README.md).
- Hồi quy RC2: [`../../evidence/RELEASE/2026-10-17-v1.0.0-rc.2/README.md`](../../evidence/RELEASE/2026-10-17-v1.0.0-rc.2/README.md).
