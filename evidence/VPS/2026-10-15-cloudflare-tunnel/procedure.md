# Quy trình

1. Thêm zone `ai2p.id.vn` vào Cloudflare và sao chép nguyên trạng hai bản ghi Vercel.
2. Đổi nameserver tại TenTen sang hai nameserver Cloudflare được cấp.
3. Chờ Cloudflare xác nhận zone `Active` và đối chiếu qua resolver `1.1.1.1`, `8.8.8.8`.
4. Tạo Tunnel `mini-paas-vps` và một connector trên VPS.
5. Lưu token ngoài repository với quyền `0600`; chạy connector bằng image ghim digest, root filesystem read-only, bỏ capabilities và bật `no-new-privileges`.
6. Tạo published route `paas.ai2p.id.vn` tới `http://127.0.0.1:8080`.
7. Đặt `PUBLIC_ORIGIN=https://paas.ai2p.id.vn`, `SESSION_COOKIE_SECURE=true`; tái tạo Control API, Grafana và Gateway.
8. Kiểm tra DNS, TLS, health, 10 request lặp, truy cập chưa đăng nhập, đăng nhập/session/danh sách ứng dụng/đăng xuất từ máy ngoài.
9. Chạy `make smoke` và P0.2 qua URL public; kiểm tra lại sau khi tái tạo connector với metrics chỉ bind loopback.
10. Không chạy kiểm tra giao diện, responsive, Playwright hoặc chụp ảnh theo quy tắc chung của dự án.
