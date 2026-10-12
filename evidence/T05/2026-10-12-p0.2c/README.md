# T05 — Log và snapshot tài nguyên P0.2C

## Mục tiêu

Xác nhận quản trị viên có thể đọc log gần nhất, CPU/RAM/PID/mạng của App A qua đúng chuỗi Dashboard → Control API → Runner → Docker Engine; request thiếu xác thực hoặc vượt giới hạn phải bị từ chối.

## Môi trường

- Ngày: 12/10/2026, múi giờ Asia/Ho_Chi_Minh.
- Máy phát triển: macOS 27.0 build 26A428, ARM64.
- Docker Client/Server: 29.4.0.
- Docker Compose: v5.1.2.
- Phạm vi: vòng phát triển trên OrbStack, không phải nghiệm thu VPS Linux.

## Quy trình

1. Dựng stack bằng Compose và chờ toàn bộ health check.
2. Tạo request thật tới `/apps/app-a/health` và `/apps/app-a/version` để có log.
3. Chạy `make test-p0-2c`.
4. Kiểm tra request thiếu session, tail 0/201 và app ngoài danh mục.
5. Kiểm tra response log tối đa 50 dòng, stream hợp lệ và độ dài dòng bị chặn.
6. Kiểm tra stats có số hữu hạn, giới hạn RAM dương, PID tối thiểu 1 và thời điểm lấy mẫu.
7. Gọi trực tiếp hai endpoint Runner không có secret và xác nhận HTTP 401.
8. Đăng nhập Dashboard, kiểm tra 1440×900, 768×1024, 390×844 và vùng log mobile.

## Kết quả

- Integration P0.2C: 12/12 kiểm tra đạt.
- Runner unit test: 9/9 đạt.
- Control API unit test: 7/7 đạt.
- Dashboard build: đạt.
- 6/6 service healthy sau kiểm thử.
- Không có tràn ngang tại ba kích thước; mobile giữ nút làm mới, chọn app, chọn số dòng và vùng bấm chính tối thiểu 44 px.
- Log mobile tự xuống dòng, viewer rộng 328 px và nội dung không vượt chiều rộng cuộn của viewer.

Dữ liệu thô đã làm sạch nằm trong [stats-sample.json](stats-sample.json). Ảnh:

- [Desktop 1440×900](screenshots/dashboard-desktop-1440x900.png)
- [Tablet 768×1024](screenshots/dashboard-tablet-768x1024.png)
- [Mobile 390×844](screenshots/dashboard-mobile-390x844.png)
- [Vùng log mobile](screenshots/log-mobile-390x844.png)

## Kết luận

T05 đạt ở mức phát triển cho đường thu thập log và snapshot tài nguyên. Kết quả chưa chứng minh hiệu năng, lịch sử giám sát hay hành vi trên Linux trực tiếp. Khi chuyển lên VPS phải lặp lại T05, ghi cấu hình máy và tách số liệu khỏi vòng macOS này.
