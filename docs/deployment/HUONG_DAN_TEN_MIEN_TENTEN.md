# Hướng dẫn cấu hình tên miền TenTen cho Mini PaaS

Tài liệu này áp dụng cho cấu hình hiện tại ngày 14/10/2026:

- Tên miền: `ai2p.id.vn`.
- Mini PaaS được công khai bằng Tailscale Funnel tại `https://vps2.tail5cce4c.ts.net`.
- Hai bản ghi đang dùng cho Vercel phải được giữ nguyên:
  - `@` — `A` — `76.76.21.21`;
  - `www` — `CNAME` — `cname.vercel-dns.com`.

## Phương án đang dùng

Tạo địa chỉ dễ nhớ `paas.ai2p.id.vn` và chuyển hướng người dùng sang địa chỉ HTTPS của Tailscale Funnel.

Đây là **chuyển hướng HTTP**, không phải trỏ trực tiếp tên miền vào VPS. Sau khi chuyển hướng, thanh địa chỉ của trình duyệt sẽ hiển thị `vps2.tail5cce4c.ts.net`. Cách này phù hợp với hạ tầng hiện tại vì VPS chưa nhận được kết nối Internet đi vào qua cổng 80/443 và chứng chỉ HTTPS của Funnel chỉ được cấp cho tên miền `*.ts.net`.

Không dùng `CNAME` từ `paas.ai2p.id.vn` tới `vps2.tail5cce4c.ts.net`: DNS vẫn giữ tên `paas.ai2p.id.vn` trong trình duyệt, dẫn đến chứng chỉ HTTPS không khớp tên miền. Không dùng loại `FRAME`: Gateway gửi chính sách không cho nhúng trang trong khung.

## Các bước trên trang TenTen

1. Đăng nhập trang quản lý DNS của `ai2p.id.vn`.
2. Kiểm tra tên miền vẫn dùng các máy chủ DNS của TenTen: `ns-b1.tenten.vn`, `ns-b2.tenten.vn`, `ns-b3.tenten.vn`.
3. Trong **Record đang sử dụng**, chọn **Thêm**.
4. Nhập bản ghi mới:

   | Trường | Giá trị |
   |---|---|
   | Tên | `paas` |
   | Loại | `REDIRECT` |
   | Giá trị | `vps2.tail5cce4c.ts.net` |
   | Độ ưu tiên | `0` hoặc để mặc định |

5. Lưu bản ghi. Không sửa hoặc xóa hai bản ghi `@` và `www` đang dùng cho Vercel.
6. Chọn **Cập nhật trạng thái DNS** nếu trang quản trị yêu cầu.
7. Chờ bản ghi có hiệu lực. Giao diện TenTen thông báo thời gian thường trong khoảng 3 giờ và có thể chậm tới 24 giờ.

TenTen yêu cầu giá trị của loại `REDIRECT` là tên miền nên không nhập đường dẫn `/`, không thêm cổng `8080`. Nếu giao diện cho phép nhập đầy đủ URL đích và bắt buộc giao thức, dùng `https://vps2.tail5cce4c.ts.net`; nếu không, giữ đúng hostname trong bảng trên.

## Kiểm tra sau khi cấu hình

Trước hết kiểm tra địa chỉ Funnel trực tiếp:

```bash
curl -I https://vps2.tail5cce4c.ts.net/
curl https://vps2.tail5cce4c.ts.net/healthz
```

Sau khi TenTen báo bản ghi đã có hiệu lực, mở:

```text
http://paas.ai2p.id.vn
```

Kết quả mong đợi:

1. Trình duyệt được chuyển sang `https://vps2.tail5cce4c.ts.net`.
2. Chứng chỉ HTTPS hợp lệ cho `vps2.tail5cce4c.ts.net`.
3. Trang đăng nhập Mini PaaS xuất hiện.
4. Đăng nhập, xem App A/App B và thực hiện thao tác quản trị không xuất hiện lỗi `Origin không hợp lệ`.

Có thể kiểm tra chuyển hướng bằng dòng lệnh:

```bash
curl -I http://paas.ai2p.id.vn
```

Phản hồi cần có mã chuyển hướng `301`, `302`, `307` hoặc `308` và tiêu đề `Location` trỏ tới `vps2.tail5cce4c.ts.net`.

## Nếu không hoạt động

- Nếu `paas.ai2p.id.vn` chưa phân giải: chờ thêm, rồi dùng nút **Cập nhật trạng thái DNS** của TenTen.
- Nếu mở tên miền nhưng không chuyển hướng: kiểm tra loại bản ghi là `REDIRECT`, không phải `CNAME` hoặc `FRAME`.
- Nếu trang chuyển tới `http://vps2.tail5cce4c.ts.net`: sửa đích trong tính năng chuyển tiếp Website của TenTen thành URL đầy đủ `https://vps2.tail5cce4c.ts.net`. Nếu gói TenTen không hỗ trợ chuyển tiếp HTTPS, dùng trực tiếp địa chỉ Funnel.
- Nếu Funnel không truy cập được: trên VPS chạy `sudo tailscale funnel status` và `docker compose ps` trong `/home/user/mini-paas`.
- Nếu đăng nhập được nhưng thao tác POST bị từ chối: kiểm tra `.env` trên VPS có `PUBLIC_ORIGIN=https://vps2.tail5cce4c.ts.net` và `SESSION_COOKIE_SECURE=true`, sau đó chạy `docker compose up -d --wait`.

## Muốn giữ `paas.ai2p.id.vn` trên thanh địa chỉ

Phương án chuyển hướng ở trên không giữ tên miền tùy chỉnh. Muốn dùng trực tiếp `https://paas.ai2p.id.vn`, nhóm phải bổ sung một điểm vào hỗ trợ tên miền tùy chỉnh và chứng chỉ TLS, chẳng hạn:

- cấu hình NAT/port forwarding 80/443 tới VPS rồi dùng reverse proxy và Let's Encrypt; hoặc
- dùng một tunnel hỗ trợ custom hostname, sau đó cập nhật `PUBLIC_ORIGIN=https://paas.ai2p.id.vn`.

Đây là phương án mở rộng. Không trỏ `A`/`CNAME` tùy ý khi chưa có đường mạng vào và chứng chỉ TLS phù hợp.

## Hoàn tác

Nếu cần bỏ địa chỉ phụ, chỉ xóa bản ghi `paas` loại `REDIRECT`. Việc này không ảnh hưởng Website chính vì hai bản ghi `@` và `www` được giữ nguyên.

## Tài liệu tham khảo

- [Tailscale CLI — Funnel](https://tailscale.com/docs/reference/tailscale-cli/funnel), truy cập ngày 14/10/2026.
- Giao diện quản lý DNS TenTen của chính tên miền `ai2p.id.vn`, đối chiếu ngày 14/10/2026.
