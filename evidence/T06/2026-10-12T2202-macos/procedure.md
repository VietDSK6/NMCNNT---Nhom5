# Quy trình T06 đã thực hiện

1. Xác nhận stack tám service đang chạy và Prometheus thu được metric App A/App B.
2. Chạy pilot 5/15/30 req/s trong 20 giây/mức để xác nhận kịch bản và bộ tổng hợp.
3. Warm-up vòng chuẩn ở 5 req/s trong 10 giây.
4. Chạy lần lượt 10, 25 và 50 req/s trong 60 giây/mức; request xen kẽ App A/App B qua Gateway.
5. Sau mỗi mức, chờ Prometheus scrape và lấy query range CPU, working set RAM, tỷ lệ RAM, health.
6. Tổng hợp kết quả và nén dữ liệu sự kiện k6 gốc bằng gzip.
7. Đối chiếu threshold; không chạy trình duyệt hoặc responsive vì T06 không thay đổi giao diện.

Pilot được lưu tại `../2026-10-12T2200-pilot-macos/`; bảng kết quả chính dùng vòng chuẩn trong thư mục hiện tại.
