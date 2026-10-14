# Tóm tắt kiểm thử tải T06

| Mức | Mục tiêu | Thực tế | p95 | Lỗi | Dropped | CPU max A/B | RAM max A/B | Kết quả |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| low | 5 req/s | 5.05 req/s | 7.7 ms | 0% | 0 | 0.02% / 0.13% | 33.28 MiB / 36.09 MiB | Đạt |
| medium | 15 req/s | 15.05 req/s | 25.27 ms | 0% | 0 | 0.02% / 0.13% | 34.3 MiB / 36.3 MiB | Đạt |
| high | 30 req/s | 30 req/s | 33.2 ms | 0% | 0 | 0.03% / 0.14% | 34.3 MiB / 37 MiB | Đạt |

Kết luận tự động: **Đạt** theo ngưỡng của vòng chạy này.

> Đây là số liệu môi trường phát triển. Chỉ vòng chạy lặp lại trên VPS Linux với cấu hình tài nguyên được ghi rõ mới được dùng làm kết quả hiệu năng chính thức.
