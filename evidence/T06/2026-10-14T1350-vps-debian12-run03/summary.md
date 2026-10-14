# Tóm tắt kiểm thử tải T06

| Mức | Mục tiêu | Thực tế | p95 | Lỗi | Dropped | CPU max A/B | RAM max A/B | Kết quả |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| low | 10 req/s | 10.02 req/s | 58 ms | 0% | 0 | 0.12% / 0.23% | 39.5 MiB / 35.92 MiB | Đạt |
| medium | 25 req/s | 25.01 req/s | 22.78 ms | 0% | 0 | 0.13% / 0.24% | 42.06 MiB / 38.65 MiB | Đạt |
| high | 50 req/s | 50.01 req/s | 35 ms | 0% | 0 | 0.14% / 0.25% | 37.93 MiB / 39.44 MiB | Đạt |

Kết luận tự động: **Đạt** theo ngưỡng của vòng chạy này.

> Đây là số liệu môi trường phát triển. Chỉ vòng chạy lặp lại trên VPS Linux với cấu hình tài nguyên được ghi rõ mới được dùng làm kết quả hiệu năng chính thức.
