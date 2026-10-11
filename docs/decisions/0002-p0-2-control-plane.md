# ADR 0002 — Control plane P0.2A không giữ quyền Docker

- Trạng thái: đã áp dụng trong P0.2A.
- Ngày: 11/10/2026.

## Bối cảnh

Dashboard cần đăng nhập, danh mục ứng dụng và trạng thái thực. Nếu Control API được mount Docker socket ngay, lỗi xác thực hoặc injection trong API có thể chuyển thành quyền kiểm soát host trước khi ranh giới Runner được kiểm thử.

## Quyết định

1. Dùng React/Vite/TypeScript cho Dashboard và Fastify/TypeScript cho Control API.
2. Dùng SQLite cho metadata nhỏ, session và audit của mô hình một host.
3. Control API chỉ ở mạng `control`, không publish port và không mount Docker socket.
4. API kiểm tra health/version qua Gateway; trạng thái runtime trả rõ `not_integrated`.
5. Nginx là cổng duy nhất cho Dashboard, API và hai app.
6. Session dùng cookie HttpOnly/SameSite; mật khẩu bootstrap lấy từ biến môi trường và chỉ lưu hash trong SQLite.
7. Ghim toàn bộ phiên bản npm bằng version chính xác và `package-lock.json`.

## Hệ quả

- Có thể hoàn thiện và test auth/UI/data flow trước khi cấp quyền cao cho Runner.
- Dashboard đã có dữ liệu thật nhưng chưa có lifecycle action hay trạng thái container.
- Kiểm tra app đi qua Gateway phản ánh đúng đường data plane nhưng tạo phụ thuộc vào Gateway.
- `node:sqlite` giảm dependency native, đổi lại có cảnh báo thử nghiệm trong Node.js 24; cần theo dõi hoặc thay adapter trước release nếu rủi ro không chấp nhận được.
