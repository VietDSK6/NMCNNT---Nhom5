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

Minh chứng hiện có:

- `T01`, `T02`: dựng stack và định tuyến P0.1 trên máy phát triển.
- `T03`, `T04`: cập nhật phiên bản và thao tác vòng đời P0.2B.
- `T05/2026-10-12-p0.2c`: log, snapshot tài nguyên và responsive P0.2C.
- `T07`: xác thực, allowlist và ranh giới Docker socket.
- `CI/2026-10-12-p1.1a`: kiểm thử cục bộ, image manifest và metadata GitHub Actions run số 1 của CI nội bộ; không phải bằng chứng FR09 của sản phẩm.
- `P1-GIT/2026-10-12T1201`: kiểm thử sản phẩm repository tin cậy → commit → build image → deploy App A; 10 kiểm tra đạt.

Các thư mục này là kết quả phát triển trên macOS/OrbStack nếu không ghi khác; nghiệm thu cuối phải tạo bộ bằng chứng mới trên VPS Linux.
