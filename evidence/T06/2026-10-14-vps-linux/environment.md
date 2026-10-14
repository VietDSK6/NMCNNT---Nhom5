# Môi trường kiểm thử

- Thời gian: 14/10/2026, các vòng bắt đầu lúc 06:35:28Z, 06:40:02Z và 06:44:15Z.
- Máy chủ: VPS `vps2`, Debian GNU/Linux 12, kernel `6.1.0-53-cloud-amd64`, kiến trúc x86_64.
- Tài nguyên: 2 vCPU, khoảng 3,8 GiB RAM, 40 GB SSD và swap 2 GiB.
- Docker Engine: 29.9.0.
- Docker Compose: 5.6.0.
- Node.js: 24.21.0.
- Commit nền: `5cc99b12bd5f1218da063ce1a08b59a82c005d20`.
- k6: image `grafana/k6:2.3.0` được ghim bằng digest `sha256:9c2dee7f8ed74d317e4027c06a10f169b625638189de8d4555d0b3486a5aeb34`.
- Nguồn phát tải: container k6 chạy cùng VPS, kết nối tới `http://gateway:8080` qua mạng Docker `mini-paas-edge`.
- Đích thử: App A và App B qua Gateway; không gửi tải tới dịch vụ bên thứ ba.
- Ba mức: 10, 25 và 50 request/giây; 60 giây cho mỗi mức; warm-up 5 request/giây trong 10 giây.
- Ngưỡng: p95 dưới 500 ms, lỗi dưới 1%, check trên 99%, dropped iteration bằng 0 và hai ứng dụng khỏe trong toàn bộ mẫu Prometheus.

Swap được bật để giảm nguy cơ dừng tiến trình khi build/đo trên VPS 4 GB RAM. Trong các vòng đo này swap không được dùng tại thời điểm kiểm tra ngay sau khi kích hoạt; số liệu hiệu năng vẫn phải được hiểu trong phạm vi cấu hình nêu trên.
