# ADR 0004 — Quan sát theo yêu cầu trước khi có hệ thống chuỗi thời gian

- Trạng thái: đã áp dụng trong P0.2C.
- Ngày: 12/10/2026.

## Bối cảnh

MVP cần cho quản trị viên xem log gần nhất và CPU/RAM thực tế. P1 dự kiến có cAdvisor, Prometheus và Grafana, nhưng đưa toàn bộ stack giám sát vào lúc control plane chưa hoàn tất sẽ tăng số service và làm mờ ranh giới nghiệm thu G2.

Docker Engine đã cung cấp log và stats cho container. Tuy nhiên Docker socket là quyền rất cao, dữ liệu log có thể lớn hoặc chứa thông tin nhạy cảm, còn endpoint stats cần thời gian lấy mẫu.

## Quyết định

1. Chỉ Deployment Runner đọc log/stats từ Docker Engine; Dashboard và Control API không có socket.
2. Dữ liệu được lấy khi quản trị viên yêu cầu, không gắn vào chu kỳ polling 5 giây của danh sách ứng dụng.
3. Chỉ App A/App B trong catalog được quan sát; không nhận container ID từ request.
4. Log bị giới hạn 200 dòng, 2 MiB dữ liệu thô mỗi yêu cầu và 4.096 ký tự mỗi dòng.
5. Control API yêu cầu session và chuyển lỗi Runner thành mã HTTP có kiểm soát.
6. Dashboard tải log/stats song song, hiển thị lỗi độc lập và bỏ phản hồi cũ khi người dùng đổi lựa chọn nhanh.
7. Không lưu snapshot vào SQLite; dữ liệu lịch sử thuộc Prometheus/Grafana ở P1.

## Hệ quả

- MVP có dữ liệu vận hành thật với ít service mới và giữ nguyên ranh giới quyền P0.2B.
- Dashboard không tạo tải Docker stats liên tục khi người quản trị không xem.
- Không có đồ thị lịch sử, truy vấn theo khoảng thời gian, cảnh báo hoặc phép tổng hợp; không được gọi P0.2C là hệ thống giám sát hoàn chỉnh.
- Giới hạn và che mẫu bí mật giảm rủi ro nhưng không bảo đảm log an toàn tuyệt đối.
- P1 có thể bổ sung Prometheus/Grafana mà không phải thay hợp đồng vòng đời ứng dụng hiện tại.
