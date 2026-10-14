# Bảng tài nguyên, mạng/IP và quyền — VPS Debian 12

> Đối soát thực tế ngày 14/10/2026. Địa chỉ container do Docker cấp động; hệ thống định tuyến nội bộ bằng tên service. Không lưu mật khẩu, khóa SSH hoặc secret ứng dụng trong tài liệu này.

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

IP `42.113.103.176` là địa chỉ quan sát ở chiều ra, không được coi là IP gắn trực tiếp cho VPS. Thử kết nối từ ngoài tới cổng 80 đã timeout dù Nginx tạm thời lắng nghe, nên cấu hình hiện dùng Tailscale Funnel thay vì tuyên bố VPS có cổng Internet vào trực tiếp.

## Cổng và đường truy cập

| Lớp | Địa chỉ/cổng | Phạm vi | Mục đích |
|---|---|---|---|
| SSH | `tailscale0:22/tcp` | Chỉ tailnet | Quản trị VPS bằng khóa SSH |
| Tailscale | `41641/udp` | Mạng | Kết nối trực tiếp khi có thể |
| Gateway trên host | `127.0.0.1:8080` | Chỉ loopback VPS | Điểm vào duy nhất của Compose |
| Funnel | `https://vps2.tail5cce4c.ts.net` | Internet | Chuyển HTTPS công khai tới Gateway loopback |
| HTTP/HTTPS host | `80/tcp`, `443/tcp` được UFW cho phép | Internet | Dự phòng tên miền trực tiếp; hiện không có dịch vụ host lắng nghe |
| Dashboard/API/Grafana/Apps | Không publish cổng riêng | Docker network | Chỉ đi qua Gateway |

Nginx cài trên host hiện dừng và bị vô hiệu hóa khi khởi động. Gateway trong Compose vẫn là Nginx riêng của dự án và chỉ bind loopback. Tailscale Funnel kết thúc TLS rồi chuyển tiếp tới `http://127.0.0.1:8080`; Docker socket không được đưa ra Internet.

## Tường lửa và SSH

- UFW bật với mặc định chặn chiều vào, cho phép chiều ra.
- SSH cổng 22 chỉ được UFW cho phép trên interface `tailscale0`.
- Cho phép UDP 41641 cho Tailscale; TCP 80/443 đang mở ở tường lửa nhưng không có tiến trình host lắng nghe.
- `PasswordAuthentication no`, `KbdInteractiveAuthentication no`, `PermitRootLogin no`, `PubkeyAuthentication yes`.
- Khóa SSH riêng chỉ nằm trên máy quản trị, không commit vào repository.

## Ranh giới quyền

| Chủ thể | Quyền chính | Giới hạn/rủi ro |
|---|---|---|
| Người dùng Internet chưa đăng nhập | Mở Dashboard login và hai Web App qua Funnel | Không được gọi API quản trị thành công |
| Quản trị viên Mini PaaS | Quản lý ứng dụng qua Control API sau đăng nhập | Không truy cập Docker socket trực tiếp |
| Tài khoản Linux triển khai | Thuộc nhóm `docker`, quản lý Compose và đọc cấu hình VPS | Quyền nhóm `docker` gần tương đương root; chỉ cấp cho người vận hành tin cậy |
| Control API | Lưu SQLite, session, release và cấu hình ứng dụng đã mã hóa | Không gắn Docker socket |
| Runner | Điều khiển container App A/App B theo allowlist | Gắn Docker socket; nếu Runner bị chiếm quyền thì host có thể bị ảnh hưởng |
| Tailscale Funnel | Công khai HTTPS tới đúng Gateway loopback | Dashboard trở thành bề mặt Internet; phải giữ xác thực và cookie `Secure` |

## Cấu hình bảo mật ứng dụng trên VPS

- `PUBLIC_ORIGIN=https://vps2.tail5cce4c.ts.net`.
- `SESSION_COOKIE_SECURE=true`.
- `.env` có quyền `0600`; secret được sinh riêng trên VPS và không xuất hiện trong Git/minh chứng.
- Chỉ repository/app tin cậy trong allowlist được build; chưa nhận mã tùy ý từ Internet.
- Các volume SQLite, Prometheus và Grafana còn là điểm trạng thái cục bộ; chưa có bản sao ngoài máy.

Tên miền `paas.ai2p.id.vn` chỉ dùng để chuyển hướng sang URL Funnel theo [hướng dẫn TenTen](../deployment/HUONG_DAN_TEN_MIEN_TENTEN.md). Nó không thay đổi điểm kết thúc TLS hoặc `PUBLIC_ORIGIN`.
