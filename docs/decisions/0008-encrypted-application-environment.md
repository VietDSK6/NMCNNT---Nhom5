# ADR 0008 — Lưu biến môi trường có mã hóa và áp dụng bằng cách tái tạo container

- Trạng thái: Chấp nhận
- Ngày: 13/10/2026

## Bối cảnh

Mini PaaS cần cho phép thay đổi cấu hình ứng dụng mà không build lại image. Control API không có Docker socket; Runner là ranh giới đặc quyền duy nhất. Một số giá trị có thể nhạy cảm và không được trả lại Dashboard sau khi lưu.

## Quyết định

Control API lưu toàn bộ giá trị bằng AES-256-GCM trong SQLite. API trả lại giá trị thường nhưng chỉ trả metadata của biến nhạy cảm. Khi lưu, Control API gửi danh sách đã kiểm tra sang Runner qua mạng nội bộ; Runner tái tạo container theo cùng cơ chế rollback đang dùng cho cập nhật phiên bản. Danh sách tên biến được ghi trong nhãn Docker để thay thế toàn bộ cấu hình có kiểm soát.

## Hệ quả

- Cấu hình tồn tại qua lần cập nhật image và có thể kiểm thử lại.
- Không đưa Docker socket sang Control API.
- Thay đổi biến gây một khoảng gián đoạn ngắn vì mô hình chỉ có một replica.
- Người có quyền Docker/host vẫn đọc được môi trường container.
- Mất hoặc đổi khóa mã hóa khiến các bản ghi cũ không giải mã được; khóa phải được sao lưu cùng quy trình vận hành nhưng không commit vào Git.
