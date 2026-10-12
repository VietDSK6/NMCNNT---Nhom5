# Kế hoạch kiểm thử tải T06

## Điều kiện trước

- App A và App B ở v1.0.0, container khỏe.
- Gateway là đường vào duy nhất của request k6.
- Prometheus target Runner ở trạng thái `up` và đã có ít nhất hai mẫu.
- Không chạy build/deploy, test vòng đời hoặc tác vụ tải nặng khác trong lúc đo.
- Chỉ thử trên máy của nhóm hoặc VPS được phép.

## Trình tự

1. Ghi môi trường, base commit, Docker/Compose/k6 và thời gian UTC.
2. Warm-up 5 req/s trong 10 giây; nếu threshold thất bại thì dừng.
3. Chạy low, medium, high; giữa hai mức nghỉ 5 giây.
4. Sau mỗi mức chờ thêm 6 giây để Prometheus thu mẫu cuối.
5. Truy vấn range CPU, RAM và health từ 5 giây trước khi chạy đến 5 giây sau khi kết thúc.
6. Tổng hợp JSON/CSV/Markdown; nén raw k6 bằng gzip.
7. Kiểm tra stack còn khỏe và không có dữ liệu bí mật trong evidence.

## Tiêu chí chấp nhận

| Chỉ số | Điều kiện |
|---|---|
| p95 tổng và từng app | Dưới 500 ms |
| Tỷ lệ lỗi HTTP | Dưới 1% |
| Check HTTP/nội dung | Trên 99% |
| Dropped iteration | Bằng 0 |
| Health App A/App B | Mọi mẫu trong khoảng đo bằng 1 |
| Evidence | Có summary, raw k6, log, metric Prometheus, môi trường và mốc thời gian |

## Nghiệm thu VPS

Vòng Mac chỉ đạt mức phát triển. Vòng VPS phải chạy ít nhất ba lần cho mỗi mức, không thay đổi tài nguyên/ngưỡng giữa các lần và ghi rõ generator nằm cùng host hay host khác. Báo cáo phải trình bày median, độ dao động và giới hạn thay vì chỉ chọn lần nhanh nhất.
