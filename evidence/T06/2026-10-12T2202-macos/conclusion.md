# Kết luận T06 vòng phát triển

Pipeline k6 → Gateway → App A/App B và Prometheus → tổng hợp hoạt động đúng. Cả ba mức tải chuẩn đạt ngưỡng ban đầu, không có lỗi HTTP, check sai hoặc iteration bị rơi; hai ứng dụng giữ health trong toàn bộ khoảng đo.

Không được kết luận Mini PaaS “chịu được 50 người dùng” hoặc có năng lực production từ kết quả này: request rate không tương đương số người dùng, endpoint thử nhỏ, generator dùng chung host và mỗi mức mới đo một lần. Giá trị của vòng này là chứng minh phương pháp, dữ liệu gốc và khả năng chạy lại. Kết luận hiệu năng cuối chỉ được viết sau khi lặp phép đo trên VPS Linux.
