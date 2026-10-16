# Release candidate `v1.0.0-rc.1`

## Mục tiêu

Đây là bản ứng viên phát hành đầu tiên dùng để khóa phạm vi sản phẩm, chạy hồi quy cuối trên VPS và làm mốc thống nhất cho bộ bằng chứng, báo cáo, slide và video. Không bổ sung tính năng lớn sau mốc này; mọi thay đổi tiếp theo phải là sửa lỗi, tài liệu hoặc bằng chứng kiểm thử.

## Định danh

| Thuộc tính | Giá trị |
|---|---|
| Phiên bản sản phẩm | `1.0.0-rc.1` |
| Tag dự kiến | `v1.0.0-rc.1` |
| File phiên bản | `VERSION` |
| Nền tảng nghiệm thu | Debian GNU/Linux 12 (bookworm), `x86_64` |
| Miền quản trị | `https://paas.ai2p.id.vn` |
| Miền Web Service | `https://<slug>.ai2p.id.vn` |

Commit chính xác và kết quả kiểm thử được ghi sau khi hoàn tất hồi quy. Tag chỉ được tạo khi các tiêu chí bên dưới đạt.

## Phiên bản môi trường đã chốt

| Thành phần | Phiên bản |
|---|---|
| Linux kernel | `6.1.0-53-cloud-amd64` |
| Docker Engine | `29.9.0` |
| Docker Compose | `5.6.0` |
| Node.js | `24.21.0` |
| Nginx | `1.28.3` |
| Prometheus | `3.14.0` |
| Grafana | `13.2.2` |
| k6 | `2.3.0`, image ghim bằng digest trong `Makefile` |
| cloudflared | `2026.10.0`, image ghim bằng digest trong cấu hình VPS |
| Dashboard | `0.2.0`, React `19.3.0`, Vite `8.3.4`, TypeScript `7.0.2` |
| Control API | `0.2.0`, Fastify `5.12.5`, TypeScript `7.0.2` |
| Deployment Runner | `0.2.0`, TypeScript `7.0.2` |

Các dependency Node chính xác còn lại nằm trong từng `package-lock.json`; không nâng dependency trong giai đoạn khóa release.

## Tiêu chí chấp nhận

- [ ] Working tree sạch và VPS chạy đúng commit được ghi trong bằng chứng.
- [ ] `docker compose config --quiet` đạt.
- [ ] Unit test, production build và toàn bộ integration trong `make test` đạt.
- [ ] `make smoke` đạt trên VPS.
- [ ] Triển khai commit Git mới nhất đạt và hệ thống dọn trạng thái kiểm thử đúng quy định.
- [ ] T08 restore rehearsal đạt hoặc được đối chiếu với bằng chứng hợp lệ trên cùng mã runtime.
- [ ] Control Center và các Web Service mẫu trả kết quả đúng qua HTTPS công khai.
- [ ] Truy cập API quản trị khi chưa đăng nhập bị từ chối.
- [ ] Repository và evidence không chứa `.env`, private key, cookie, token hay database nhạy cảm.
- [ ] Bằng chứng có thời gian, commit, môi trường, lệnh và kết quả thực tế.
- [ ] Tag `v1.0.0-rc.1` trỏ tới commit cuối chứa bằng chứng đã làm sạch.

## Ngoài phạm vi release

Webhook tự triển khai khi push, repository riêng tư, registry ngoài, database hosting, nhiều replica, autoscaling và high availability chưa thuộc bản này. Rollback vẫn phụ thuộc image ID cục bộ trên một Docker host.
