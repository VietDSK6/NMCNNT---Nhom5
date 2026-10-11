# Kết luận T03

T03 đạt trong môi trường phát triển: App A được thay container từ v1 sang v2, Gateway theo được IP container mới và endpoint phản ánh đúng phiên bản. Version ngoài danh sách cho phép bị từ chối. Sau kiểm thử, hệ thống được đưa về v1.0.0.

Kết quả không chứng minh zero-downtime, rollback lịch sử hoặc tính sẵn sàng cao. Phải đo thời gian gián đoạn riêng trên VPS nếu đưa các chỉ số đó vào báo cáo cuối kỳ.
