# Môi trường kiểm thử

- Thời gian: `2026-10-15T14:36:05Z` đến `2026-10-15T14:36:15Z` (`21:36`, UTC+7).
- VPS: Debian GNU/Linux 12 (bookworm), x86_64, 2 vCPU, khoảng 3,8 GiB RAM.
- Docker Engine: `29.9.0`; Docker Compose: `5.6.0`.
- Commit: `c6b1be0aa4e0df184a301abb6999202fce26b2f4`.
- Volume nguồn: `mini-paas-control-data`; SQLite dùng WAL, schema `user_version=6`.
- Image helper/Control API: `mini-paas/control-api:p1-observability`.
- Backup riêng tư: thư mục `0700`; database và metadata `0600`; kích thước database 163.840 byte.
- Restore chỉ dùng volume tạm có tiền tố `mini-paas-t08-restore-*`; không ghi vào volume live.

Database backup thật chứa password/session hash và ciphertext nên không được đưa vào repository. `.env` và khóa mã hóa được giữ riêng trên VPS, không thuộc evidence.
