# PHÂN CÔNG HOÀN THIỆN ĐỒ ÁN MINI PAAS

## 1. Thông tin chung

- **Học phần:** Nhập môn công nghệ nền tảng — RIPT1304-20261-01
- **Đề tài:** Nghiên cứu, thiết kế và xây dựng nền tảng triển khai, quản lý ứng dụng Web tự động trên hạ tầng Container (Mini PaaS)
- **Phiên bản nền:** `v1.0.0-rc.2`

### Thành viên

| Họ và tên | Mã sinh viên | Phạm vi phụ trách chính |
|---|---|---|
| Đỗ Sỹ Việt | B24DCCC287 | Kiến trúc, Control API, Runner, tích hợp và phát hành |
| Trần Hải Minh | B24DCCC206 | Giám sát, kiểm thử tải và phân tích số liệu |
| Lê Thị Thảo | B24DCCC253 | Dashboard, trải nghiệm quản trị và kiểm thử giao diện |
| Mai Đức Duy | B24DCCC092 | Ứng dụng Web mẫu và kiểm chứng quy trình triển khai |

## 2. Mục tiêu của đợt hoàn thiện

1. Mỗi thành viên hiểu và giải thích được phần hệ thống mình phụ trách.
2. Mỗi thành viên có ít nhất một sản phẩm kỹ thuật riêng, có file hoặc repository, commit và bằng chứng chạy thử.
3. Bổ sung một số cải tiến nhỏ nhưng có giá trị, không làm thay đổi kiến trúc lõi đã ổn định.
4. Hoàn thiện báo cáo 12–18 trang, slide, video 5–7 phút và bốn phiếu đóng góp cá nhân.
5. Tất cả nội dung báo cáo, slide và video sử dụng cùng một phiên bản mã nguồn và cùng số liệu kiểm thử.

> `v1.0.0-rc.2` là mốc ổn định hiện tại. Mọi thay đổi chức năng sau mốc này phải được review, chạy lại kiểm thử và chỉ được đưa vào bản nộp khi không làm hỏng các chức năng đã có.

## 3. Quy định bàn giao chung

Trước khi sửa mã, mỗi thành viên phải dựng và chạy hệ thống theo [`../development/HUONG_DAN_THANH_VIEN_CHAY_DU_AN.md`](../development/HUONG_DAN_THANH_VIEN_CHAY_DU_AN.md). Thành viên phụ trách Dashboard đọc thêm [`../../platform/dashboard/README.md`](../../platform/dashboard/README.md).

Mỗi nhiệm vụ kỹ thuật phải có đủ:

- File, thư mục hoặc repository đã tạo/sửa.
- Commit bằng tài khoản GitHub của người thực hiện.
- Mô tả ngắn về mục tiêu và cách hoạt động.
- Lệnh chạy hoặc các bước kiểm tra.
- Kết quả thực tế và bằng chứng có thời gian.
- Ít nhất một lỗi, vấn đề hoặc quyết định kỹ thuật đã gặp trong quá trình thực hiện.

Không đưa token, mật khẩu, cookie, SSH key hoặc nội dung file `.env` vào commit, ảnh, log hoặc báo cáo.

## 4. Phân công chi tiết

### 4.1. Đỗ Sỹ Việt — kiến trúc, tích hợp và phát hành

#### Nội dung cần nắm

- Mô hình PaaS và phạm vi của Mini PaaS một máy.
- Phân tách Control Plane, Data Plane và Observability Plane.
- Luồng GitHub → build Docker image → chạy container → cấp hostname.
- Xác thực quản trị, quản lý biến môi trường, release và rollback.
- Ranh giới quyền của Control API, Runner và Docker socket.
- Docker Compose, Nginx Gateway, VPS và Cloudflare Tunnel.

#### Nhiệm vụ kỹ thuật

- Review và tích hợp các pull request của thành viên.
- Đối chiếu các tài liệu còn nhắc `v1.0.0-rc.1` và cập nhật về phiên bản cuối phù hợp.
- Thay các nhãn người thực hiện tạm trong bảng kiểm thử bằng thông tin đúng với người đã chạy hoặc đối soát test.
- Bổ sung lệnh `make verify-submission` hoặc script tương đương để kiểm tra nhanh:
  - Compose config hợp lệ.
  - Không có file secret phổ biến bị Git theo dõi.
  - Các tài liệu và evidence bắt buộc tồn tại.
  - Checksum evidence hợp lệ nếu thư mục có manifest.
- Sau khi merge, chạy toàn bộ regression, kiểm tra public HTTPS và tạo release cuối nếu có thay đổi mã nguồn.

#### Phần báo cáo

- Chương 1: Tổng quan, mục tiêu, phạm vi và giả định.
- Chương 3: Phân tích yêu cầu và thiết kế kiến trúc.
- Phần triển khai Control API, Runner, Git deployment, biến môi trường và rollback trong Chương 4.
- Tổng hợp T03, T04, T07 và kết quả hồi quy trong Chương 5.
- Chương 6: Kết luận, giới hạn và hướng phát triển.
- Tổng hợp nguồn tham khảo, nội dung sử dụng AI và biên tập bản Word cuối.

#### Tiêu chí hoàn thành

- Các thay đổi của nhóm được review và tích hợp không xung đột.
- Toàn bộ test hiện có đạt trên phiên bản cuối.
- Local, GitHub, tag phát hành và VPS cùng trỏ tới một commit.
- Không phát hiện secret trong cây Git và evidence phát hành.

---

### 4.2. Trần Hải Minh — giám sát và kiểm thử hiệu năng

#### Nội dung cần nắm

- Cách Prometheus thu thập metric theo mô hình pull.
- Vai trò của Runner exporter và Grafana.
- Ý nghĩa của CPU, RAM, health, p95, thông lượng và tỷ lệ lỗi.
- Phân biệt request/giây với số người dùng đồng thời.
- Cách đọc dữ liệu gốc của k6 và đối chiếu với metric Prometheus.

#### Nhiệm vụ kỹ thuật bắt buộc

- Viết hoặc mở rộng test tự động để kiểm tra:
  - Prometheus hoạt động và đọc được cấu hình.
  - Các target cần thiết ở trạng thái phù hợp.
  - Các rule cảnh báo đã được nạp.
  - Runner xuất được metric ứng dụng.
  - Grafana datasource được provision đúng.
- Chạy test và lưu evidence gồm môi trường, lệnh chạy, kết quả và kết luận.
- Đọc dữ liệu T06 hiện có, tạo bảng và biểu đồ cho các mức tải 10/25/50 req/s.
- Phân tích p95, thông lượng, tỷ lệ lỗi và tài nguyên từ dữ liệu thật; không tự tạo hoặc làm tròn số liệu theo cảm tính.

#### Nhiệm vụ bổ sung nếu còn thời gian

- Thêm phần tóm tắt trạng thái monitoring vào tài liệu vận hành.
- Bổ sung một test xác nhận API rule của Prometheus có thể đọc được trạng thái cảnh báo.
- Chuẩn hóa script sinh biểu đồ để có thể chạy lại từ dữ liệu CSV/JSON gốc.

#### Vị trí làm việc gợi ý

- `platform/monitoring/`
- `tests/integration/`
- `scripts/performance/`
- `evidence/T05/`
- `evidence/T06/`

#### Phần báo cáo

- Cơ sở lý thuyết về monitoring và kiểm thử tải trong Chương 2.
- Mô tả Prometheus, Grafana và Runner exporter trong Chương 4.
- T05 và T06 trong Chương 5.
- Bảng số liệu, biểu đồ, phân tích và giới hạn của phép đo.

#### Tiêu chí hoàn thành

- Có ít nhất một file test hoặc script kỹ thuật mới/cải tiến.
- Test có thể chạy lại bằng một lệnh rõ ràng.
- Biểu đồ khớp với dữ liệu gốc đang lưu trong repository.
- Có commit, evidence và nội dung báo cáo tương ứng.

---

### 4.3. Lê Thị Thảo — Dashboard và trải nghiệm quản trị

#### Nội dung cần nắm

- Cấu trúc Dashboard React/TypeScript hiện tại.
- Cách Dashboard gọi Control API và xử lý session.
- Luồng danh sách ứng dụng → chi tiết ứng dụng → deployment/log/metric.
- Trạng thái tải, rỗng, thành công, lỗi và xác nhận thao tác.
- Quy tắc validation khi tạo Web Service và quản lý biến môi trường.

#### Nhiệm vụ kỹ thuật bắt buộc

- Bổ sung tìm kiếm/lọc danh sách ứng dụng theo tên, slug hoặc repository.
- Bổ sung trạng thái rỗng khi không có kết quả tìm kiếm.
- Viết test cho logic tìm kiếm/lọc hoặc tách logic thành hàm có thể kiểm thử.
- Rà lại thông báo lỗi và hướng dẫn nhập liệu ở form tạo Web Service; dùng tiếng Việt rõ ràng, thống nhất thuật ngữ.
- Chạy typecheck, test liên quan và production build.

#### Nhiệm vụ bổ sung nếu còn thời gian

- Thêm bộ lọc lịch sử deployment theo ứng dụng hoặc kết quả thành công/thất bại.
- Thêm thao tác sao chép URL ứng dụng với thông báo thành công/thất bại rõ ràng.
- Cải thiện trạng thái chờ khi hệ thống đang build/deploy để người dùng biết thao tác đã được tiếp nhận.
- Chuẩn hóa các component trạng thái dùng chung để giảm lặp mã.

#### Vị trí làm việc gợi ý

- `platform/dashboard/`
- Các test Dashboard liên quan trong `tests/`

#### Phần báo cáo

- Cơ sở về Dashboard Web và giao tiếp API trong Chương 2.
- Thiết kế Dashboard, các màn hình và luồng thao tác trong Chương 3.
- Hướng dẫn tạo Web Service, quản lý ứng dụng và biến môi trường trong Chương 4.
- Kiểm thử các luồng giao diện phụ trách trong Chương 5.

#### Tiêu chí hoàn thành

- Tìm kiếm/lọc hoạt động với dữ liệu hiện có và trạng thái rỗng đúng.
- Không làm thay đổi hợp đồng API không cần thiết.
- Typecheck, test và production build đều đạt.
- Có commit, bằng chứng kiểm thử và nội dung báo cáo tương ứng.

> Theo quy tắc chung của dự án, không cần chủ động chạy kiểm tra responsive hoặc kiểm tra trực quan bằng trình duyệt. Nếu có yêu cầu kiểm tra giao diện riêng, nhóm sẽ thống nhất trước.

---

### 4.4. Mai Đức Duy — ứng dụng Web mẫu và quy trình triển khai

#### Nội dung cần nắm

- Khái niệm container và điểm khác với máy ảo.
- Vai trò của `Dockerfile`, image, container và cổng 3000.
- Mục đích của endpoint `/health` và `/version`.
- Luồng repository GitHub → Mini PaaS → Docker image → container → URL HTTPS.
- Cách đọc build log và xác định trạng thái deployment.

#### Nhiệm vụ kỹ thuật bắt buộc

- Xây dựng một repository Web mẫu công khai, gồm:
  - Trang `/` hiển thị tên ứng dụng và mô tả ngắn.
  - Endpoint `/health` trả trạng thái khỏe.
  - Endpoint `/version` trả phiên bản hiện tại.
  - Ứng dụng lắng nghe cổng `3000`.
  - Có `Dockerfile` và `.dockerignore` phù hợp.
  - Có `README.md` hướng dẫn chạy bằng Docker.
- Thực hiện ít nhất hai phiên bản, ví dụ `v1` và `v2`, để chứng minh cập nhật từ Git.
- Triển khai repository qua Dashboard Mini PaaS và truy cập bằng hostname riêng.
- Kiểm tra trang chính, health và version bằng `curl`; lưu kết quả và build log làm evidence.
- Ghi lại một lỗi hoặc vấn đề đã gặp, nguyên nhân và cách xử lý.

#### Nhiệm vụ bổ sung nếu còn thời gian

- Thêm hiển thị thời gian build hoặc mã commit vào trang `/version`.
- Bổ sung hướng dẫn xử lý các lỗi cơ bản: sai cổng, thiếu Dockerfile, health không trả HTTP 200.
- Thử triển khai một commit cụ thể rồi quay lại commit mới nhất.

#### Đầu ra

- Link repository GitHub.
- Mã nguồn, `Dockerfile`, `.dockerignore` và `README.md`.
- Các commit thực hiện bằng tài khoản cá nhân.
- URL ứng dụng sau triển khai.
- Evidence của `/`, `/health`, `/version` và build log.

#### Phần báo cáo

- Khái niệm container, Dockerfile và health check trong Chương 2.
- Các bước triển khai ứng dụng mẫu từ repository trong Chương 4.
- Bảng kiểm thử ứng dụng mẫu và kết quả cập nhật `v1` → `v2` trong Chương 5.

#### Tiêu chí hoàn thành

- Repository có thể build thành Docker image mà không cần thao tác ngoài README.
- Ứng dụng chạy đúng cổng 3000 và ba endpoint hoạt động.
- Mini PaaS build/deploy thành công và cấp URL HTTPS riêng.
- Có commit, evidence và nội dung báo cáo tương ứng.

## 5. Ma trận task bổ sung

| Mã | Task | Người phụ trách | Mức ưu tiên | Sản phẩm bàn giao |
|---|---|---|---|---|
| DOC-01 | Đồng bộ tài liệu từ RC1 sang phiên bản cuối | Việt | Bắt buộc | Tài liệu không còn thông tin phiên bản lỗi thời |
| DOC-02 | Hoàn thiện nguồn tham khảo và khai báo sử dụng AI | Cả nhóm, Việt tổng hợp | Bắt buộc | Danh mục nguồn và mục sử dụng AI |
| FE-01 | Tìm kiếm/lọc danh sách ứng dụng | Thảo | Bắt buộc | Mã nguồn, test, build log |
| FE-02 | Lọc lịch sử deployment | Thảo | Nếu còn thời gian | Mã nguồn và test |
| FE-03 | Sao chép URL và cải thiện phản hồi thao tác | Thảo | Nếu còn thời gian | Component và test liên quan |
| OBS-01 | Test tự động cho monitoring contract | Minh | Bắt buộc | Test/script và evidence |
| PERF-01 | Bảng và biểu đồ T06 từ dữ liệu gốc | Minh | Bắt buộc | Biểu đồ, bảng số liệu và phân tích |
| OBS-02 | Kiểm tra trạng thái Prometheus rule | Minh | Nếu còn thời gian | Test API rule |
| APP-01 | Repository ứng dụng Web mẫu | Duy | Bắt buộc | Repository, Dockerfile và README |
| APP-02 | Deploy `v1`, cập nhật `v2` và kiểm tra URL | Duy | Bắt buộc | Deployment log và evidence |
| APP-03 | Hướng dẫn xử lý lỗi build cơ bản | Duy | Nếu còn thời gian | Mục troubleshooting trong README |
| REL-01 | Script kiểm tra hồ sơ trước khi nộp | Việt | Bắt buộc | `make verify-submission` hoặc tương đương |
| REL-02 | Regression và chốt release cuối | Việt | Bắt buộc | Tag, test log, public check và release note |

## 6. Phân chia nội dung báo cáo

| Nội dung | Người soạn chính | Người rà soát |
|---|---|---|
| Chương 1 — Tổng quan | Việt | Cả nhóm |
| Chương 2 — PaaS, CI/CD và bảo mật | Việt | Minh |
| Chương 2 — Monitoring và kiểm thử tải | Minh | Việt |
| Chương 2 — Dashboard Web và API | Thảo | Việt |
| Chương 2 — Container, Dockerfile và health check | Duy | Việt |
| Chương 3 — Phân tích và thiết kế | Việt | Mỗi người rà phần mình phụ trách |
| Chương 4 — Control API, Runner, Git, rollback | Việt | Minh |
| Chương 4 — Monitoring và Grafana | Minh | Việt |
| Chương 4 — Dashboard và hướng dẫn sử dụng | Thảo | Việt |
| Chương 4 — Triển khai ứng dụng mẫu | Duy | Thảo |
| Chương 5 — T05/T06 và số liệu hiệu năng | Minh | Việt |
| Chương 5 — Kiểm thử Dashboard | Thảo | Việt |
| Chương 5 — Kiểm thử ứng dụng Web mẫu | Duy | Minh |
| Chương 5 — T01–T04, T07–T08 và hồi quy | Việt | Cả nhóm |
| Chương 6 — Kết luận và hướng phát triển | Việt | Cả nhóm |

Mỗi thành viên viết bản nháp phần mình phụ trách dưới dạng Markdown hoặc Word riêng, có nguồn trích dẫn. Bản cuối được ghép theo cùng một mẫu Word để giữ thống nhất heading, font, bảng và đánh số hình.

## 7. Quy trình Git

### Tên nhánh gợi ý

- `member/viet-final-integration`
- `member/minh-monitoring`
- `member/thao-dashboard-filter`
- `member/duy-demo-app`

### Quy trình thực hiện

1. Cập nhật từ nhánh `main` mới nhất.
2. Tạo nhánh riêng trước khi sửa.
3. Chỉ commit file thuộc task được giao.
4. Commit message mô tả rõ mục đích, ví dụ:
   - `feat(dashboard): add application search and filters`
   - `test(monitoring): verify prometheus targets and rules`
   - `feat(sample-app): add health and version endpoints`
5. Push nhánh và tạo pull request.
6. Ghi trong pull request:
   - Đã thay đổi gì.
   - Cách chạy kiểm thử.
   - Kết quả thực tế.
   - File evidence liên quan.
7. Chỉ merge sau khi được review và các kiểm tra bắt buộc đạt.

Không sửa lịch sử commit, không dùng tên/email của người khác và không commit trực tiếp lên `main` khi đang thực hiện task cá nhân.

## 8. Thứ tự thực hiện đề xuất

### Giai đoạn 1 — Tìm hiểu và chuẩn bị

- Mỗi thành viên đọc tài liệu kiến trúc và README liên quan đến phần được giao.
- Viết ghi chú tìm hiểu ngắn và thống nhất đầu ra kỹ thuật.
- Chuẩn bị nhánh/repository riêng.

### Giai đoạn 2 — Thực hiện task kỹ thuật

- Thảo thực hiện FE-01.
- Minh thực hiện OBS-01 và PERF-01.
- Duy thực hiện APP-01 và APP-02.
- Việt thực hiện DOC-01 và REL-01.

### Giai đoạn 3 — Review và tích hợp

- Từng thành viên tự chạy test phần mình.
- Việt review pull request và tích hợp lần lượt.
- Chạy toàn bộ bộ test sau mỗi nhóm thay đổi quan trọng.

### Giai đoạn 4 — Hồ sơ và phát hành

- Chốt commit/tag dùng cho bản nộp.
- Đồng bộ báo cáo, slide và video với phiên bản cuối.
- Hoàn thiện bốn phiếu đóng góp cá nhân.
- Kiểm tra checklist hồ sơ trước khi đóng gói.

## 9. Nội dung chưa thực hiện trong đợt này

Các mục sau chỉ ghi là giới hạn hoặc hướng phát triển, không đưa vào task bắt buộc hiện tại:

- Webhook tự động deploy khi push.
- Repository riêng tư hoặc GitHub App.
- Database hosting.
- Registry image riêng, image signing hoặc SBOM.
- Autoscaling, nhiều replica hoặc high availability.
- Log tập trung hoặc Alertmanager gửi thông báo.
- Cho người dùng Internet không tin cậy chạy mã tùy ý.

## 10. Checklist trước khi xác nhận hoàn thành

- [ ] Bốn thành viên có sản phẩm kỹ thuật riêng.
- [ ] Mỗi sản phẩm có commit/repository và bằng chứng chạy thử.
- [ ] Các task bắt buộc trong ma trận đã hoàn thành hoặc ghi rõ lý do chưa hoàn thành.
- [ ] Typecheck, unit test, integration test và production build liên quan đều đạt.
- [ ] Bộ regression chung đạt trên phiên bản cuối.
- [ ] Public HTTPS và ranh giới chưa đăng nhập được kiểm tra lại.
- [ ] Báo cáo đủ 12–18 trang nội dung chính.
- [ ] Bảng T01–T08 ghi đúng người thực hiện và dẫn đúng evidence.
- [ ] Slide và video sử dụng cùng commit, số liệu và kiến trúc với báo cáo.
- [ ] Có đủ bốn phiếu đóng góp cá nhân.
- [ ] Không có secret hoặc dữ liệu nhạy cảm trong repository và hồ sơ nộp.
