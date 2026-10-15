# Kết luận

T08 đạt trên VPS Debian 12. Online backup tạo được SQLite snapshot nhất quán trong khi Control API live vẫn chạy. Database được phục hồi vào volume tạm, kiểm tra integrity/schema/số dòng khớp, sau đó chạy được một Control API tạm để đăng nhập, đọc đủ bốn ứng dụng và truy cập App A qua Gateway.

Bài thử không publish cổng mới, không thay database live và đã dọn sạch container/volume tạm. Sau thử nghiệm, tám service Compose, API public và Web Service `demo` vẫn khỏe.

Kết quả chứng minh khả năng sao lưu và diễn tập khôi phục metadata Control Plane trên cùng host với secret hiện hành. Nó chưa chứng minh phục hồi Docker image, metric Prometheus, metadata Grafana tùy chỉnh hoặc chuyển sang host khác khi thiếu image/khóa mã hóa.
