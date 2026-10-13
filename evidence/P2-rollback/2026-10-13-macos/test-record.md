# Bản ghi kiểm thử P2 Release History / Rollback

| Trường | Nội dung |
|---|---|
| Thời gian | 13/10/2026, UTC+7 |
| Đầu vào | App A; image catalog v1.0.0 và v2.0.0 đã chuẩn bị trên Docker host |
| Thao tác | Đăng nhập; cập nhật v2; đọc release; cập nhật v1; rollback release v2; kiểm tra API/container/audit; khôi phục v1 |
| Mong đợi | Release lưu đúng image ID; yêu cầu trái phép bị từ chối; rollback chạy đúng image/version; có audit; trạng thái cuối sạch |
| Thực tế | 17 kiểm tra đạt; container sau rollback dùng đúng image ID v2 đã ghi; App A được trả về v1 |
| Kết quả | Đạt vòng phát triển |

## Điều kiện đã xác nhận

- API release yêu cầu phiên đăng nhập.
- Cập nhật catalog thành công tạo release có image ID dạng `sha256`.
- Rollback chỉ nhận `releaseId`, không nhận image tùy ý từ Dashboard.
- Runner thay container về đúng image ID/version đã lưu.
- Bản ghi rollback tham chiếu release đích.
- Audit có hành động `release.rollback`.
- App A trở về v1.0.0 sau kiểm thử.

## Giới hạn

Kết quả dùng image cục bộ trên macOS/OrbStack. Chưa chứng minh khả năng rollback sau khi image bị xóa, chuyển host hoặc triển khai trên VPS Linux; các trường hợp đó cần registry digest và vòng nghiệm thu riêng.
