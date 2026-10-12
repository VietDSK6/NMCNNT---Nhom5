# Bản ghi kiểm thử T06

| Trường | Nội dung |
|---|---|
| Đầu vào | App A/B v1.0.0; Gateway; profile 10/25/50 req/s; 60 giây/mức |
| Thao tác | Warm-up, chạy k6 qua Gateway, lấy Prometheus range, tổng hợp dữ liệu |
| Mong đợi | p95 < 500 ms; lỗi < 1%; check > 99%; dropped = 0; có CPU/RAM/health |
| Thực tế | 5.103 request; p95 cao nhất 7,32 ms; lỗi 0%; check 100%; dropped 0; mọi mẫu health bằng 1 |
| Kết quả | Đạt vòng phát triển; chưa phải nghiệm thu VPS |
| Người thực hiện | Chưa gán tên; phải bổ sung trước khi nộp |
| Bằng chứng | Toàn bộ file trong thư mục hiện tại và pilot kế bên |
