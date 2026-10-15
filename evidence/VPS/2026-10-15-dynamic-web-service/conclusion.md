# Kết luận

Luồng Web Service động đã hoạt động trên VPS: Control API đăng ký service, Runner lấy đúng commit, build image, tạo container giới hạn quyền, Gateway định tuyến theo hostname và thao tác restart thành công. Kết quả này chứng minh service không còn chỉ là App A/B cố định hoặc đường dẫn con của Control Center.

Chưa thể kết luận URL service đã công khai hoàn chỉnh. Tại thời điểm kiểm tra, `vps-demo.ai2p.id.vn` chưa phân giải vì Cloudflare Tunnel/DNS chưa có wildcard `*.ai2p.id.vn`. Sau khi thêm published hostname trỏ về `http://127.0.0.1:8080`, phải kiểm tra lại HTTPS từ máy ngoài và bổ sung kết quả vào bộ bằng chứng.

Mã thử hiện dùng context `apps/app-a`, nên nội dung endpoint vẫn nhận diện là App A. Repository demo độc lập đã được chuẩn bị riêng để thay bằng sản phẩm tách biệt trong kịch bản demo cuối.
