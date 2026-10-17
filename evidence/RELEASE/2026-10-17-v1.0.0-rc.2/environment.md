# Môi trường nghiệm thu RC2

- Phiên bản: `1.0.0-rc.2`.
- Commit runtime: `2ce0e1c1dedf03f84cb77a426559706d4982f2d6`.
- Ngày: `2026-10-17`.
- VPS: Debian GNU/Linux 12 (bookworm), kernel `6.1.0-53-cloud-amd64`, kiến trúc `x86_64`.
- Tài nguyên VPS: 2 vCPU, 4 GB RAM, 40 GB SSD.
- Docker Engine: `29.9.0`.
- Docker Compose: `5.6.0`.
- Node.js: `24.21.0`.
- Nginx: `1.28.3`.
- Prometheus: `3.14.0`.
- Grafana: `13.2.2`.
- Dashboard/Control API/Runner: `0.2.0`; dependency đầy đủ nằm trong từng `package-lock.json`.
- Public origin: `https://paas.ai2p.id.vn`.
- Web Service kiểm tra: `https://demo.ai2p.id.vn`, `https://vps-demo.ai2p.id.vn`.

Kết quả chính thức của RC2 lấy từ VPS Linux. Vòng macOS/OrbStack trước đó cũng đạt unit, build và 121 kiểm tra tích hợp nhưng chỉ được dùng làm kiểm tra trước triển khai.
