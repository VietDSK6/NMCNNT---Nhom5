# Bản ghi kiểm thử release candidate

| Mã | Đầu vào/điều kiện | Thao tác | Kết quả mong đợi | Kết quả thực tế | Trạng thái | Bằng chứng |
|---|---|---|---|---|---|---|
| RC-01 | Commit `37289d8…`, stack VPS đang khỏe | `docker compose config --quiet`, `make test` | Config hợp lệ; unit/build/integration đạt | Toàn bộ bộ test đạt; App A kết thúc ở v1 | Đạt | `vps-make-test.log` |
| RC-02 | `origin/main` trỏ tới commit RC | `make test-p1-git-latest` | Phân giải SHA, build/deploy image, kiểm metadata và dọn trạng thái | 15 kiểm tra đạt; image/release ghi đúng SHA; App A về v1 | Đạt | `vps-git-latest.log` |
| RC-03 | Volume Control API live, không dừng stack | `make test-t08` | Backup có checksum, restore volume tạm, login/list apps/Gateway đạt, không đổi live stack | Integrity `ok`, đủ 4 app, HTTP 200, `LIVE_STACK_UNCHANGED=true` | Đạt | `vps-t08.log` |
| RC-04 | Tunnel và wildcard DNS hoạt động | Gọi Dashboard/API/2 hostname Web Service từ máy ngoài | Public HTTPS 200; API quản trị chưa đăng nhập 401 | Kết quả đúng kỳ vọng | Đạt | `public-checks.txt` |
| RC-05 | Cây Git và lịch sử đầy đủ | Quét file nhạy cảm và mẫu secret xác suất cao | Không có `.env`, database, private key, token hoặc cookie trong gói | Không phát hiện; `.env` được ignore | Đạt | `secret-scan.txt` |

Thời gian: 16/10/2026. Người thực hiện: chủ dự án; đối soát họ tên/mã sinh viên khi lập phiếu đóng góp.
