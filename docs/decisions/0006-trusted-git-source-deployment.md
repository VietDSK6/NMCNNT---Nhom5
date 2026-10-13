# ADR 0006 — Chỉ build repository Git tin cậy theo commit bất biến

- Trạng thái: đã áp dụng và kiểm thử trên môi trường phát triển.
- Ngày: 12/10/2026.

## Bối cảnh

Mini PaaS cần chứng minh chức năng sản phẩm Git → build → image → deploy. Cho phép nhập URL hoặc Dockerfile tùy ý sẽ biến Runner thành dịch vụ thực thi mã không tin cậy trong khi Runner giữ Docker socket, vượt quá phạm vi an toàn của bài tập.

## Quyết định

- Source được khai báo cố định trong Runner và ánh xạ tới một ứng dụng cùng build context xác định.
- Người quản trị chọn `sourceId`, sau đó triển khai commit SHA đầy đủ hoặc yêu cầu commit mới nhất của nhánh mặc định đã khai báo.
- Khi chọn commit mới nhất, Runner đọc GitHub ref cố định, xác minh SHA 40 ký tự rồi chuyển về cùng luồng deployment bất biến; Dashboard không gửi tên nhánh.
- Runner tải archive theo commit từ URL đã khai báo, giới hạn kích thước, build qua Docker API rồi dùng cơ chế thay container có phục hồi hiện có.
- Control API lưu deployment riêng với operation vòng đời để phân biệt build/deploy với start/stop/restart/update image có sẵn.
- Runner có mạng egress riêng để tải source; mạng control vẫn internal.

## Hệ quả

Ưu điểm:

- Có luồng sản phẩm thật, truy vết được từ commit đến image và container.
- Có thao tác gần với PaaS thực tế để triển khai bản mới nhất nhưng vẫn lưu đúng SHA đã phân giải.
- Không công khai Docker socket hoặc nhận shell command.
- Có lịch sử, build log, audit và kiểm thử tự động.

Đánh đổi:

- Chưa phải nền tảng nhận repository bất kỳ như dịch vụ thương mại.
- Source mới phải được sửa cấu hình và review trước khi thêm.
- Runner vừa tải source, build và deploy nên vẫn là ranh giới đặc quyền lớn.
- Cần thêm registry nếu muốn phân phối image sang VPS khác hoặc truy vết bằng digest.

## Phương án không chọn

- Nhận URL/Dockerfile từ Dashboard: không chọn vì thiếu sandbox cho mã không tin cậy.
- Cho GitHub Actions SSH trực tiếp tới host: không chọn vì luồng triển khai phải thuộc sản phẩm và tránh cấp secret host cho workflow pull request.
- Chỉ hiển thị workflow CI nội bộ: không chọn vì không chứng minh trải nghiệm Mini PaaS triển khai ứng dụng từ Git.
