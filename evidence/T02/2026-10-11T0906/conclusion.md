# Kết luận T02 vòng phát triển

Hai ứng dụng được định tuyến đúng qua một Nginx Gateway. App A và App B không có ánh xạ cổng ra máy chủ; chỉ Gateway bind `127.0.0.1:8080`. Endpoint trạng thái và phiên bản trả nội dung đúng, đường dẫn không tồn tại trả mã 404.

T02 đạt ở vòng phát triển trên macOS. Cần chạy lại trên VPS Linux và lưu ảnh/log chính thức trước khi dùng làm kết quả cuối kỳ.
