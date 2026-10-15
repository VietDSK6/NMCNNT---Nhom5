# Quy trình T08

1. Cập nhật checkout VPS tới commit `c6b1be0`.
2. Tạo thư mục backup riêng ngoài repository, đặt quyền `0700`.
3. Chạy `make test-t08` với `T08_OUTPUT_DIR` trỏ vào thư mục riêng tư.
4. Helper không mạng mở SQLite nguồn read-only và dùng `node:sqlite` online backup API.
5. Kiểm tra integrity, schema, số dòng; sinh SHA-256 và summary.
6. Xác minh checksum rồi restore vào volume tạm mới.
7. Kiểm tra lại integrity/schema/số dòng trên database phục hồi.
8. Chạy Control API tạm không publish cổng; đăng nhập, đọc applications và gọi App A qua Gateway.
9. Xác nhận Control API/Runner live vẫn chạy.
10. Xóa container/volume tạm; kiểm tra không còn tài nguyên `mini-paas-t08-restore-*`.
11. Kiểm tra lại API public và Web Service `demo`.

Lần chạy VPS đầu phát hiện `copyFileSync` bị `EPERM` khi chép giữa bind mount và named volume trên Linux. Mã được đổi sang đọc/ghi byte trực tiếp, vẫn giữ checksum/integrity và ranh giới quyền; vòng chạy lại đạt toàn bộ tiêu chí.
