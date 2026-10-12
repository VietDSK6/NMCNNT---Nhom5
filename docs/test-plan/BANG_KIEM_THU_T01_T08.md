# Bảng trạng thái kiểm thử T01–T08

> Bảng này chuyển các bằng chứng hiện có sang định dạng mới. Các dòng “Đạt vòng phát triển” chưa thay thế lần nghiệm thu release trên VPS Linux. Cột người thực hiện chưa có tên chính thức nên phải bổ sung trước khi nộp.

| Mã | Thời gian/môi trường | Đầu vào hoặc điều kiện trước | Thao tác | Kết quả mong đợi | Kết quả thực tế | Kết quả | Người thực hiện | Bằng chứng |
|---|---|---|---|---|---|---|---|---|
| T01 | 11/10/2026 09:06 +07; macOS ARM64, Docker 29.4.0 | Working tree P0.1, `.env` hợp lệ | Kiểm tra Compose, build và khởi động stack, chạy smoke test | Các service khỏe và dựng lại theo README | Compose hợp lệ; Gateway/App A/App B khỏe; smoke 9/9 | Đạt vòng phát triển | Chưa gán tên | `evidence/T01/2026-10-11T0906/` |
| T02 | 11/10/2026 09:06 +07; cùng môi trường T01 | App A/B v1 và Gateway đang chạy | Gọi route trang, health, version; inspect port/network | Đúng nội dung và phiên bản; app không publish cổng host | 9/9 smoke đạt; chỉ Gateway bind `127.0.0.1:8080` | Đạt vòng phát triển | Chưa gán tên | `evidence/T02/2026-10-11T0906/` |
| T03 | 11/10/2026; macOS ARM64, Docker 29.4.0 | App A v1; ảnh v2 trong catalog | Gửi update v2, kiểm tra endpoint version, đưa về v1 | Operation thành công và version đổi đúng | v1 → v2 → v1 đạt; operation và endpoint phản ánh đúng | Đạt vòng phát triển | Chưa gán tên | `evidence/T03/2026-10-11T2122/` |
| T04 | 11/10/2026; macOS ARM64, Docker 29.4.0 | App B đang chạy | Stop, quan sát lỗi Gateway, start, restart và kiểm tra health | Trạng thái phản ánh đúng và truy cập phục hồi | P0.2B 21 kiểm tra đạt; App B phục hồi khỏe | Đạt vòng phát triển | Chưa gán tên | `evidence/T04/2026-10-11T2122/` |
| T05 | 12/10/2026 +07; macOS ARM64, Docker 29.4.0 | Stack P0.2C khỏe; tạo request App A | Gọi API log/stats có và không có session; kiểm tra giới hạn | Có log/CPU/RAM/PID/mạng thật; request sai bị từ chối | P0.2C 12/12 đạt; có `stats-sample.json` | Đạt vòng phát triển | Chưa gán tên | `evidence/T05/2026-10-12-p0.2c/` |
| T06 | Chưa chạy | Chưa có môi trường tải chuẩn | Warm-up và chạy các mức tải bằng k6 | Có p95, thông lượng, tỷ lệ lỗi và metric tài nguyên qua nhiều lần đo | Chưa có dữ liệu | Chưa đạt/chưa chạy | Chưa phân công | `evidence/T06/` dự kiến |
| T07 | 11/10/2026; macOS ARM64 | Session thiếu/sai, action/version ngoài allowlist | Gọi API quản trị và Runner với đầu vào không hợp lệ | Trả 401/403/400 phù hợp; không thực thi action cấm; socket chỉ ở Runner | Các trường hợp xác thực, origin, `exec`, `latest` và socket boundary đạt | Đạt vòng phát triển | Chưa gán tên | `evidence/T07/2026-10-11-p0.2a.md`, `evidence/T07/2026-10-11-p0.2b.md` |
| T08 | Chưa chạy | Chưa có VPS/snapshot sạch release candidate | Dựng lại/khôi phục theo README | Hệ thống phục hồi không cần bước ngoài tài liệu | Chưa có dữ liệu | Chưa đạt/chưa chạy | Chưa phân công | `evidence/T08/` dự kiến |

## Khoảng trống phải xử lý

1. Gán tên thật của người chạy từng test.
2. Chạy lại T01–T08 trên release candidate/VPS Linux với commit và thời gian đầy đủ.
3. Tách từng trường hợp con thành dòng riêng nếu báo cáo cần đối chiếu chi tiết.
4. Lưu dữ liệu gốc T06 và metric cùng khoảng thời gian.
5. Không dùng các ảnh responsive lịch sử làm điều kiện nghiệm thu mới; quy tắc dự án hiện ưu tiên API/log/dữ liệu tự động.
