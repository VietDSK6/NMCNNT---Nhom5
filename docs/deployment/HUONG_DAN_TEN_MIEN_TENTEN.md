# Cấu hình TenTen, Cloudflare DNS và Tunnel cho Mini PaaS

Tài liệu này phản ánh cấu hình đã nghiệm thu ngày 15/10/2026:

- tên miền gốc: `ai2p.id.vn` đăng ký tại TenTen;
- DNS có thẩm quyền: Cloudflare;
- URL Mini PaaS: `https://paas.ai2p.id.vn`;
- origin trên VPS: `http://127.0.0.1:8080`;
- VPS không cần nhận kết nối Internet trực tiếp tại cổng 80/443.

## 1. Luồng truy cập

```text
Người dùng Internet
        |
        | HTTPS cho paas.ai2p.id.vn
        v
Cloudflare Edge
        |
        | Cloudflare Tunnel, kết nối do VPS chủ động mở ra ngoài
        v
cloudflared trên VPS
        |
        | HTTP loopback
        v
127.0.0.1:8080 -> Gateway -> Dashboard / API / Apps / Grafana
```

Cloudflare kết thúc TLS ở phía Internet. Đoạn Cloudflare Edge tới connector vẫn đi trong Tunnel đã mã hóa; connector mới chuyển request bằng HTTP tới loopback cùng máy. Docker socket, Control API, Runner, Prometheus và các ứng dụng không có cổng public riêng.

## 2. Chuyển DNS từ TenTen sang Cloudflare

Cloudflare cấp hai nameserver cho zone này:

```text
carlos.ns.cloudflare.com
stella.ns.cloudflare.com
```

Tại `https://id.tenten.vn`, mở tên miền `ai2p.id.vn`, chọn **Cập nhật NS** rồi:

1. thay `ns-b1.tenten.vn`, `ns-b2.tenten.vn`, `ns-b3.tenten.vn` bằng hai nameserver Cloudflare phía trên;
2. để trống NS3;
3. tắt DNSSEC cũ trước khi đổi nếu registrar đang bật;
4. lưu và chờ Cloudflare báo zone `Active`.

Không xóa đăng ký tên miền tại TenTen và không chọn chuyển nhà đăng ký. TenTen vẫn quản lý gia hạn; Cloudflare chỉ quản lý DNS.

## 3. Bản ghi phải giữ khi chuyển DNS

Hai bản ghi Website Vercel đã được sao chép sang Cloudflare trước khi đổi nameserver:

| Loại | Tên | Giá trị | Trạng thái proxy |
|---|---|---|---|
| A | `@` | `76.76.21.21` | DNS only |
| CNAME | `www` | `cname.vercel-dns.com` | DNS only |

Nếu có MX/TXT phục vụ email hoặc xác minh thì cũng phải sao chép nguyên trạng. Không tạo `A paas` trỏ vào IP chiều ra của VPS và không dùng `REDIRECT`/`FRAME`.

Route Tunnel tự tạo bản ghi proxied:

```text
paas.ai2p.id.vn CNAME <tunnel-id>.cfargotunnel.com
```

Không sửa CNAME này bằng tay.

## 4. Tunnel và connector trên VPS

Tunnel có tên `mini-paas-vps`, route published application:

| Thuộc tính | Giá trị |
|---|---|
| Hostname | `paas.ai2p.id.vn` |
| Service URL | `http://127.0.0.1:8080` |
| Connector | `cloudflared` 2026.10.0 |
| Image | `cloudflare/cloudflared@sha256:9b49eed8f62806d5d45ddf59ecefb5710429598ea6d3fcccd2af938f621b2b07` |
| Restart policy | `unless-stopped` |
| Network mode | `host` |

Token connector không lưu trong Git, tài liệu, lệnh minh chứng hoặc biến môi trường của container. Trên VPS, token nằm tại:

```text
/home/user/.config/cloudflared/token
```

File có quyền `0600`. Container đọc token qua bind mount read-only và cờ `--token-file`; root filesystem của container là read-only, chạy UID/GID `1000:1000`, bỏ toàn bộ Linux capabilities và bật `no-new-privileges`.

Lệnh tái tạo connector sau khi token đã được cấp riêng trên VPS:

```bash
docker run -d \
  --name mini-paas-cloudflared \
  --restart unless-stopped \
  --network host \
  --user 1000:1000 \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=16m \
  --cap-drop ALL \
  --security-opt no-new-privileges:true \
  --mount type=bind,src=/home/user/.config/cloudflared/token,dst=/run/secrets/cloudflared-token,readonly \
  cloudflare/cloudflared@sha256:9b49eed8f62806d5d45ddf59ecefb5710429598ea6d3fcccd2af938f621b2b07 \
  tunnel --metrics 127.0.0.1:20241 run --token-file /run/secrets/cloudflared-token
```

Không thay đường dẫn token bằng token thật trong command history.

Nếu token từng xuất hiện trong chat, ảnh chụp, terminal hoặc nơi không kiểm soát, vào trang chi tiết Tunnel và chọn `Rotate token`. Ngay sau đó cập nhật file `/home/user/.config/cloudflared/token`, giữ quyền `0600`, rồi khởi động lại `mini-paas-cloudflared`. Token cũ sẽ mất hiệu lực; phải kiểm tra connector đăng ký lại đủ kết nối edge và URL public trả HTTP 200 trước khi kết luận hoàn tất.

## 5. Cấu hình Mini PaaS trên VPS

`.env` trên VPS phải có:

```dotenv
PUBLIC_ORIGIN=https://paas.ai2p.id.vn
SESSION_COOKIE_SECURE=true
SERVICE_BASE_DOMAIN=ai2p.id.vn
TRUSTED_GITHUB_OWNERS=VietDSK6,mait21606-coder,thaole-udud24,THM-B24DCCC206
```

Sau khi đổi giá trị, tái tạo `control-api`, `grafana` và `gateway` để origin, cookie và URL Grafana đồng bộ. File `.env` tiếp tục giữ quyền `0600`.

Khi chỉ thay `TRUSTED_GITHUB_OWNERS`, tái tạo `control-api` và `runner` vì cả hai thành phần đều kiểm tra lại owner trước khi nhận và build repository.

### Route wildcard cho Web Service

Trong **Cloudflare Dashboard → Zero Trust → Networks → Tunnels → mini-paas-vps → Published application routes**, giữ route chính xác:

```text
paas.ai2p.id.vn  ->  http://127.0.0.1:8080
```

và thêm route:

```text
*.ai2p.id.vn     ->  http://127.0.0.1:8080
```

Đặt route chính xác `paas.ai2p.id.vn` trước wildcard. Cloudflare tạo/nhắc tạo bản ghi DNS wildcard cho Tunnel; không tạo bản ghi A trỏ IP chiều ra VPS. Universal SSL của Cloudflare bao phủ domain gốc và wildcard cấp một, phù hợp các URL dạng `demo.ai2p.id.vn`; MVP không cấp hostname nhiều cấp như `a.b.ai2p.id.vn`.

Sau khi lưu, tạo một Web Service từ Dashboard rồi kiểm tra từ máy ngoài:

```bash
curl https://demo.ai2p.id.vn/health
curl https://demo.ai2p.id.vn/version
```

Không dùng URL `/apps/<slug>/` hoặc `/services/<slug>/` cho Web Service động. `paas.ai2p.id.vn` chỉ là Control Center; traffic của service được Gateway tách theo header `Host`.

## 6. Kiểm tra

Kiểm tra từ máy ngoài VPS:

```bash
dig +short NS ai2p.id.vn @1.1.1.1
curl https://paas.ai2p.id.vn/healthz
curl https://paas.ai2p.id.vn/api/health
```

Kết quả mong đợi:

- nameserver là `carlos.ns.cloudflare.com` và `stella.ns.cloudflare.com`;
- HTTPS hợp lệ, không dùng `-k`;
- Gateway trả `{"status":"ok","service":"gateway"}`;
- Control API trả `{"status":"ok","service":"control-api"}`;
- API quản trị chưa đăng nhập trả `401`;
- đăng nhập, đọc session, đọc danh sách ứng dụng và đăng xuất hoạt động qua cookie `Secure`.

Trên VPS:

```bash
docker ps --filter name=mini-paas-cloudflared
docker logs --tail 50 mini-paas-cloudflared
cd /home/user/mini-paas
docker compose ps
make smoke
```

Cảnh báo ICMP proxy do container bỏ capability không ảnh hưởng route HTTP. Không cấp thêm capability chỉ để loại cảnh báo này. Endpoint metrics của connector chỉ bind `127.0.0.1:20241`.

VPS hiện không có default route IPv6 toàn cục và DNS LAN có thể nhiễu khi chính VPS gọi ngược URL public. Bài nghiệm thu public ưu tiên máy ngoài; nếu cần chạy test từ VPS thì tách kiểm tra DNS công cộng và request IPv4/Cloudflare Edge. Không dùng hiện tượng này để kết luận Tunnel mất kết nối khi dashboard Cloudflare và bốn connector edge vẫn khỏe.

## 7. Vận hành và xử lý sự cố

- `502/503`: kiểm tra `curl http://127.0.0.1:8080/healthz` trên VPS và route Service URL.
- Tunnel `Down`: kiểm tra `docker ps`, `docker logs` và kết nối outbound; khởi động lại đúng container bằng `docker restart mini-paas-cloudflared`.
- Đăng nhập được nhưng POST bị `403`: kiểm tra `PUBLIC_ORIGIN` đúng chính xác `https://paas.ai2p.id.vn`.
- Cookie không được gửi: kiểm tra URL là HTTPS và `SESSION_COOKIE_SECURE=true`.
- Route báo trùng DNS: xóa bản ghi `paas` cũ trước khi để Tunnel tạo CNAME; không xóa bản ghi `@`/`www`.

## 8. Giới hạn độ ổn định

Cloudflare duy trì nhiều kết nối edge và container tự khởi động lại, nhưng hệ thống vẫn có các điểm lỗi đơn:

- một VPS;
- một Docker Engine và một Gateway;
- một đường Internet của VPS;
- một connector replica.

Cấu hình đủ cho bài tập lớn và demo có kiểm chứng, không được mô tả là high availability hoặc có SLA. Muốn tăng độ sẵn sàng cần thêm replica connector và origin ở host khác, sau đó kiểm thử failover riêng.

## 9. Hoàn tác

1. Xóa published route `paas.ai2p.id.vn` trong Tunnel.
2. Dừng/xóa container `mini-paas-cloudflared` nếu không còn route nào dùng.
3. Xóa file token trên VPS sau khi token đã bị xoay hoặc Tunnel bị xóa.
4. Chỉ đổi nameserver về TenTen nếu đã tạo lại đầy đủ bản ghi DNS tại TenTen; nếu không Website/email hiện có sẽ gián đoạn.

## Tài liệu tham khảo

- [Cloudflare — Set up Cloudflare Tunnel](https://developers.cloudflare.com/tunnel/get-started/), truy cập ngày 15/10/2026.
- [Cloudflare — Routing](https://developers.cloudflare.com/tunnel/concepts/routing/), truy cập ngày 15/10/2026.
- [Cloudflare — Full DNS setup](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/), truy cập ngày 15/10/2026.
- [TenTen — Đổi Name Server và DNS](https://support.tenten.vn/index.php?title=H%C6%B0%E1%BB%9Bng-d%E1%BA%ABn-c%E1%BA%A5u-h%C3%ACnh-%C4%91%E1%BB%95i-Name-server-v%C3%A0-DNS-t%C3%AAn-mi%E1%BB%81n-%E1%BB%9F-trang-IDTENTENVN&type=page&urlcode=412797), truy cập ngày 15/10/2026.
