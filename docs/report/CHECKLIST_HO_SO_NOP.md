# Checklist hồ sơ nộp Mini PaaS

> Cập nhật theo yêu cầu chính thức nhận ngày 12/10/2026. Trạng thái trong bảng phải được rà lại ở release cuối, không đánh dấu hoàn thành chỉ vì đã có file khung.

## 1. Báo cáo 12–18 trang nội dung chính

- [ ] Yêu cầu và giả định.
- [ ] Kiến trúc tổng thể, control plane/data plane/observability plane.
- [ ] Sơ đồ hệ thống và luồng Git → build → image → deploy → route.
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
- [ ] README release cuối ghi toàn bộ phiên bản công cụ đã dùng trên VPS.
- [x] Luồng sản phẩm Git → build → image → deploy cho một repository/App A tin cậy trên môi trường phát triển; còn phải nghiệm thu lại trên VPS Linux.
- [ ] Sơ đồ kiến trúc bản cuối.
- [x] Bảng tài nguyên/IP/quyền bản phát triển tại `docs/architecture/BANG_TAI_NGUYEN_IP_QUYEN.md`.
- [ ] Bảng tài nguyên/IP/quyền bản VPS đã đối soát.
- [x] Script/cấu hình monitoring Prometheus/Grafana, kiểm thử tích hợp và kịch bản k6 có dữ liệu vòng phát triển; còn phải chạy lại trên VPS Linux.
- [ ] Gói release cuối không chứa secret.

Không mặc định cần file `.pkt`: Mini PaaS không mô phỏng router/switch bằng Packet Tracer. Hồ sơ thay thế bằng sơ đồ mạng Docker, bảng cổng/DNS/quyền và cấu hình chạy thật. Nếu giảng viên yêu cầu `.pkt` riêng cho mọi nhóm, phải bổ sung sau khi xác nhận.

## 3. Kiểm thử và dữ liệu đo

- [ ] T01–T08 có bản ghi theo mẫu thống nhất.
- [ ] Mỗi test ghi đầu vào/điều kiện trước.
- [ ] Mỗi test ghi thao tác.
- [ ] Mỗi test ghi kết quả mong đợi.
- [ ] Mỗi test ghi kết quả thực tế.
- [ ] Mỗi test đánh dấu đạt/chưa đạt.
- [ ] Mỗi test có thời gian, commit, môi trường và người thực hiện.
- [ ] Mỗi test liên kết tới log/JSON/CSV tương ứng.
- [x] T06 có dữ liệu k6 gốc và dữ liệu metric cùng khoảng thời gian ở vòng phát triển; cần tạo bộ release/VPS riêng trước khi nộp.
- [ ] Không có token, mật khẩu, cookie hoặc khóa trong evidence.

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
