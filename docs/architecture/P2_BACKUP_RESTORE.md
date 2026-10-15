# Sao lưu và khôi phục trạng thái Control Plane

**Trạng thái:** T08 đã đạt vòng phát triển trên macOS/OrbStack ngày 15/10/2026; cần chạy lại trên VPS Linux trước khi đánh dấu nghiệm thu cuối.

## Phạm vi

Trạng thái nghiệp vụ quan trọng của Mini PaaS nằm trong `mini-paas-control-data/control.db`: người dùng, ứng dụng, operation, deployment, release, audit và biến môi trường đã mã hóa. Prometheus chỉ giữ chuỗi thời gian tối đa 7 ngày; dashboard Grafana được provisioning từ Git. Vì vậy T08 ưu tiên khôi phục SQLite và không tuyên bố đã sao lưu toàn bộ host Docker.

Không đưa `.env` vào archive. `ENVIRONMENT_ENCRYPTION_KEY`, mật khẩu quản trị, Runner secret và token Cloudflare phải được lưu riêng ngoài Git. Khôi phục SQLite mà thiếu đúng khóa mã hóa sẽ không đọc lại được biến môi trường ứng dụng.

## Luồng backup

```text
mini-paas-control-data (WAL đang hoạt động)
        |
        | node:sqlite online backup API
        v
control.db + summary.json + checksums.sha256
```

Helper dùng chính image Control API đã ghim, không có mạng, root filesystem chỉ đọc, bỏ toàn bộ capability và chỉ mount volume nguồn read-only. Online backup API tạo snapshot nhất quán thay vì sao chép trực tiếp file SQLite/WAL đang được ghi. Bản sao được kiểm tra `PRAGMA integrity_check`, `user_version`, số dòng các bảng và SHA-256.

## Luồng diễn tập restore

1. Xác minh checksum của `control.db` và `summary.json`.
2. Tạo volume mới có tiền tố `mini-paas-t08-restore-*`.
3. Helper không mạng chép database, đặt quyền `0600`, UID/GID 1000 và kiểm tra lại integrity/schema/số dòng.
4. Khởi động Control API tạm từ volume phục hồi trên mạng Docker nội bộ, không publish cổng host.
5. Đăng nhập bằng cấu hình hiện hành, đọc danh sách ứng dụng và gọi health App A qua Gateway.
6. Xác nhận Control API/Runner live vẫn chạy, sau đó xóa container và volume tạm.

`restore-control-data.sh` cố ý từ chối mọi volume không có tiền tố T08. Quy tắc này ngăn một lệnh thử nghiệm ghi đè `mini-paas-control-data`. Việc thay database live phải dừng Control API, tạo thêm một backup trước thay đổi và có xác nhận riêng của người vận hành; không tự động hóa thao tác phá hủy trong bài thử.

## Tiêu chí đạt

- Checksum trước restore đúng.
- `PRAGMA integrity_check` trả `ok` trước và sau restore.
- `user_version` và số dòng các bảng khớp bản nguồn.
- Control API tạm khỏe, đăng nhập HTTP 200 và đọc applications HTTP 200.
- Có tối thiểu hai ứng dụng trong dữ liệu phục hồi.
- Gateway vẫn phục vụ một ứng dụng thật.
- Container phục hồi không publish cổng và stack live không thay đổi.

## Giới hạn

- Archive chứa password/session hash và ciphertext nên vẫn phải xem là dữ liệu nhạy cảm.
- Không sao lưu Docker image; rollback sau khi mất host cần build lại từ Git hoặc registry digest, hiện chưa có registry.
- Không sao lưu chuỗi thời gian Prometheus hay metadata thay đổi thủ công trong Grafana.
- Diễn tập dùng cùng host và cùng secret hiện hành; chưa chứng minh khôi phục sang host khác nếu thiếu image hoặc khóa mã hóa.
