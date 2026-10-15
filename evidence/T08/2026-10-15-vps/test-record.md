# Bảng kiểm thử T08

| Mã | Đầu vào | Thao tác | Mong đợi | Thực tế | Kết quả | Bằng chứng |
|---|---|---|---|---|---|---|
| T08-01 | SQLite live ở WAL, volume nguồn read-only | Online backup sang thư mục riêng | Snapshot nhất quán, integrity `ok` | Integrity `ok`, schema v6, sinh SHA-256 | Đạt | `result.txt`, `backup-summary.json` |
| T08-02 | `control.db`, summary, checksums | Kiểm checksum trước restore | Tất cả checksum đúng | `control.db: OK`, `summary.json: OK` | Đạt | `result.txt` |
| T08-03 | Volume tạm rỗng | Restore và đối chiếu schema/số dòng | Khớp database nguồn | 7 nhóm bảng khớp; integrity `ok`; schema v6 | Đạt | `result.txt` |
| T08-04 | Database phục hồi và secret hiện hành | Chạy Control API tạm; đăng nhập và đọc applications | HTTP 200; đủ dữ liệu ứng dụng | Login 200, applications 200, đủ 4 slug | Đạt | `result.txt` |
| T08-05 | Gateway live | Gọi App A từ API phục hồi | HTTP 200 và health `ok` | HTTP 200, App A `v1.0.0` | Đạt | `result.txt` |
| T08-06 | Container phục hồi | Inspect port binding | Không publish host port | `{}` | Đạt | `result.txt` |
| T08-07 | Kết thúc bài thử | Kiểm tra stack và tài nguyên tạm | 8 service live; không còn container/volume tạm | 8/8 service chạy; danh sách tạm rỗng | Đạt | `result.txt` |
| T08-08 | URL public | Gọi API và `demo` sau bài thử | Hai endpoint tiếp tục khỏe | API `ok`; demo `git-6ffa63d8b922` | Đạt | `result.txt` |
