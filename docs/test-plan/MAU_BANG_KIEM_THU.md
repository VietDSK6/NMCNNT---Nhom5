# Mẫu bảng kiểm thử chính thức

Mỗi tình huống T01–T08 có ít nhất một dòng tổng hợp theo mẫu dưới đây. Nếu một test có nhiều lần đo, bảng tổng hợp liên kết tới file dữ liệu gốc thay vì chép toàn bộ số liệu vào ô.

| Mã test | Yêu cầu | Thời gian | Môi trường/commit | Đầu vào hoặc điều kiện trước | Thao tác | Kết quả mong đợi | Kết quả thực tế | Kết quả | Người thực hiện | Bằng chứng |
|---|---|---|---|---|---|---|---|---|---|---|
| TXX-01 | FRxx | YYYY-MM-DD HH:mm:ss +07:00 | OS, CPU/RAM, Docker, commit | Dữ liệu/phiên bản/trạng thái ban đầu | Các bước hoặc lệnh chính | Mã HTTP, trạng thái, metric hoặc hành vi dự kiến | Giá trị quan sát được, kể cả sai lệch | Đạt/Chưa đạt | TVx | Đường dẫn log/JSON/CSV |

## Quy tắc ghi

- “Kết quả thực tế” phải là dữ liệu quan sát, không chép lại nguyên văn kỳ vọng.
- Bằng chứng có dấu thời gian và commit; ảnh không thay thế log/dữ liệu máy đọc khi có thể thu thập tự động.
- Một test chưa chạy phải ghi “Chưa chạy”, không để trống hoặc đánh dấu đạt.
- Test thất bại vẫn được giữ lại; ghi nguyên nhân, bản sửa và lần chạy lại.
- Dữ liệu đo hiệu năng phải lưu file gốc, cấu hình tải, thời gian warm-up, số lần lặp và metric cùng thời điểm.

## Cấu trúc thư mục cho một lần chạy

```text
evidence/TXX/YYYY-MM-DDTHHMM/
├── environment.md
├── procedure.md
├── test-record.md
├── commands.txt
├── result.json hoặc result.csv
├── logs/
└── conclusion.md
```
