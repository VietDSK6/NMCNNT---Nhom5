# Bản ghi kiểm thử release candidate RC2

| Mã | Đầu vào/điều kiện | Thao tác | Kết quả mong đợi | Kết quả thực tế | Trạng thái | Bằng chứng |
|---|---|---|---|---|---|---|
| RC2-01 | Stack RC1 khỏe, SQLite live | Tạo backup trước khi cập nhật | Snapshot nhất quán, schema/checksum/integrity hợp lệ | Schema v6, integrity `ok`, đủ 4 app, có SHA-256 | Đạt | Nhật ký vận hành ngoài repository |
| RC2-02 | Commit `2ce0e1c…` trên VPS | Build/recreate và `make test` | Image build được; unit/build/integration đạt | 8/8 service khỏe; 30 + 14 unit, Dashboard build và 121 integration đạt | Đạt | `vps-make-test.log` |
| RC2-03 | `origin/main` trỏ tới commit runtime | `make test-p1-git-latest` | Phân giải SHA, build/deploy, ghi metadata và dọn trạng thái | 15/15 đạt; App A trở lại v1.0.0 | Đạt | `vps-git-latest.log` |
| RC2-04 | Volume Control API live | `make test-t08` | Backup/restore volume tạm, API/Gateway đạt, live stack không đổi | Integrity `ok`, đủ 4 app, HTTP 200, `LIVE_STACK_UNCHANGED=true` | Đạt | `vps-t08.log` |
| RC2-05 | Tunnel và wildcard DNS hoạt động | Gọi 4 URL và lặp health 10 lần từ máy ngoài | HTTPS hợp lệ và HTTP 200 ổn định | 4 URL đạt; health 10/10 | Đạt | `public-checks.txt` |
| RC2-06 | API quản trị public | Gọi applications không có session | Trả HTTP 401 | HTTP 401 | Đạt | `public-checks.txt` |
| RC2-07 | Cây Git và evidence RC2 | Quét file và mẫu secret xác suất cao | Không có secret/file nhạy cảm trong release | Không phát hiện | Đạt | `secret-scan.txt` |

Thời gian: 17/10/2026. Người thực hiện: Đỗ Sỹ Việt — B24DCCC287.
