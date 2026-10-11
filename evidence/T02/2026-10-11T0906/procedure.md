# Quy trình T02 vòng phát triển

## Mục tiêu

Xác nhận hai ứng dụng truy cập đúng qua Nginx Gateway và không có ánh xạ cổng trực tiếp ra máy chủ.

## Các kiểm tra

1. `GET /healthz` trả trạng thái Gateway.
2. Trang và endpoint `/health`, `/version` của App A truy cập được qua `/apps/app-a/`.
3. Trang và endpoint `/health`, `/version` của App B truy cập được qua `/apps/app-b/`.
4. `HostConfig.PortBindings` của App A và App B rỗng.
5. Đường dẫn không tồn tại trả mã HTTP 404.
6. Gateway ở cả mạng `edge` và `control`; các ứng dụng chỉ ở mạng `edge`.
