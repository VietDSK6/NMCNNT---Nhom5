# Môi trường kiểm thử Cloudflare Tunnel

- Thời điểm chính: `2026-10-15T08:34:44+0700`.
- Domain: `paas.ai2p.id.vn`.
- DNS có thẩm quyền: Cloudflare.
- VPS: Debian 12, x86_64, 2 vCPU, khoảng 3,8 GiB RAM.
- Gateway: `127.0.0.1:8080` trên VPS.
- Connector: `cloudflared` 2026.10.0.
- Image: `cloudflare/cloudflared@sha256:9b49eed8f62806d5d45ddf59ecefb5710429598ea6d3fcccd2af938f621b2b07`.
- Máy kiểm tra ngoài: macOS, truy cập URL public qua Internet.
- Không lưu token, mật khẩu, cookie hoặc khóa SSH trong evidence.

VPS không có default route IPv6 toàn cục. DNS LAN của VPS xuất hiện một lần phân giải lỗi khi VPS tự gọi ngược URL public; kiểm thử public chính được thực hiện từ máy ngoài, còn kiểm thử trên VPS được đối chiếu riêng với IPv4.
