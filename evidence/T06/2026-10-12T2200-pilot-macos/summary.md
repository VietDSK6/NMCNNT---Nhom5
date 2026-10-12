# Tóm tắt kiểm thử tải T06

| Mức | Mục tiêu | Thực tế | p95 | Lỗi | Dropped | CPU max A/B | RAM max A/B | Kết quả |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| low | 5 req/s | 5.05 req/s | 4.1 ms | 0% | 0 | 1.67% / 1.66% | 35.62 MiB / 36.28 MiB | Đạt |
| medium | 15 req/s | 15.04 req/s | 5.51 ms | 0% | 0 | 1.7% / 1.69% | 20.31 MiB / 20.22 MiB | Đạt |
| high | 30 req/s | 30 req/s | 4.54 ms | 0% | 0 | 1.73% / 1.72% | 21.14 MiB / 20.46 MiB | Đạt |

Kết luận tự động: **Đạt** theo ngưỡng của vòng chạy này.

> Đây là số liệu môi trường phát triển. Chỉ vòng chạy lặp lại trên VPS Linux với cấu hình tài nguyên được ghi rõ mới được dùng làm kết quả hiệu năng chính thức.
