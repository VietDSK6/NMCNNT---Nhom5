# ADR 0003 — Cô lập quyền Docker tại Deployment Runner

- Trạng thái: đã áp dụng trong P0.2B.
- Ngày: 11/10/2026.

## Bối cảnh

Mini PaaS cần start, stop, restart và thay phiên bản container. Gắn Docker socket trực tiếp vào Control API sẽ ghép bề mặt Internet-facing, xác thực, lưu dữ liệu và quyền điều khiển host vào cùng một tiến trình. Điều này làm tăng hậu quả của lỗi API hoặc injection.

## Quyết định

1. Tạo Deployment Runner riêng, chỉ ở mạng `control`, không mở cổng host.
2. Chỉ Runner được gắn `/var/run/docker.sock`; Control API và Dashboard không có socket.
3. Runner dùng Docker Engine HTTP API qua Unix socket, không chạy Docker CLI hoặc shell command từ request.
4. Catalog trong mã nguồn cố định app, service, network, image và version được phép.
5. Control API và Runner đều khóa một action trên mỗi app; SQLite dùng unique index cho operation đang hoạt động.
6. Control API trả `202`, lưu trạng thái operation và audit kết quả.
7. Update dùng replace có bản dự phòng tạm; chỉ xóa container cũ sau khi container mới khỏe.
8. Nginx dùng Docker DNS động để theo container mới sau update.

## Hệ quả

- Lỗi thông thường ở Dashboard/Control API không trực tiếp trở thành lệnh Docker tùy ý.
- Ranh giới quyền rõ hơn và có thể kiểm thử bằng mount inspection, auth nội bộ và allowlist.
- Runner vẫn là thành phần đặc quyền cao; cô lập service không biến Docker socket thành quyền hạn chế thực sự.
- Catalog cố định làm giảm tính linh hoạt nhưng phù hợp với MVP gồm các ứng dụng mẫu tin cậy.
- Operation chưa có message broker; crash giữa chừng có thể cần đối soát và phục hồi thủ công.
