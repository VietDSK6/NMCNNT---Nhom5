# Công việc còn lại để chốt bản nộp Mini PaaS

> Đối soát ngày 26/10/2026 với release candidate `v1.0.0-rc.2` và ma trận T01–T08 đã chuẩn hóa lại theo đúng nguồn gốc evidence.

## 1. Kết luận phạm vi sản phẩm

Lõi sản phẩm đã đủ để bảo vệ như một Mini PaaS một máy: triển khai từ GitHub, tự build Docker image, chạy Web Service độc lập, cấp URL HTTPS, quản lý vòng đời, log, CPU/RAM, biến môi trường, lịch sử release và rollback cục bộ. Webhook tự deploy khi push không thuộc phạm vi đã chốt; database hosting, nhiều replica, autoscaling và registry riêng là hướng phát triển.

Từ mốc này không nên thêm tính năng lớn trước khi hoàn tất hồ sơ. Công việc ưu tiên là thống nhất báo cáo, slide, video, bằng chứng và phần đóng góp cá nhân với RC2.

## 2. Các mốc kỹ thuật

### R1 — Chốt release candidate — đã đạt ngày 17/10/2026

- Đã chọn `v1.0.0-rc.2`, khóa kiến trúc và ghi tiêu chí tại `docs/release/RELEASE_CANDIDATE_2.md`.
- `make test`, deploy latest, T08, public HTTPS và ranh giới 401 đều đạt trên VPS; log tại `evidence/RELEASE/2026-10-17-v1.0.0-rc.2/`.
- RC2 giữ nguyên chức năng RC1 nhưng chuẩn hóa module Dashboard, Control API và Runner; runtime `2ce0e1c` đã được hồi quy đầy đủ.
- Đã quét evidence RC2; không phát hiện secret xác suất cao và không đưa database/file khóa vào gói bằng chứng.
- README đã ghi phiên bản Docker, Compose, Node.js, Nginx, Prometheus, Grafana, k6 và cloudflared.

### R2 — Sao lưu/khôi phục — đã đạt; chưa chứng minh 3–2–1

- T08 ngày 15/10 đã kiểm tra online backup, checksum, SQLite integrity, restore vào volume tạm và API phục hồi mà không thay đổi stack live.
- T08 được chạy lại trên runtime RC2 ngày 17/10 và đạt `PASS`.
- Database nhạy cảm được giữ ngoài repository.
- Chưa có evidence về hai loại phương tiện và một bản ngoài vị trí VPS; báo cáo không được tuyên bố đã đạt quy tắc 3–2–1.

### R3 — Chuẩn hóa bộ T01–T08 — đã cập nhật cho RC2 ngày 26/10/2026

- Ma trận tại `docs/test-plan/BANG_KIEM_THU_T01_T08.md` đã dùng RC2 làm phiên bản trình bày và giữ đúng commit/ngày của từng phép đo.
- T02–T05 và T07 được đối soát với hồi quy RC2 ngày 17/10; T08 được chạy lại trên runtime RC2.
- T06 giữ nguyên ba vòng dữ liệu gốc trên commit `5cc99b1`; báo cáo phải nêu rõ generator chạy cùng VPS và kết quả không đại diện SLA/production.
- Biên bản audit RC1 tiếp tục được giữ làm provenance cho evidence lịch sử, không bị gán thành evidence runtime RC2.
- T01 vẫn là `Đạt có lưu ý` vì thiếu raw log nguyên bản của lần dựng VPS sạch ngày 14/10.
- Các bài RC2 đã ghi người thực hiện Đỗ Sỹ Việt — B24DCCC287; T06 còn phải đối soát tên/MSSV người trực tiếp chạy.

Nếu muốn nâng T01 lên mức đầy đủ, phải dựng lại từ VPS/máy sạch và thu raw log mới, ghi rõ đây là lần chạy mới; không tạo lại hoặc bịa bằng chứng quá khứ.

### R4 — Đối chiếu kiến thức học phần — đã hoàn thành bản làm việc ngày 26/10/2026

- Đã lập ma trận kiến thức → triển khai → kiểm thử → giới hạn tại `docs/report/DOI_CHIEU_KIEN_THUC_MON_HOC.md`.
- Đã tách rõ Docker network với VLAN, giới hạn CPU với thuật toán lập lịch và container với VM.
- Đã chuẩn hóa cách diễn giải T06, PaaS/Cloud, backup 3–2–1 và ranh giới Docker socket.
- Cần rút gọn nội dung phù hợp để đưa vào báo cáo 12–18 trang và slide; không chép toàn bộ tài liệu làm việc vào phần nội dung chính.

## 3. Hồ sơ phải hoàn thiện

### Báo cáo 12–18 trang

- Chương 1: tổng quan, lý do chọn đề tài, phạm vi và giả định.
- Chương 2: Linux/process, mạng/DNS/HTTPS, file system, container/VM, PaaS, bảo mật và giám sát; dùng bản đối chiếu kiến thức làm khung.
- Chương 3: dùng bản thiết kế cuối RC2, sơ đồ mạng và luồng Git → build → image → deploy → route.
- Chương 4: triển khai trên macOS/VPS, Cloudflare Tunnel và hướng dẫn sử dụng.
- Chương 5: T01–T08, bảng số liệu T06, lỗi gặp phải và đánh giá.
- Chương 6: kết luận, giới hạn một host và hướng phát triển.
- Hoàn thiện tài liệu tham khảo, nguồn cấu hình và mục sử dụng AI; chuyển log/cấu hình dài sang phụ lục.
- Ghi nguồn bộ slide RIPT1304; nếu chưa đo loại file system hoặc chưa có backup ngoài VPS thì nêu rõ là khoảng trống.

### Video, slide và đóng góp cá nhân

- Video 5–7 phút: kiến trúc → tạo/deploy `demo` → URL public → log/metric → restart hoặc rollback → giới hạn.
- Slide phải dùng cùng commit và số liệu với báo cáo.
- Có đủ bốn phiếu đóng góp; mỗi người phải có file/cấu hình/thành phần kỹ thuật, commit hoặc đường dẫn và bằng chứng chạy thử riêng.

## 4. Phần không cần làm trước bản nộp

- Webhook tự deploy khi push.
- Repository riêng tư hoặc GitHub App.
- Database hosting.
- Nhiều replica, load balancing, autoscaling hoặc high availability.
- Registry riêng, image signing, SBOM, log tập trung hoặc Alertmanager.
- Xóa Web Service từ Dashboard.

Các mục trên chỉ nên làm sau khi báo cáo và hồ sơ bắt buộc đã hoàn tất; nếu không, ghi trung thực là giới hạn/hướng phát triển.

## 5. Thứ tự thực hiện đề xuất

1. ~~Chốt release candidate và chạy regression cuối.~~ Hoàn thành với `v1.0.0-rc.2`.
2. ~~Hoàn thiện ma trận T01–T08 và đối soát evidence theo mẫu thống nhất.~~ Hoàn thành kỹ thuật; còn xác nhận người thực hiện T06.
3. ~~Chốt sơ đồ kiến trúc và ma trận đối chiếu kiến thức môn học.~~ Hoàn thành; tiếp theo rút gọn vào báo cáo.
4. Hoàn thành báo cáo 12–18 trang và tài liệu tham khảo/AI.
5. Hoàn thành sản phẩm kỹ thuật và phiếu đóng góp cho bốn thành viên.
6. Làm slide, quay video trên RC2 và đóng gói hồ sơ.
