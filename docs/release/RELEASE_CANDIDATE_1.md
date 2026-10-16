# Release candidate `v1.0.0-rc.1`

## Mục tiêu

Đây là bản ứng viên phát hành đầu tiên dùng để khóa phạm vi sản phẩm, chạy hồi quy cuối trên VPS và làm mốc thống nhất cho bộ bằng chứng, báo cáo, slide và video. Không bổ sung tính năng lớn sau mốc này; mọi thay đổi tiếp theo phải là sửa lỗi, tài liệu hoặc bằng chứng kiểm thử.

## Định danh

| Thuộc tính | Giá trị |
|---|---|
| Phiên bản sản phẩm | `1.0.0-rc.1` |
| Tag phát hành | `v1.0.0-rc.1` |
| File phiên bản | `VERSION` |
| Commit runtime đã kiểm thử | `37289d852a9e2078490e08528f925d0500781f96` |
| Nền tảng nghiệm thu | Debian GNU/Linux 12 (bookworm), `x86_64` |
| Miền quản trị | `https://paas.ai2p.id.vn` |
| Miền Web Service | `https://<slug>.ai2p.id.vn` |

Kết quả và log đã làm sạch nằm tại `evidence/RELEASE/2026-10-16-v1.0.0-rc.1/`. Commit chứa evidence chỉ bổ sung hồ sơ; sau khi đồng bộ commit được tag lên VPS, hệ thống phải qua thêm một vòng smoke và public health.

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

- [x] Working tree sạch và VPS chạy đúng commit được ghi trong bằng chứng.
- [x] `docker compose config --quiet` đạt.
- [x] Unit test, production build và toàn bộ integration trong `make test` đạt.
- [x] `make smoke` đạt trên VPS trong bộ hồi quy và được chạy lại sau commit hồ sơ.
- [x] Triển khai commit Git mới nhất đạt và hệ thống dọn trạng thái kiểm thử đúng quy định.
- [x] T08 restore rehearsal đạt trên đúng commit runtime của RC.
- [x] Control Center và các Web Service mẫu trả kết quả đúng qua HTTPS công khai.
- [x] Truy cập API quản trị khi chưa đăng nhập bị từ chối.
- [x] Repository và evidence không chứa `.env`, private key, cookie, token hay database nhạy cảm.
- [x] Bằng chứng có thời gian, commit, môi trường, lệnh và kết quả thực tế.
- [x] Tag `v1.0.0-rc.1` trỏ tới commit cuối chứa bằng chứng đã làm sạch.

## Ngoài phạm vi release

Webhook tự triển khai khi push, repository riêng tư, registry ngoài, database hosting, nhiều replica, autoscaling và high availability chưa thuộc bản này. Rollback vẫn phụ thuộc image ID cục bộ trên một Docker host.
