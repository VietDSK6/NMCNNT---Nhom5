# Bằng chứng release candidate `v1.0.0-rc.1`

## Kết luận

Release candidate đạt các tiêu chí R1 trên VPS Debian 12. Mã runtime được kiểm thử tại commit `37289d852a9e2078490e08528f925d0500781f96`; commit chứa evidence chỉ bổ sung tài liệu và không thay đổi runtime. Tag `v1.0.0-rc.1` được tạo sau khi kiểm tra checksum, secret và một vòng smoke cuối trên đúng commit được tag.

Thời gian thực hiện: 16/10/2026, múi giờ `Asia/Ho_Chi_Minh`. Người thực hiện: chủ dự án; họ tên và mã sinh viên sẽ được đối soát khi lập phiếu đóng góp cá nhân.

## Kết quả chính

| Hạng mục | Kết quả thực tế | Trạng thái |
|---|---|---|
| Compose config | `docker compose config --quiet` trả exit code 0 | Đạt |
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
| Deploy latest commit | 15 kiểm tra; App A được đưa về v1 sau thử nghiệm | Đạt |
| T08 | Restore đủ 4 ứng dụng, login/API/Gateway đạt, stack live không đổi | Đạt |
| Public HTTPS | Dashboard/API/`demo`/`vps-demo` trả đúng mã HTTP và nội dung | Đạt |
| Ranh giới xác thực | API applications chưa đăng nhập trả HTTP 401 | Đạt |
| Stack VPS | 8/8 service chạy và khỏe; chỉ Gateway bind `127.0.0.1:8080` | Đạt |
| Secret scan | Không phát hiện file nhạy cảm hoặc mẫu secret xác suất cao trong cây/lịch sử Git | Đạt |

Không chạy kiểm tra responsive, Playwright, CUA hoặc chụp ảnh theo quy tắc dự án. Thay đổi Dashboard được bao phủ bằng production build và kiểm thử đường dẫn/API.

## File bằng chứng

- `vps-make-test.log`: log đầy đủ `make test` trên VPS.
- `vps-git-latest.log`: log triển khai commit mới nhất.
- `vps-t08.log`: log T08 đã làm sạch; không chứa database.
- `environment.md`: commit và phiên bản môi trường.
- `public-checks.txt`: kiểm tra HTTPS và trạng thái stack.
- `secret-scan.txt`: phạm vi và kết quả quét bí mật.
- `test-record.md`: đầu vào, thao tác, kỳ vọng, thực tế và kết luận.
- `commands.txt`: lệnh tái lập không chứa thông tin xác thực.
- `checksums.sha256`: checksum các file evidence, không tự bao gồm chính nó.

Bản sao SQLite của T08 được giữ ngoài repository tại thư mục riêng trên VPS với directory mode `0700` và file mode `0600`.
