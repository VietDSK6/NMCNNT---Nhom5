# Checklist hồ sơ nộp Mini PaaS

> Cập nhật theo yêu cầu chính thức nhận ngày 12/10/2026. Trạng thái trong bảng phải được rà lại ở release cuối, không đánh dấu hoàn thành chỉ vì đã có file khung.

## 1. Báo cáo 12–18 trang nội dung chính

- [ ] Yêu cầu và giả định.
- [x] Kiến trúc tổng thể, control plane/data plane/observability plane đã chốt trong tài liệu kiến trúc cuối.
- [x] Sơ đồ hệ thống và luồng Git → build → image → deploy → route đã có bản Mermaid dùng cho báo cáo/slide.
- [ ] Bảng tài nguyên/IP/quyền.
- [ ] Mô tả triển khai đúng với phiên bản đã kiểm thử.
- [ ] Bảng kiểm thử có kỳ vọng và thực tế.
- [ ] Đánh giá, giới hạn và hướng phát triển.
- [ ] Tài liệu tham khảo.
- [ ] Mục nguồn mã/cấu hình tham khảo và cách sử dụng AI.
- [ ] Nội dung chính từ 12 đến 18 trang; phụ lục không tính chung.

Phụ lục dự kiến:

- Cấu hình Compose/Nginx/monitoring quan trọng.
- Hợp đồng API và manifest triển khai.
- Bảng kiểm thử đầy đủ T01–T08.
- Dữ liệu đo gốc và lệnh tái lập.
- Trích đoạn log đã làm sạch.

## 2. Sản phẩm và tài liệu kỹ thuật

- [x] Repository GitHub và lịch sử commit.
- [x] Mã nguồn P0, Compose, Nginx, Dashboard, API và Runner.
- [x] README có yêu cầu môi trường, cách chạy và cách kiểm thử P0.
- [x] README release candidate ghi toàn bộ phiên bản công cụ đã dùng trên VPS; đối soát lại nếu tạo release mới.
- [x] Luồng sản phẩm Git → build → image → deploy đã nghiệm thu trên VPS cho App A và Web Service động từ repository công khai thuộc owner allowlist.
- [x] Sơ đồ kiến trúc bản cuối tại `docs/architecture/KIEN_TRUC_TONG_THE_CUOI.md`.
- [x] Bảng tài nguyên/IP/quyền bản phát triển tại `docs/architecture/BANG_TAI_NGUYEN_IP_QUYEN.md`.
- [x] Bảng tài nguyên/IP/quyền bản VPS đã đối soát tại `docs/architecture/BANG_TAI_NGUYEN_IP_QUYEN_VPS.md`.
- [x] Script/cấu hình monitoring Prometheus/Grafana và T06 có ba vòng dữ liệu gốc trên VPS Linux.
- [x] Cloudflare Tunnel công khai Control Center và wildcard Web Service qua HTTPS mà không mở Docker socket/API ra Internet.
- [x] Web Service độc lập có repository, image, container và hostname riêng; `demo.ai2p.id.vn` đã trả đúng health/version.
- [x] Quản lý biến môi trường theo ứng dụng, mã hóa SQLite, che secret và hồi quy đạt trên VPS Linux ở release candidate.
- [x] Lịch sử release và rollback theo image ID cục bộ đã hồi quy đạt trên VPS; chưa có registry digest và không tuyên bố rollback đa máy.
- [x] Gói `v1.0.0-rc.1` đã quét cây/lịch sử Git và không phát hiện secret xác suất cao; database T08 giữ ngoài repository.

Không mặc định cần file `.pkt`: Mini PaaS không mô phỏng router/switch bằng Packet Tracer. Hồ sơ thay thế bằng sơ đồ mạng Docker, bảng cổng/DNS/quyền và cấu hình chạy thật. Nếu giảng viên yêu cầu `.pkt` riêng cho mọi nhóm, phải bổ sung sau khi xác nhận.

## 3. Kiểm thử và dữ liệu đo

- [x] T01–T08 có bản ghi theo mẫu thống nhất; T01 ghi rõ thiếu raw log của lần dựng VPS sạch ban đầu.
- [x] Mỗi test ghi đầu vào/điều kiện trước.
- [x] Mỗi test ghi thao tác.
- [x] Mỗi test ghi kết quả mong đợi.
- [x] Mỗi test ghi kết quả thực tế.
- [x] Mỗi test đánh dấu đạt/chưa đạt; T01 dùng trạng thái `Đạt có lưu ý`.
- [x] Mỗi test có thời gian, commit, môi trường và người thực hiện tạm `TV1 – chủ dự án`; phải thay bằng họ tên/MSSV trước khi nộp.
- [x] Mỗi test liên kết tới log/JSON/CSV hoặc hồ sơ nguồn tương ứng; khoảng trống dữ liệu thô được ghi công khai trong biên bản audit.
- [x] T06 có ba vòng dữ liệu k6 gốc và metric cùng khoảng thời gian trên VPS Linux.
- [x] T08 sao lưu/khôi phục SQLite đã nghiệm thu trên volume tạm ở VPS; database nhạy cảm giữ ngoài Git, evidence đã làm sạch.
- [x] Không phát hiện token, mật khẩu, cookie hoặc khóa trong evidence tại mốc `v1.0.0-rc.1`.

## 4. Video và bảo vệ

- [ ] Video dài từ 5 đến 7 phút.
- [ ] Video dùng đúng release cuối.
- [ ] Thể hiện kiến trúc, triển khai từ Git, truy cập ứng dụng, cập nhật, log/metric và một tình huống lỗi.
- [ ] Nêu giới hạn một host và ranh giới Docker socket.
- [ ] Slide và số liệu thống nhất với báo cáo/evidence.

## 5. Đóng góp cá nhân

- [ ] Có đủ phiếu TV1, TV2, TV3, TV4.
- [ ] Mỗi người có ít nhất một file/script/cấu hình hoặc thành phần kỹ thuật riêng.
- [ ] Mỗi sản phẩm có commit hoặc đường dẫn file.
- [ ] Mỗi người có bằng chứng chạy thử.
- [ ] Mỗi người ghi ít nhất một lỗi/vấn đề đã xử lý hoặc quyết định kỹ thuật đã tham gia.
- [ ] Không ghi nhiệm vụ chỉ “tìm tài liệu” như sản phẩm kỹ thuật duy nhất.

## 6. Nguồn và sử dụng AI

- [ ] Ghi tài liệu chính thức đã tham khảo.
- [ ] Ghi nguồn đoạn mã/cấu hình kế thừa nếu có.
- [ ] Ghi công cụ AI và phạm vi hỗ trợ.
- [ ] Ghi cách sinh viên kiểm tra, sửa đổi và chạy lại đầu ra AI.
- [ ] Thành viên phụ trách giải thích được các phần nộp, không viện dẫn AI thay cho trách nhiệm kỹ thuật.
