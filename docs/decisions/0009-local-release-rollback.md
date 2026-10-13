# ADR 0009 — Rollback theo release và image ID cục bộ

- Trạng thái: Chấp nhận
- Ngày: 13/10/2026

## Bối cảnh

Hệ thống đã có lịch sử deployment Git và cơ chế phục hồi ngay trong một lần thay container lỗi, nhưng chưa có mốc release chung cho cập nhật catalog và deployment Git, cũng chưa cho phép quản trị viên chủ động trở về một release cũ.

## Quyết định

Lưu release bất biến trong SQLite sau mỗi lần cập nhật/deploy thành công. Dashboard chỉ gửi `releaseId`; Control API đọc metadata đã lưu và Runner đối chiếu allowlist cùng image ID thực tế trước khi thay container. Mỗi rollback thành công lại tạo một release mới tham chiếu release đích.

Không tự build, pull hoặc nhận image tùy ý trong thao tác rollback. Nếu image cục bộ không còn hoặc tag đã đổi nội dung, hệ thống từ chối.

## Hệ quả

- Có thể trình diễn lịch sử phiên bản và rollback thật mà không mở rộng quyền của Dashboard/Control API.
- Image ID giúp tránh rollback nhầm khi một tag bị ghi đè.
- Biến môi trường hiện tại được giữ vì rollback dùng chung cơ chế thay container.
- Khả năng rollback phụ thuộc image còn tồn tại trên cùng Docker host.
- Registry digest vẫn là bước cần thiết để dựng lại release trên host khác hoặc sau khi image cache bị mất.
