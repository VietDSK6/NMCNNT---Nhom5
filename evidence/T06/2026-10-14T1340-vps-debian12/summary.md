# Tóm tắt kiểm thử tải T06

| Mức | Mục tiêu | Thực tế | p95 | Lỗi | Dropped | CPU max A/B | RAM max A/B | Kết quả |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| low | 10 req/s | 10 req/s | 58.92 ms | 0% | 0 | 0.04% / 0.15% | 35.11 MiB / 37 MiB | Đạt |
| medium | 25 req/s | 25.01 req/s | 19.83 ms | 0% | 0 | 0.05% / 0.16% | 38.02 MiB / 38.75 MiB | Đạt |
| high | 50 req/s | 50 req/s | 18.12 ms | 0% | 0 | 0.06% / 0.17% | 41.42 MiB / 40.64 MiB | Đạt |

Kết luận tự động: **Đạt** theo ngưỡng của vòng chạy này.

> Đây là số liệu môi trường phát triển. Chỉ vòng chạy lặp lại trên VPS Linux với cấu hình tài nguyên được ghi rõ mới được dùng làm kết quả hiệu năng chính thức.
