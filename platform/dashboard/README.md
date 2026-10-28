# Hướng dẫn phát triển Dashboard Mini PaaS

Tài liệu này dành cho thành viên phụ trách giao diện. Dashboard dùng React, TypeScript và Vite; các API quản trị vẫn do Control API cung cấp qua Nginx Gateway.

## 1. Phạm vi được phép sửa

Phần giao diện nằm trong:

- `platform/dashboard/src/`: mã React/TypeScript.
- `platform/dashboard/src/styles.css`: style dùng chung.
- `platform/dashboard/src/features/`: các phần chức năng theo nghiệp vụ.
- `platform/dashboard/src/shared/`: hàm và nhãn dùng lại.
- `platform/dashboard/src/app/routing.tsx`: định tuyến phía trình duyệt.

Không tự ý thay đổi hợp đồng API, Control API, Runner, `compose.yaml` hoặc cấu hình Gateway. Nếu giao diện cần dữ liệu mới, ghi rõ nhu cầu trong pull request để nhóm thống nhất trước.

## 2. Yêu cầu môi trường

- Node.js 24 trở lên và npm.
- Docker Engine hoặc Docker Desktop/OrbStack.
- Git.

Kiểm tra phiên bản:

```bash
node --version
npm --version
docker compose version
```

## 3. Chuẩn bị repository

Từ thư mục gốc của repository:

```bash
git switch main
git pull --ff-only
git switch -c member/thao-dashboard-filter
cp .env.example .env
```

Mở `.env` và thay toàn bộ giá trị `CHANGE_ME...` bằng giá trị phát triển riêng. Không gửi nội dung `.env` cho người khác và không commit file này.

Cài đúng phiên bản thư viện đã khóa trong lockfile:

```bash
cd platform/dashboard
npm ci
```

Không dùng `npm install` chỉ để cài lại toàn bộ dependency vì có thể làm thay đổi `package-lock.json` ngoài ý muốn.

## 4. Chạy giao diện có cập nhật nóng

### Bước 1 — chạy hệ thống nền

Mở terminal thứ nhất tại thư mục gốc:

```bash
make up
```

Đợi các service đạt trạng thái khỏe rồi kiểm tra:

```bash
make status
curl -fsS http://127.0.0.1:8080/api/health
```

### Bước 2 — chạy Vite

Mở terminal thứ hai:

```bash
cd platform/dashboard
npm run dev
```

Mở `http://127.0.0.1:5173`. Đăng nhập bằng `ADMIN_USERNAME` và `ADMIN_PASSWORD` trong file `.env` của chính máy phát triển.

Vite chuyển tiếp các request `/api` tới Gateway tại `http://127.0.0.1:8080`, vì vậy đăng nhập và dữ liệu thật của stack vẫn hoạt động trong lúc giao diện được cập nhật nóng.

Nếu Gateway chạy ở cổng khác, tạo file `platform/dashboard/.env.local`:

```dotenv
DASHBOARD_PROXY_TARGET=http://127.0.0.1:CONG_GATEWAY
```

File `.env.local` đã nằm trong quy tắc bỏ qua của Git và không được commit.

## 5. Chạy bản gần giống môi trường phát hành

Sau khi sửa xong, dừng Vite bằng `Ctrl+C`, rồi tại thư mục gốc chạy:

```bash
docker compose build dashboard
docker compose up -d --no-deps --force-recreate dashboard
make test-p1-dashboard
```

Mở Dashboard qua Gateway tại `http://127.0.0.1:8080` nếu cần tự kiểm tra luồng thao tác. Không dùng địa chỉ Vite làm bằng chứng cho bản phát hành.

## 6. Các lệnh bắt buộc trước khi bàn giao

Tại `platform/dashboard`:

```bash
npm run typecheck
npm run build
```

Tại thư mục gốc, khi stack đang chạy:

```bash
make test-p1-dashboard
```

Theo quy tắc hiện tại của dự án, không cần chủ động kiểm tra responsive, chạy Playwright/CUA hoặc chụp ảnh giao diện. Tuy nhiên, typecheck, production build và kiểm thử chức năng liên quan vẫn bắt buộc.

## 7. Task FE đang giao

### FE-01 — tìm kiếm và lọc ứng dụng

Yêu cầu tối thiểu:

1. Tìm theo tên hiển thị, mã ứng dụng/slug hoặc repository.
2. Không phân biệt chữ hoa/chữ thường và bỏ khoảng trắng thừa ở đầu/cuối.
3. Có trạng thái rỗng rõ ràng khi không có kết quả.
4. Không gọi lại API sau mỗi ký tự nếu dữ liệu hiện đã có ở client.
5. Tách logic lọc thành hàm thuần để dễ kiểm thử.
6. Không làm thay đổi các màn chi tiết ứng dụng và thao tác vận hành hiện có.

Việc bổ sung thư viện test phải được thống nhất trước. Nếu chưa thêm test runner, ít nhất phải giữ logic lọc độc lập, chạy typecheck/build và mô tả các trường hợp đã kiểm tra trong pull request.

### Việc bổ sung nếu còn thời gian

- Lọc lịch sử deployment theo ứng dụng hoặc kết quả.
- Nút sao chép URL với phản hồi thành công/thất bại.
- Trạng thái chờ rõ ràng trong lúc build hoặc deploy.
- Chuẩn hóa các component trạng thái đang lặp lại.

## 8. Gợi ý vị trí mã nguồn

| Nhu cầu | Vị trí bắt đầu đọc |
|---|---|
| Danh sách và điều hướng ứng dụng | `src/App.tsx`, `src/features/applications/` |
| Kiểu dữ liệu API | `src/types.ts` |
| Hàm gọi API | `src/api.ts` |
| Đường dẫn Dashboard | `src/app/routing.tsx` |
| Nhãn và định dạng | `src/shared/labels.ts`, `src/shared/format.ts` |
| Style chung | `src/styles.css` |

Luồng dữ liệu cần giữ:

```text
Dashboard trên trình duyệt
        |
        | /api/v1/* và cookie phiên
        v
Vite proxy khi phát triển / Nginx Gateway khi phát hành
        |
        v
Control API
```

## 9. Quy tắc commit và pull request

Chỉ commit file thuộc task của mình:

```bash
git status --short
git diff
git add platform/dashboard
git commit -m "feat(dashboard): add application search and filters"
git push -u origin member/thao-dashboard-filter
```

Pull request cần ghi:

- Mục tiêu và phạm vi thay đổi.
- Danh sách file chính đã sửa.
- Lệnh kiểm tra đã chạy.
- Kết quả typecheck, build và integration test.
- Trường hợp lỗi hoặc quyết định kỹ thuật đã gặp.
- Ảnh giao diện chỉ thêm khi nhóm yêu cầu riêng.

Không sửa lịch sử commit, không dùng tên/email của người khác và không commit trực tiếp vào `main` cho task cá nhân.

## 10. Xử lý lỗi thường gặp

### Giao diện báo không kết nối được hệ thống

Kiểm tra Gateway và proxy:

```bash
curl -i http://127.0.0.1:8080/api/health
curl -i http://127.0.0.1:5173/api/health
```

Nếu lệnh đầu thất bại, kiểm tra `make status` và `make logs`. Nếu chỉ lệnh thứ hai thất bại, khởi động lại `npm run dev` và kiểm tra `DASHBOARD_PROXY_TARGET`.

### Đăng nhập không thành công

- Dùng đúng tài khoản trong `.env` tại thư mục gốc.
- Không dùng mật khẩu Grafana để đăng nhập Dashboard.
- Nếu vừa đổi `ADMIN_PASSWORD`, khởi động lại Control API và đăng nhập lại.

### Cổng 5173 đang được dùng

Vite sẽ chọn cổng kế tiếp và in URL trong terminal. Luôn mở đúng URL Vite đã thông báo.

### Build lỗi sau khi đổi dependency

Không xóa lockfile. Chạy lại:

```bash
rm -rf node_modules
npm ci
npm run typecheck
npm run build
```

Chỉ commit thay đổi `package.json` và `package-lock.json` khi task thực sự cần thêm hoặc nâng dependency và đã được review.
