# Công việc còn lại để chốt bản nộp Mini PaaS

> Đối soát ngày 15/10/2026 sau khi Web Service động, hostname wildcard và giao diện tạo service riêng đã hoạt động trên VPS.

## 1. Kết luận phạm vi sản phẩm

Lõi sản phẩm đã đủ để bảo vệ như một Mini PaaS một máy: triển khai từ GitHub, tự build Docker image, chạy Web Service độc lập, cấp URL HTTPS, quản lý vòng đời, log, CPU/RAM, biến môi trường, lịch sử release và rollback cục bộ. Webhook tự deploy khi push không thuộc phạm vi đã chốt; database hosting, nhiều replica, autoscaling và registry riêng là hướng phát triển.

Từ mốc này không nên thêm tính năng lớn trước khi hoàn tất khả năng dựng lại, bộ bằng chứng và báo cáo.

## 2. Việc kỹ thuật bắt buộc còn lại

### R1 — Chốt release candidate — đã đạt ngày 16/10/2026

- Đã chọn `v1.0.0-rc.1`, khóa kiến trúc và ghi manifest tại `docs/release/RELEASE_CANDIDATE_1.md`.
- `make test`, deploy latest, T08, public HTTPS và ranh giới 401 đều đạt trên VPS; log tại `evidence/RELEASE/2026-10-16-v1.0.0-rc.1/`.
- Đã sửa hai assertion hồi quy cũ để cho phép Web Service động nhưng vẫn bắt buộc App A/App B khỏe.
- Đã quét cây/lịch sử Git; không phát hiện secret xác suất cao và không có database/file khóa được theo dõi.
- README đã ghi phiên bản Docker, Compose, Node.js, Nginx, Prometheus, Grafana, k6 và cloudflared.

### R2 — Hoàn thành T08 dựng lại/khôi phục — đã đạt ngày 15/10/2026

- Viết quy trình sao lưu tối thiểu cho SQLite/cấu hình cần giữ, không đưa secret vào Git.
- Kiểm thử khôi phục trên bản sao hoặc môi trường tách biệt; không phá stack đang demo.
- Sau khôi phục phải đăng nhập được, đọc danh sách ứng dụng và truy cập ít nhất một Web Service.
- Lưu `environment`, `procedure`, `test-record`, `result`, `conclusion` và checksum tại `evidence/T08/`.

Kết quả: đã đạt trên VPS ở commit `c6b1be0`; database phục hồi đủ bốn ứng dụng, API tạm hoạt động và stack live không thay đổi. Bằng chứng nằm tại `evidence/T08/2026-10-15-vps/`.

### R3 — Chuẩn hóa bộ T01–T08

- T06 đã có ba vòng VPS và dữ liệu gốc; không cần đo lại nếu release cuối không thay đổi đường xử lý request.
- Đối soát T01–T05 và T07 trên release candidate/VPS; chạy lại phần nào chưa có bằng chứng VPS đủ rõ.
- Gán tên người thực hiện, thời gian, commit và đường dẫn bằng chứng cho mọi dòng.
- Ghi một vòng triển khai **commit mới nhất** hoặc **commit cụ thể** của `demo`, kèm build log và version trả về từ URL public.

## 3. Hồ sơ phải hoàn thiện

### Báo cáo 12–18 trang

- Chương 1: tổng quan, lý do chọn đề tài, phạm vi và giả định.
- Chương 2: Linux, mạng/DNS/HTTPS, reverse proxy, container, PaaS, CI/CD và giám sát.
- Chương 3: dùng bản thiết kế hiện có, cập nhật sơ đồ cuối và Web Service động.
- Chương 4: triển khai trên macOS/VPS, Cloudflare Tunnel và hướng dẫn sử dụng.
- Chương 5: T01–T08, bảng số liệu T06, lỗi gặp phải và đánh giá.
- Chương 6: kết luận, giới hạn một host và hướng phát triển.
- Hoàn thiện tài liệu tham khảo, nguồn cấu hình và mục sử dụng AI; chuyển log/cấu hình dài sang phụ lục.

### Video, slide và đóng góp cá nhân

- Video 5–7 phút: kiến trúc → tạo/deploy `demo` → URL public → log/metric → restart hoặc rollback → giới hạn.
- Slide phải dùng cùng commit và số liệu với báo cáo.
- Có đủ bốn phiếu đóng góp; mỗi người phải có file/cấu hình/thành phần kỹ thuật, commit hoặc đường dẫn và bằng chứng chạy thử riêng.

## 4. Phần không cần làm để kịp bản nộp

- Webhook tự deploy khi push.
- Repository riêng tư hoặc GitHub App.
- Database hosting.
- Nhiều replica, load balancing, autoscaling hoặc high availability.
- Registry riêng, image signing, SBOM, log tập trung hoặc Alertmanager.
- Xóa Web Service từ Dashboard.

Các mục trên chỉ nên làm sau khi R1–R3 và báo cáo đã hoàn tất; nếu không, ghi trung thực là giới hạn/hướng phát triển.

## 5. Thứ tự thực hiện đề xuất

1. ~~Chốt release candidate và chạy regression cuối.~~ Hoàn thành với `v1.0.0-rc.1`.
2. Hoàn thiện ma trận T01–T08 và đối soát các evidence cũ theo mẫu thống nhất.
3. Viết đủ sáu chương báo cáo, sau đó rút nội dung thành slide.
4. Chia sản phẩm kỹ thuật và phiếu đóng góp cho bốn thành viên.
5. Quay video trên đúng release cuối và đóng gói hồ sơ.
