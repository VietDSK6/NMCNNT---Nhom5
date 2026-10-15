# Bảng tài nguyên, mạng/IP và quyền — VPS Debian 12

> Đối soát thực tế ngày 15/10/2026. Địa chỉ container do Docker cấp động; hệ thống định tuyến nội bộ bằng tên service. Không lưu mật khẩu, khóa SSH, token Tunnel hoặc secret ứng dụng trong tài liệu này.

## Máy chủ

| Thuộc tính | Giá trị thực tế |
|---|---|
| Tên máy | `vps2` |
| Hệ điều hành | Debian GNU/Linux 12, kernel `6.1.0-53-cloud-amd64`, x86_64 |
| Tài nguyên | 2 vCPU, khoảng 3,8 GiB RAM, 40 GB SSD |
| Swap | `/swapfile` 2 GiB, quyền `0600`, tự bật qua `/etc/fstab` |
| IP LAN của VPS | `10.10.20.101/24`, gateway `10.10.20.2` |
| IP Tailscale | `100.82.164.80` |
| Tên Tailscale | `vps2.tail5cce4c.ts.net` |
| IP Internet quan sát ở chiều ra | `42.113.103.176`; không có bằng chứng port forwarding chiều vào |
| Docker / Compose | Docker Engine 29.9.0 / Compose 5.6.0 |
| Node.js | 24.21.0, binary chính thức đã đối chiếu checksum |
| Mã nguồn | `/home/user/mini-paas`, nhánh `main` |

IP `42.113.103.176` là địa chỉ quan sát ở chiều ra, không được coi là IP gắn trực tiếp cho VPS. Thử kết nối từ ngoài tới cổng 80 đã timeout dù Nginx tạm thời lắng nghe. Cấu hình hiện dùng Cloudflare Tunnel outbound-only, không tuyên bố VPS có cổng Internet vào trực tiếp.

## Cổng và đường truy cập

| Lớp | Địa chỉ/cổng | Phạm vi | Mục đích |
|---|---|---|---|
| SSH | `tailscale0:22/tcp` | Chỉ tailnet | Quản trị VPS bằng khóa SSH |
| Tailscale | `41641/udp` | Mạng | Kết nối trực tiếp khi có thể |
| Gateway trên host | `127.0.0.1:8080` | Chỉ loopback VPS | Điểm vào duy nhất của Compose |
| Cloudflare Edge | `https://paas.ai2p.id.vn` | Internet | Kết thúc HTTPS và chuyển request vào Tunnel |
| Connector `cloudflared` | Outbound tới Cloudflare; origin `127.0.0.1:8080` | VPS | Nhận request từ Tunnel rồi chuyển tới Gateway loopback |
| HTTP/HTTPS host | `80/tcp`, `443/tcp` được UFW cho phép | Internet | Dự phòng tên miền trực tiếp; hiện không có dịch vụ host lắng nghe |
| Dashboard/API/Grafana/Apps | Không publish cổng riêng | Docker network | Chỉ đi qua Gateway |

Nginx cài trên host hiện dừng và bị vô hiệu hóa khi khởi động. Gateway trong Compose vẫn là Nginx riêng của dự án và chỉ bind loopback. Cloudflare kết thúc TLS cho `paas.ai2p.id.vn`; connector chuyển tiếp tới `http://127.0.0.1:8080`. Docker socket không được đưa ra Internet.

## Tường lửa và SSH

- UFW bật với mặc định chặn chiều vào, cho phép chiều ra.
- SSH cổng 22 chỉ được UFW cho phép trên interface `tailscale0`.
- Cho phép UDP 41641 cho Tailscale; TCP 80/443 đang mở ở tường lửa nhưng không có tiến trình host lắng nghe.
- `PasswordAuthentication no`, `KbdInteractiveAuthentication no`, `PermitRootLogin no`, `PubkeyAuthentication yes`.
- Khóa SSH riêng chỉ nằm trên máy quản trị, không commit vào repository.

## Ranh giới quyền

| Chủ thể | Quyền chính | Giới hạn/rủi ro |
|---|---|---|
| Người dùng Internet chưa đăng nhập | Mở Dashboard login và hai Web App qua Cloudflare | Không được gọi API quản trị thành công |
| Quản trị viên Mini PaaS | Quản lý ứng dụng qua Control API sau đăng nhập | Không truy cập Docker socket trực tiếp |
| Tài khoản Linux triển khai | Thuộc nhóm `docker`, quản lý Compose và đọc cấu hình VPS | Quyền nhóm `docker` gần tương đương root; chỉ cấp cho người vận hành tin cậy |
| Control API | Lưu SQLite, session, release và cấu hình ứng dụng đã mã hóa | Không gắn Docker socket |
| Runner | Điều khiển container App A/App B theo allowlist | Gắn Docker socket; nếu Runner bị chiếm quyền thì host có thể bị ảnh hưởng |
| Cloudflare Tunnel | Công khai HTTPS tới đúng Gateway loopback | Token connector là secret; Dashboard trở thành bề mặt Internet; phải giữ xác thực và cookie `Secure` |

## Cấu hình bảo mật ứng dụng trên VPS

- `PUBLIC_ORIGIN=https://paas.ai2p.id.vn`.
- `SESSION_COOKIE_SECURE=true`.
- `.env` có quyền `0600`; secret được sinh riêng trên VPS và không xuất hiện trong Git/minh chứng.
- Token Tunnel nằm ngoài repository tại `/home/user/.config/cloudflared/token`, quyền `0600`; container đọc bằng bind mount read-only và `--token-file`.
- Connector 2026.10.0 dùng image ghim digest, `restart=unless-stopped`, host network, root filesystem read-only, UID/GID `1000:1000`, bỏ capabilities và bật `no-new-privileges`.
- Chỉ repository/app tin cậy trong allowlist được build; chưa nhận mã tùy ý từ Internet.
- Các volume SQLite, Prometheus và Grafana còn là điểm trạng thái cục bộ; chưa có bản sao ngoài máy.

Tên miền dùng nameserver Cloudflare `carlos.ns.cloudflare.com` và `stella.ns.cloudflare.com`. Published route của Tunnel tự quản lý CNAME `paas`; hai bản ghi `@`/`www` phục vụ Vercel vẫn ở chế độ DNS only. Xem [hướng dẫn TenTen/Cloudflare](../deployment/HUONG_DAN_TEN_MIEN_TENTEN.md).
