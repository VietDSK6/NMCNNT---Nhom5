# Tóm tắt kiểm thử tải T06

| Mức | Mục tiêu | Thực tế | p95 | Lỗi | Dropped | CPU max A/B | RAM max A/B | Kết quả |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| low | 10 req/s | 10.02 req/s | 45.87 ms | 0% | 0 | 0.08% / 0.19% | 43.72 MiB / 43.32 MiB | Đạt |
| medium | 25 req/s | 25.01 req/s | 40.19 ms | 0% | 0 | 0.09% / 0.2% | 41.69 MiB / 46.06 MiB | Đạt |
| high | 50 req/s | 50.01 req/s | 48.81 ms | 0% | 0 | 0.1% / 0.21% | 39.74 MiB / 39.41 MiB | Đạt |

Kết luận tự động: **Đạt** theo ngưỡng của vòng chạy này.

> Đây là số liệu môi trường phát triển. Chỉ vòng chạy lặp lại trên VPS Linux với cấu hình tài nguyên được ghi rõ mới được dùng làm kết quả hiệu năng chính thức.
