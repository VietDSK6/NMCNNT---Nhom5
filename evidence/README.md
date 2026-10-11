# Quản lý minh chứng

Mỗi lần chạy kiểm thử tạo thư mục theo mẫu:

```text
evidence/TXX/YYYY-MM-DDTHHMM/
```

Nội dung tối thiểu:

- `environment.md`: môi trường và phiên bản công cụ.
- `procedure.md`: mục tiêu, điều kiện và các bước.
- `commands.txt`: lệnh đã chạy, không chứa bí mật.
- `result.txt`, `result.json` hoặc `result.csv`: dữ liệu thô.
- `logs/`: nhật ký đã làm sạch nếu cần.
- `screenshots/`: ảnh minh chứng nếu cần.
- `conclusion.md`: kết quả, sai lệch, giới hạn và kết luận.

Không chỉnh sửa dữ liệu thô để làm đẹp kết quả. Không lưu token, mật khẩu, cookie hoặc khóa riêng.
