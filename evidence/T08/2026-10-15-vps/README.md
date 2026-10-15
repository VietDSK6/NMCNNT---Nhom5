# Bằng chứng T08 — sao lưu và khôi phục Control Plane trên VPS

Bộ này chỉ lưu metadata và kết quả đã làm sạch. File database backup thật nằm ngoài repository tại thư mục quyền `0700` trên VPS; `control.db`, summary và checksum có quyền `0600`.

- `environment.md`: môi trường, commit và ranh giới dữ liệu.
- `procedure.md`: các bước diễn tập không phá stack live.
- `test-record.md`: đầu vào, kỳ vọng, thực tế và kết luận.
- `result.txt`: kết quả kỹ thuật đã loại bỏ secret/database.
- `backup-summary.json`: metadata không chứa giá trị dữ liệu.
- `conclusion.md`: kết luận và giới hạn.
- `checksums.sha256`: checksum các file evidence được phép commit.

Không lưu `control.db`, `.env`, cookie, mật khẩu, token Cloudflare, Runner secret hoặc khóa mã hóa trong Git.
