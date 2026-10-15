# Kết luận

Cloudflare Tunnel đã công khai Mini PaaS tại `https://paas.ai2p.id.vn` mà không mở cổng vào VPS. HTTPS, health, ranh giới chưa đăng nhập, đăng nhập/session, danh sách ứng dụng, đăng xuất, smoke và bộ P0.2 đã được kiểm tra bằng request thực.

Connector chạy bằng image ghim digest, tự khởi động lại, đọc token từ file `0600`, không ghi token vào Git/biến môi trường container, root filesystem read-only và metrics chỉ bind loopback. Token dùng lúc cài đặt đã được xoay để thu hồi giá trị cũ; connector nhận token mới qua file bảo mật, đăng ký lại bốn kết nối edge và 5/5 request health đều đạt.

Không tuyên bố high availability hoặc SLA: origin vẫn là một VPS, một Docker Engine, một Gateway và một connector replica. Đường VPS tự gọi ngược URL public có nhiễu DNS/IPv6 cục bộ; kết quả public chính lấy từ máy ngoài và ghi riêng giới hạn này thay vì loại bỏ dữ liệu bất lợi.
