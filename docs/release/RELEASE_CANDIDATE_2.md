# Release candidate `v1.0.0-rc.2`

## Mục tiêu

RC2 phát hành đợt tái cấu trúc mã nguồn sau RC1: Dashboard được chia theo chức năng, Control API chia theo route và tầng dữ liệu, Runner tách trạng thái container cùng chính sách tài nguyên. Thay đổi không mở rộng chức năng sản phẩm, không đổi schema SQLite hoặc hợp đồng API.

## Định danh

| Thuộc tính | Giá trị |
|---|---|
| Phiên bản sản phẩm | `1.0.0-rc.2` |
| Tag phát hành | `v1.0.0-rc.2` |
| File phiên bản | `VERSION` |
| Commit runtime đã kiểm thử | `2ce0e1c1dedf03f84cb77a426559706d4982f2d6` |
| Nền tảng nghiệm thu | Debian GNU/Linux 12 (bookworm), `x86_64` |
| Miền quản trị | `https://paas.ai2p.id.vn` |
| Miền Web Service | `https://<slug>.ai2p.id.vn` |

Kết quả và log đã làm sạch nằm tại `evidence/RELEASE/2026-10-17-v1.0.0-rc.2/`. Commit chứa evidence và phiên bản chỉ bổ sung hồ sơ phát hành; mã runtime trùng với commit đã nghiệm thu nêu trên.

## Tiêu chí chấp nhận

- [x] Diff được kiểm tra, không có lỗi whitespace và hai file Word cá nhân không được đưa vào commit.
- [x] Backup SQLite trước triển khai có schema v6, integrity `ok` và checksum.
- [x] Compose build/recreate đạt; 8/8 service VPS chạy và khỏe.
- [x] Runner test, Control API test, Dashboard production build và toàn bộ integration đạt.
- [x] Deploy commit Git mới nhất đạt và App A được đưa về v1 sau thử nghiệm.
- [x] T08 restore rehearsal đạt trên commit runtime RC2 và không thay đổi stack live.
- [x] Control Center, API và hai Web Service động đạt qua HTTPS công khai.
- [x] API quản trị chưa đăng nhập trả HTTP 401.
- [x] Evidence không chứa `.env`, private key, cookie, token hoặc database nhạy cảm.
- [x] Không tuyên bố responsive cho phiên bản này vì không chạy kiểm tra trình duyệt.

## Phiên bản môi trường

| Thành phần | Phiên bản |
|---|---|
| Linux kernel | `6.1.0-53-cloud-amd64` |
| Docker Engine | `29.9.0` |
| Docker Compose | `5.6.0` |
| Node.js | `24.21.0` |
| Nginx | `1.28.3` |
| Prometheus | `3.14.0` |
| Grafana | `13.2.2` |
| Dashboard / Control API / Runner | `0.2.0`; dependency chính xác trong lockfile |

## Ngoài phạm vi

Webhook tự triển khai, repository riêng tư, registry ngoài, database hosting, nhiều replica, autoscaling và high availability vẫn nằm ngoài RC2. Rollback còn phụ thuộc image ID cục bộ trên một Docker host.
