# Bộ minh chứng T06 trên VPS Linux

Bộ minh chứng này tổng hợp ba vòng đo chuẩn độc lập trên cùng VPS ngày 14/10/2026. Dữ liệu gốc của từng vòng được giữ nguyên trong các thư mục lân cận:

- `../2026-10-14T1340-vps-debian12/`;
- `../2026-10-14T1345-vps-debian12-run02/`;
- `../2026-10-14T1350-vps-debian12-run03/`.

Mỗi thư mục có log k6 đã nén, dữ liệu request gốc đã nén, summary JSON/CSV và mẫu Prometheus về health, CPU, RAM. Vòng pilot nằm tại `../2026-10-14T1335-vps-pilot/` và chỉ dùng để xác minh kịch bản sau khi sửa quyền ghi bind mount trên Linux.

Các file trong thư mục tổng hợp:

- `environment.md`: cấu hình môi trường đo;
- `commands.txt`: lệnh đã chạy, không chứa bí mật;
- `test-record.md`: bảng kiểm thử đủ đầu vào, thao tác, kỳ vọng, thực tế và bằng chứng;
- `conclusion.md`: median, khoảng dao động và giới hạn diễn giải.

Các tệp `summary.json` do commit `5cc99b1` sinh ra còn trường `environment: development` và `summary.md` còn câu chú thích vòng phát triển. Đây là metadata cũ bị hard-code, không phải nơi chạy thực tế. `environment.txt` trong từng vòng ghi `host_arch=x86_64`, Docker/Compose/Node và commit; tài liệu tổng hợp này ghi đầy đủ Debian VPS. Trình tổng hợp đã được sửa sau phép đo để các lần sau không còn câu mô tả sai bối cảnh.
