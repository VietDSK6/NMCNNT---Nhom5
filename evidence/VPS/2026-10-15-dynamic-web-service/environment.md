# Môi trường kiểm thử

- Thời gian: `2026-10-15T09:41:22Z` đến `2026-10-15T09:43:08Z` (`16:41` đến `16:43`, UTC+7).
- VPS: Debian 12, x86_64, 2 vCPU, khoảng 3,8 GiB RAM.
- Mã nguồn Mini PaaS: `2c8a4af1ea2292ebdb61071de740fd875d611624`.
- Gateway: `127.0.0.1:8080`, chỉ bind loopback.
- Cloudflare connector: container `mini-paas-cloudflared`, host network, restart `unless-stopped`.
- Repository nguồn thử: `https://github.com/VietDSK6/NMCNNT---Nhom5`.
- Nhánh/build context: `main`, `apps/app-a`.
- Service: `vps-demo`; hostname dự kiến `vps-demo.ai2p.id.vn`.

Kiểm thử public wildcard chưa thể hoàn tất vì DNS chưa có `*.ai2p.id.vn` tại thời điểm đo.
