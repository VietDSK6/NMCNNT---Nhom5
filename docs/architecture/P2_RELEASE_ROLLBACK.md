# P2 — Lịch sử release và rollback có kiểm chứng

## 1. Mục tiêu

Mini PaaS lưu một release bất biến sau mỗi lần cập nhật phiên bản từ catalog hoặc triển khai từ Git thành công. Quản trị viên có thể chọn một release cũ của đúng ứng dụng để thay container hiện tại bằng image đã ghi nhận, không cần build lại.

Đây là rollback trên một Docker host. Tính năng không được mô tả là zero-downtime, high availability hoặc rollback từ registry.

## 2. Luồng xử lý

```text
Dashboard
  │ GET /api/v1/releases
  │ POST /api/v1/releases/:releaseId/rollback
  ▼
Control API ── đọc release bất biến ──> SQLite
  │ appId + version + image reference + image ID + source/commit
  ▼
Deployment Runner
  │ kiểm tra allowlist và đối chiếu image ID trên Docker host
  │ stop → rename → create → start → health → remove bản cũ
  ▼
Container ứng dụng
```

Control API không nhận image reference tùy ý từ Dashboard. API chỉ nhận `releaseId`, sau đó đọc toàn bộ mục tiêu từ SQLite. Runner kiểm tra lại mục tiêu theo hai trường hợp:

- Release catalog phải khớp đúng cặp version/image đã khai báo cho ứng dụng.
- Release Git phải khớp source allowlist, commit SHA đầy đủ, version `git-<12 ký tự>` và image repository tương ứng.

Trong cả hai trường hợp, image ID phải là định danh nội dung cục bộ dạng `sha256:<64 ký tự>` và image reference hiện tại phải còn trỏ tới đúng image ID đã lưu. Đây không phải registry digest.

## 3. Dữ liệu release

Bảng `releases` lưu:

- ứng dụng và nguồn tạo release: `catalog`, `source` hoặc `rollback`;
- version, image reference và image ID;
- source, commit và deployment liên quan nếu có;
- release đích nếu bản ghi được tạo bởi rollback;
- người thực hiện và thời gian.

Migration 005 tự nhập các deployment Git thành công trước đây nếu chúng đã có đủ version, image reference và image ID. Mỗi rollback thành công tạo một release mới để lịch sử không bị sửa ngược.

## 4. Tính nhất quán và an toàn

- Control API và Runner cùng khóa theo `appId`, từ chối thao tác cạnh tranh.
- Runner không pull hoặc build khi rollback; image phải còn trên Docker host.
- Nếu tag bị dựng lại và trỏ tới image ID khác, thao tác trả `409 release_image_changed`.
- Cơ chế thay container giữ các biến môi trường đang được Mini PaaS quản lý.
- Container cũ chỉ bị xóa sau khi container thay thế đạt health check. Nếu thay thế thất bại, Runner cố gắng phục hồi container cũ.
- Audit lưu release đích, version và kết quả nhưng không lưu giá trị biến môi trường.

## 5. Giới hạn

- Image cục bộ có thể mất khi người vận hành xóa image hoặc chuyển sang host khác.
- Chưa có registry digest nên chưa thể khôi phục release trên một máy sạch chỉ từ metadata SQLite.
- Một replica bị dừng trong lúc thay container nên có gián đoạn ngắn.
- Khóa rollback tại Control API nằm trong bộ nhớ; mô hình hiện chỉ có một instance Control API.
- Chưa nghiệm thu trên VPS Linux.

## 6. Kiểm thử

Chạy:

```bash
make test-p2-rollback
```

Kịch bản đưa App A lên v2, lưu release cùng image ID, đưa về v1, rollback lại v2, đối chiếu container thật và audit, sau đó dọn App A về v1. Kết quả ngày 13/10/2026 trên macOS/OrbStack: 17 kiểm tra đạt.
