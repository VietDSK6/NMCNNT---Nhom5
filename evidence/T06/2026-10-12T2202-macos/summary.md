# Tóm tắt kiểm thử tải T06

| Mức | Mục tiêu | Thực tế | p95 | Lỗi | Dropped | CPU max A/B | RAM max A/B | Kết quả |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| low | 10 req/s | 10.02 req/s | 6.19 ms | 0% | 0 | 1.8% / 1.78% | 44.63 MiB / 42.34 MiB | Đạt |
| medium | 25 req/s | 25.02 req/s | 5.51 ms | 0% | 0 | 1.87% / 1.85% | 36.42 MiB / 40.12 MiB | Đạt |
| high | 50 req/s | 50.01 req/s | 7.32 ms | 0% | 0 | 1.99% / 1.96% | 55.8 MiB / 37.27 MiB | Đạt |

Kết luận tự động: **Đạt** theo ngưỡng của vòng chạy này.

> Đây là số liệu môi trường phát triển. Chỉ vòng chạy lặp lại trên VPS Linux với cấu hình tài nguyên được ghi rõ mới được dùng làm kết quả hiệu năng chính thức.
