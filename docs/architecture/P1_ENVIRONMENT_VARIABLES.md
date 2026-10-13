# P1 — Quản lý biến môi trường ứng dụng

## Mục tiêu

Cho phép quản trị viên cấu hình tối đa 20 biến môi trường cho từng ứng dụng mẫu mà không sửa image Docker. Cấu hình được áp dụng ngay bằng cách tái tạo container qua Deployment Runner và được bảo toàn khi cập nhật phiên bản.

## Luồng xử lý

```text
Dashboard
  │ GET/PUT /api/v1/applications/:appId/environment
  ▼
Control API ── mã hóa AES-256-GCM ──> SQLite
  │ danh sách key/value đầy đủ qua mạng control nội bộ
  ▼
Deployment Runner
  │ Docker API: stop → rename → create → start → health → remove bản cũ
  ▼
Container App A/App B
```

Control API là nơi duy nhất đọc/ghi cấu hình. Runner không lưu bản sao giá trị và phản hồi không chứa giá trị biến. Tên các biến đang được Runner quản lý được ghi trong nhãn `io.mini-paas.environment-keys` để lần cấu hình sau có thể thay thế hoặc xóa đúng biến cũ.

## Hợp đồng và giới hạn

- Tên biến phải khớp `^[A-Z][A-Z0-9_]{0,63}$`.
- Tối đa 20 biến cho mỗi ứng dụng.
- Tối đa 2.048 byte mỗi giá trị và 8.192 byte tổng giá trị.
- Tên biến không được lặp.
- Các biến lõi `APP_ID`, `APP_NAME`, `APP_VERSION`, `PORT`, `NODE_ENV`, `PATH`, `HOME`, `HOSTNAME`, `NODE_OPTIONS` và tiền tố `DOCKER_`, `LD_` bị khóa.
- Cập nhật là thao tác thay thế toàn bộ danh sách. Gửi danh sách rỗng để xóa cấu hình tùy chỉnh.
- Giá trị thường được trả lại cho người quản trị. Giá trị đánh dấu nhạy cảm luôn trả `null`; gửi `null` cho secret đã tồn tại có nghĩa là giữ nguyên giá trị.

## Lưu trữ và bảo mật

Mọi giá trị, kể cả biến thường, được mã hóa AES-256-GCM trước khi ghi SQLite. Dữ liệu xác thực bổ sung gắn ciphertext với `applicationId` và tên biến, giúp phát hiện việc tráo bản ghi. Khóa lấy từ `ENVIRONMENT_ENCRYPTION_KEY`; môi trường phát triển cũ có thể tạm fallback về `RUNNER_SHARED_SECRET`.

Giá trị nhạy cảm không xuất hiện trong:

- phản hồi GET/PUT của Control API;
- audit event;
- log có cấu trúc của Control API và Runner;
- nhãn Docker.

Giá trị vẫn tồn tại trong `Config.Env` của Docker và có thể bị người có quyền Docker/host đọc. Vì vậy đây là quản lý secret cơ bản cho mô hình một máy, không thay thế Docker Secrets, Vault hoặc KMS.

## Tính nhất quán và phục hồi lỗi

Control API lưu cấu hình mới rồi yêu cầu Runner áp dụng. Nếu Runner thất bại, Control API khôi phục snapshot bản ghi trước đó. Runner đổi tên container cũ thành bản dự phòng tạm thời; chỉ xóa bản cũ sau khi container mới chạy thành công. Nếu tạo/khởi động bản mới lỗi, Runner xóa bản thay thế, đổi lại tên và khởi động container cũ.

Trong lúc áp dụng, Control API giữ khóa theo `appId` trong bộ nhớ và từ chối action/deployment khác của cùng ứng dụng; Runner vẫn có khóa riêng làm lớp bảo vệ cuối. Khóa Control API chưa bền vững qua lần khởi động lại, phù hợp mô hình một instance hiện tại nhưng phải thay bằng hàng đợi/lease bền vững nếu mở rộng nhiều replica.

Gateway dành tối đa 50 giây cho yêu cầu API vì tái tạo container phải chờ health check. Runner và Control API vẫn có timeout thấp hơn để không giữ kết nối vô hạn.

## Kiểm thử

Chạy:

```bash
make test-p1-environment
```

Bộ thử xác thực, khóa biến lõi, mã hóa/che secret, cấu hình container thật, bảo toàn biến qua cập nhật v1 → v2, xóa cấu hình, audit và đưa App A về v1. Kết quả ngày 13/10/2026: 21 kiểm tra đạt trên macOS/OrbStack; xem `evidence/P1-environment/2026-10-13-macos/`.
