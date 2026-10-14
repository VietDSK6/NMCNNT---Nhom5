# Kết luận T06 trên VPS Linux

| Mức | Median thông lượng | Median p95 | Khoảng p95 qua 3 lần | Lỗi | Dropped |
|---|---:|---:|---:|---:|---:|
| 10 req/s | 10,02 req/s | 58,00 ms | 45,87–58,92 ms | 0% | 0 |
| 25 req/s | 25,01 req/s | 22,78 ms | 19,83–40,19 ms | 0% | 0 |
| 50 req/s | 50,01 req/s | 35,00 ms | 18,12–48,81 ms | 0% | 0 |

Cả chín tổ hợp lần đo/mức tải đều đạt ngưỡng. App A và App B khỏe trong toàn bộ mẫu Prometheus; không có request lỗi hoặc dropped iteration. Trong phạm vi 50 request/giây, chưa quan sát thấy dấu hiệu bão hòa CPU/RAM của hai ứng dụng mẫu.

p95 không tăng tuyến tính theo tải và dao động giữa các vòng. Điều này phù hợp với endpoint JSON nhỏ, nguồn phát tải cùng máy và ảnh hưởng lịch tiến trình/cache của hệ điều hành; không nên diễn giải một lần đo riêng lẻ là năng lực tối đa. Kết quả chỉ chứng minh cấu hình thử nghiệm đã đáp ứng ba mức tải đã định, không chứng minh SLA, nhiều người dùng đồng thời hay năng lực production.

Muốn xác định điểm bão hòa cần tách máy phát tải, tăng dần mức tải, theo dõi thêm Gateway/Control Plane và chạy lâu hơn. Việc đó nằm ngoài nghiệm thu T06 hiện tại.
