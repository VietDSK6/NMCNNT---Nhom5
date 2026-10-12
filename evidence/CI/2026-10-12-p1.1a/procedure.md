# Quy trình kiểm thử CI nội bộ

## Mục tiêu

Xác minh cấu hình CI có thể được mô phỏng cục bộ, toàn bộ P0 không bị regression và ảnh App A/App B truy vết được về một commit hợp lệ.

## Các bước

1. Kiểm tra cú pháp shell, JavaScript, YAML và khoảng trắng Git.
2. Chạy unit test Runner, Control API và production build Dashboard.
3. Kiểm tra Compose và dựng stack một host.
4. Chạy toàn bộ regression P0.1, P0.2, P0.2B và P0.2C.
5. Chạy `make test-p1-1a` theo commit đã chốt.
6. Kiểm tra script từ chối SHA không hợp lệ trước khi gọi Docker build.
7. So khớp manifest với image ID và nhãn OCI thực tế trong Docker Engine.
8. Kiểm tra trạng thái cuối của sáu service.

Không chạy trình duyệt, Playwright/CUA, chụp ảnh giao diện hoặc kiểm tra responsive theo quy tắc dự án.
