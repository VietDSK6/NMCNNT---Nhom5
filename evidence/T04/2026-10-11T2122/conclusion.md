# Kết luận T04

T04 đạt trong môi trường phát triển. Runtime state, kết quả truy cập Gateway, operation và audit phản ánh đúng luồng dừng/khởi động/khởi động lại App B.

HTTP 502 hoặc 504 khi app dừng đều là kết quả hợp lệ tùy thời điểm DNS/kết nối upstream. Restart policy không tự khởi động container bị dừng có chủ đích và kết quả này không chứng minh failover sang host khác.
