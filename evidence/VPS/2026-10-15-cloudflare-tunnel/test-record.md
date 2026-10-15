# Bảng kiểm thử

| Mã | Đầu vào | Thao tác | Mong đợi | Thực tế | Kết quả | Bằng chứng |
|---|---|---|---|---|---|---|
| CF01 | Zone `ai2p.id.vn` | Truy vấn NS qua `1.1.1.1` và `8.8.8.8` | Hai NS Cloudflare | `carlos`, `stella` | Đạt | `result.txt`, 15/10/2026 |
| CF02 | Container connector | Kiểm tra trạng thái và cấu hình Docker | Running, restart tự động, token-file, giới hạn quyền | Đúng; token `0600`, rootfs read-only, bỏ capabilities | Đạt | `result.txt`, 15/10/2026 |
| CF03 | `https://paas.ai2p.id.vn/healthz` | Gọi từ máy ngoài, xác minh TLS | HTTP 200, TLS hợp lệ | HTTP 200, `ssl_verify=0` | Đạt | `result.txt`, 08:34 15/10/2026 |
| CF04 | Health public | Gọi lặp 10 lần từ máy ngoài | 10/10 HTTP 200 | 10/10 HTTP 200 | Đạt | `result.txt`, 08:34 15/10/2026 |
| CF05 | API chưa có cookie | Gọi danh sách ứng dụng | HTTP 401 | HTTP 401 | Đạt | `result.txt`, 15/10/2026 |
| CF06 | Tài khoản hợp lệ, cookie Secure | Login → session → applications → logout | 200/200/200/204; session cũ 401 | Đúng chuỗi trạng thái | Đạt | `result.txt`, 15/10/2026 |
| CF07 | Stack VPS | `make smoke` | 9/9 | 9/9 | Đạt | `result.txt`, 15/10/2026 |
| CF08 | P0.2 qua URL public | Chạy integration test | 15/15 | 15/15 | Đạt | `result.txt`, 15/10/2026 |
| CF09 | Connector được tái tạo | Bind metrics loopback, chờ 4 edge rồi gọi health 5 lần | Metrics không public, Tunnel phục hồi | `127.0.0.1:20241`, 4 edge, 5/5 HTTP 200 | Đạt | `result.txt`, 15/10/2026 |
| CF10 | VPS tự gọi URL public | So sánh curl mặc định và `-4` | Nhận diện ảnh hưởng IPv6/DNS của VPS | 29/30 so với 30/30; có một lỗi resolver LAN ở lần chạy khác | Ghi nhận giới hạn | `result.txt`, 15/10/2026 |
| CF11 | Token connector mới | Xoay token trên Cloudflare, cập nhật file `0600`, khởi động lại connector và gọi health 5 lần | Token cũ mất hiệu lực; connector và URL public phục hồi | 4 edge mới, pre-check đạt, 8/8 service khỏe, 5/5 HTTP 200 | Đạt | `result.txt`, 15/10/2026 |
