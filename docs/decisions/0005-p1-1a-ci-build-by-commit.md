# ADR 0005 — Phân biệt CI nội bộ với luồng triển khai từ Git của sản phẩm

- Trạng thái: đã áp dụng; kiểm thử cục bộ và workflow GitHub đầu tiên đều đạt.
- Ngày: 12/10/2026.

## Bối cảnh

G3 yêu cầu truy vết từ commit đến ảnh và lần triển khai. Workflow GitHub hiện tại chạy trên repository chứa mã nguồn Mini PaaS nên chỉ kiểm tra chính nền tảng. Trong khi đó, chức năng gần với Vercel/Netlify phải là hành vi của sản phẩm: nhận một repository được cho phép, build một commit, lưu log/digest và tạo lần triển khai có thể theo dõi.

## Quyết định

Tách rõ hai phạm vi:

- CI nội bộ: kiểm tra mã, regression P0, build ảnh mẫu theo commit và lưu manifest/artifact; không có quyền ghi registry hoặc truy cập VPS.
- Luồng sản phẩm: quản trị viên đăng ký repository tin cậy, chọn commit, kích hoạt build, xem log, lưu registry digest và triển khai image nằm trong danh sách cho phép.

Ảnh do CI nội bộ tạo dùng tag `sha-<12 ký tự>`, đồng thời lưu commit đầy đủ trong nhãn OCI. GitHub Actions được ghim bằng SHA đầy đủ.

## Hệ quả

Ưu điểm:

- Chứng minh CI nội bộ và khả năng truy vết mà chưa cần cấp secret triển khai.
- Pull request không có đường tác động tới VPS.
- Có thể kiểm thử và sửa pipeline độc lập với registry/CD.
- Phân biệt rõ image ID cục bộ với registry digest.

Đánh đổi:

- CI nội bộ không được tính là tính năng triển khai ứng dụng từ Git của Mini PaaS.
- Artifact image manifest không thay thế registry.
- Cần triển khai thêm API, giao diện và lịch sử build/deploy ở bên trong sản phẩm.

## Phương án không chọn

- Cho GitHub Actions SSH trực tiếp vào VPS và chạy `docker compose`: chưa chọn vì chưa có remote, secret, allowlist release và quy trình khôi phục.
- Gắn Docker socket của máy phát triển vào self-hosted runner: không chọn vì tăng mạnh quyền của code trong pull request.
- Dùng tag `latest`: không chọn vì không truy vết được commit và có thể bị ghi đè.
