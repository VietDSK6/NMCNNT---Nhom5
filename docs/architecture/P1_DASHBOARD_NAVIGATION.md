# P1 — Kiến trúc thông tin và điều hướng Dashboard

**Trạng thái:** Đã triển khai và kiểm thử trên môi trường phát triển ngày 12/10/2026.

## 1. Vấn đề cần giải quyết

Dashboard trước đây đặt tổng quan, App A, App B, triển khai Git, thao tác, log, tài nguyên và kiểm toán trong một trang dài. Liên kết menu chỉ trỏ tới fragment `#...`, mục Tổng quan luôn được đánh dấu đang chọn và không có URL riêng cho từng ứng dụng. Cách này dùng được ở lát cắt đầu tiên nhưng không phản ánh đúng mô hình PaaS quản lý nhiều dịch vụ.

## 2. Quyết định thiết kế

Dashboard được chia thành hai phạm vi:

| Phạm vi | Đường dẫn | Mục đích |
|---|---|---|
| Toàn hệ thống | `/` | Tóm tắt tình trạng và hoạt động gần nhất |
| Toàn hệ thống | `/applications` | Danh mục ứng dụng |
| Toàn hệ thống | `/deployments` | Deployment của các ứng dụng |
| Toàn hệ thống | `/operations` | Lịch sử thao tác vòng đời |
| Toàn hệ thống | `/audit` | Nhật ký quản trị |
| Toàn hệ thống | `/observability` | Log và tài nguyên, có thể đổi ứng dụng |
| Một ứng dụng | `/applications/:appId` | Tổng quan, phiên bản và điều khiển vòng đời |
| Một ứng dụng | `/applications/:appId/deployments` | Source Git, tạo deployment và lịch sử của ứng dụng |
| Một ứng dụng | `/applications/:appId/environment` | Quản lý biến môi trường và secret cơ bản |
| Một ứng dụng | `/applications/:appId/observability` | Log và tài nguyên của ứng dụng |

Trang chi tiết dùng `appId` từ danh mục Control API. Deployment và operation được lọc theo cùng `applicationId`; App A và App B không còn bị trộn trong vùng thao tác chi tiết.

## 3. Cách triển khai

- `AppLink` dùng History API để thay URL mà không tải lại toàn bộ trang.
- Listener `popstate` đồng bộ nút Back/Forward của trình duyệt với React.
- Hàm `resolveRoute` chỉ nhận tập đường dẫn đã định nghĩa; route hoặc `appId` không tồn tại có trạng thái lỗi rõ ràng.
- Nginx Dashboard giữ SPA fallback về `index.html`, nhờ đó mở hoặc tải lại trực tiếp một đường dẫn chi tiết vẫn hoạt động.
- Không thêm thư viện router vì tập route hiện nhỏ, không có route động phức tạp hoặc phân quyền theo route.
- Liên kết tới ứng dụng mẫu `/apps/app-a/`, `/apps/app-b/` và Grafana vẫn là điều hướng thật qua Gateway, không bị `AppLink` chặn.

## 4. Phân cấp thông tin

```text
Tổng quan hệ thống
├── Danh sách ứng dụng
│   ├── App A
│   │   ├── Tổng quan và vòng đời
│   │   ├── Triển khai, release và rollback
│   │   ├── Biến môi trường
│   │   └── Log và tài nguyên
│   └── App B
│       ├── Tổng quan và vòng đời
│       ├── Triển khai/release (trạng thái chưa có source)
│       ├── Biến môi trường
│       └── Log và tài nguyên
├── Triển khai toàn hệ thống
├── Lịch sử thao tác
├── Nhật ký quản trị
└── Quan sát toàn hệ thống
```

Tổng quan hệ thống ưu tiên tín hiệu điều hành và đường dẫn tới ứng dụng. Chi tiết kỹ thuật được mở dần khi người quản trị chọn đúng dịch vụ, tránh biến trang đầu thành bảng dữ liệu kéo dài.

## 5. Kiểm thử

Lệnh riêng:

```bash
make test-p1-dashboard
```

Script `tests/integration/p1_dashboard_navigation.sh` gọi 11 URL qua Gateway, yêu cầu HTTP 200 và kiểm tra entrypoint React. Kết quả gần nhất ngày 13/10/2026: **11/11 đạt**. Hồi quy liên quan cũng đạt: P0.2B 21/21, P0.2C 12/12 và P1 observability 15/15.

Theo quy tắc dự án, thay đổi này không được mở trình duyệt, chụp ảnh hoặc kiểm tra responsive. Kết quả chỉ xác nhận typecheck, production build, định tuyến HTTP và các luồng tích hợp; không dùng để tuyên bố bố cục mới đã được xác minh responsive.

## 6. Giới hạn và hướng mở rộng

- Router tự viết chỉ nên giữ khi số route còn nhỏ. Nếu thêm nested layout, quyền theo vai trò hoặc nhiều trạng thái tải dữ liệu theo route, chuyển sang router chuyên dụng.
- API hiện trả một tập deployment/operation gần nhất; Dashboard lọc theo `applicationId`. Khi số ứng dụng/lịch sử tăng, cần lọc và phân trang phía Control API.
- App B chưa có source Git nên tab Triển khai hiển thị trạng thái chưa cấu hình, không giả lập form không hoạt động.
- Màn biến môi trường và lịch sử release/rollback đã được bổ sung ngày 13/10/2026. Release hiện phụ thuộc image cục bộ; registry digest và phân trang phía server vẫn là hướng phát triển.
