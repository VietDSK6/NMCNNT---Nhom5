# Quy trình T03

1. Khởi động stack và chuẩn bị ảnh `mini-paas/app-a:v1.0.0`, `mini-paas/app-a:v2.0.0`.
2. Đăng nhập Control API bằng tài khoản trong môi trường cục bộ.
3. Gửi operation update App A tới `v2.0.0`.
4. Chờ operation đạt `succeeded` và gọi endpoint `/apps/app-a/version` qua Gateway.
5. Gửi thử version `latest` để kiểm tra allowlist.
6. Gửi operation update App A về `v1.0.0` và kiểm tra lại endpoint.

Không ghi cookie, mật khẩu hoặc Runner secret vào minh chứng.
