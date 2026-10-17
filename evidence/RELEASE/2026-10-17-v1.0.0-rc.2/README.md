# Bằng chứng release candidate `v1.0.0-rc.2`

## Kết luận

RC2 đạt tiêu chí nghiệm thu trên VPS Debian 12. Mã runtime được kiểm thử tại commit `2ce0e1c1dedf03f84cb77a426559706d4982f2d6`; commit chứa evidence chỉ cập nhật phiên bản và hồ sơ phát hành, không thay đổi mã runtime.

Thời gian thực hiện: 17/10/2026, múi giờ `Asia/Ho_Chi_Minh`. Người thực hiện: Đỗ Sỹ Việt — B24DCCC287.

## Kết quả chính

| Hạng mục | Kết quả thực tế | Trạng thái |
|---|---|---|
| Backup trước triển khai | SQLite schema v6, integrity `ok`, đủ 4 ứng dụng và có SHA-256 | Đạt |
| Compose build/recreate | Image mới build thành công; 8/8 service khỏe | Đạt |
| Runner unit | 30/30 | Đạt |
| Control API unit | 14/14 | Đạt |
| Dashboard | TypeScript và Vite production build thành công | Đạt |
| P0.1 | 9/9 | Đạt |
| P0.2 | 15/15 | Đạt |
| P0.2B | 21 kiểm tra | Đạt |
| P0.2C | 12 kiểm tra | Đạt |
| P1 observability | 15 kiểm tra | Đạt |
| P1 Dashboard navigation | 11 kiểm tra | Đạt |
| P1 Environment Variables | 21 kiểm tra | Đạt |
| P2 rollback | 17 kiểm tra | Đạt |
| Deploy latest commit | 15/15; App A trở lại v1.0.0 | Đạt |
| T08 | Restore đủ 4 ứng dụng, API/Gateway đạt, stack live không đổi | Đạt |
| Public HTTPS | Bốn URL HTTP 200, TLS hợp lệ; health lặp 10/10 | Đạt |
| Ranh giới xác thực | API applications chưa đăng nhập trả HTTP 401 | Đạt |
| Secret scan | Không phát hiện file nhạy cảm hoặc mẫu secret xác suất cao | Đạt |

Không chạy responsive, Playwright, CUA hoặc chụp ảnh theo quy tắc dự án. Thay đổi Dashboard được kiểm chứng bằng production build và kiểm thử đường dẫn/API.

## File bằng chứng

- `vps-make-test.log`: log `make test` trên VPS.
- `vps-git-latest.log`: log triển khai commit mới nhất.
- `vps-t08.log`: log T08 đã làm sạch; không chứa database.
- `environment.md`: commit và phiên bản môi trường.
- `public-checks.txt`: kết quả HTTPS và ranh giới xác thực.
- `secret-scan.txt`: phạm vi, mẫu và kết quả quét bí mật.
- `test-record.md`: đầu vào, thao tác, kỳ vọng, thực tế và kết luận.
- `commands.txt`: lệnh tái lập không chứa thông tin xác thực.
- `checksums.sha256`: checksum các file evidence, không tự bao gồm chính nó.

Backup SQLite trước triển khai và bản sao T08 được giữ ngoài repository; `.env`, Tunnel token, cookie và database không nằm trong gói bằng chứng.
