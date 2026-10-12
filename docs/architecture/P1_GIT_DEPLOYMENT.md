# Kiến trúc P1 — triển khai ứng dụng từ commit Git tin cậy

## 1. Trạng thái

Lát cắt P1 này đã được kiểm thử trên môi trường phát triển ngày 12/10/2026. Người quản trị có thể chọn một repository nằm trong danh sách cho phép, nhập commit SHA đầy đủ, yêu cầu Mini PaaS tải snapshot mã nguồn, build image, thay container App A và xem lịch sử cùng build log.

Đây là luồng sản phẩm của Mini PaaS, khác với workflow GitHub Actions chỉ dùng để kiểm tra repository của chính nền tảng.

## 2. Luồng xử lý

```text
Quản trị viên
      |
      | sourceId + commit SHA 40 ký tự
      v
Dashboard -> Control API -> SQLite: deployment = queued
                 |
                 v
        Deployment Runner
          |          |
          |          +--> tải archive của commit từ URL cố định
          |          +--> giải nén vào tmpfs riêng
          |          +--> build context cố định qua Docker API
          |          +--> image mini-paas/app-a:git-<12 ký tự>
          v
     thay container App A có phục hồi khi lỗi
          |
          v
Control API lưu commit, image ID, build log, thời gian và kết quả
```

## 3. Thành phần và trách nhiệm

| Thành phần | Trách nhiệm |
|---|---|
| Dashboard | Hiển thị source được phép, nhận commit SHA, gửi deployment và đọc lịch sử/build log |
| Control API | Xác thực phiên, kiểm tra schema, tạo deployment bất đồng bộ, lưu SQLite và audit |
| Deployment Runner | Giữ allowlist source, tải archive, build image và thay container |
| Docker Engine | Build image, lưu image cục bộ và quản lý container |
| SQLite | Lưu trạng thái, commit, image, log, người yêu cầu và thời gian |

## 4. Ranh giới đầu vào

- API công khai không nhận URL repository, Dockerfile, build context, image hoặc lệnh shell tùy ý.
- Source `github-app-a` được khai báo trong mã Runner và ánh xạ cố định tới App A cùng thư mục `apps/app-a`.
- Commit phải là SHA viết thường đủ 40 ký tự; không nhận tên nhánh hoặc tag thay thế.
- Snapshot nguồn tối đa 16 MiB; thư mục tạm của Runner là tmpfs 128 MiB và có cờ `noexec,nosuid`.
- Build log lưu tối đa 64 KiB trong SQLite.
- Docker socket vẫn chỉ được gắn vào Runner.

## 5. Mạng

Mạng `control` tiếp tục là mạng nội bộ và không có đường ra Internet. Runner được nối thêm vào mạng `source-egress` để tải archive từ GitHub. Mạng này không publish cổng host và hiện chỉ có Runner tham gia.

Việc cấp egress cho thành phần có Docker socket làm tăng mức ảnh hưởng nếu Runner bị chiếm quyền. Phương án này chỉ phù hợp mô hình một host với repository tin cậy. Bản mở rộng nên tách build worker khỏi deployment worker và áp dụng policy egress chặt hơn.

## 6. Nhận dạng release

Với commit `093f1b29341accae2520ba5854db1a5a992b959f`:

```text
Version: git-093f1b29341a
Image:   mini-paas/app-a:git-093f1b29341a
Label:   org.opencontainers.image.revision=093f1b29341accae2520ba5854db1a5a992b959f
```

`imageId` hiện là định danh image trong Docker Engine cục bộ, không phải registry digest.

## 7. Kết quả kiểm thử

Lệnh:

```bash
make test-p1-git
```

Kết quả ngày 12/10/2026: 10 kiểm tra tích hợp đạt. Hệ thống đã tải 636.145 byte mã nguồn, build image, triển khai App A, xác minh phiên bản qua Gateway, kiểm tra nhãn revision và đưa App A về `v1.0.0` sau thử nghiệm.

## 8. Giới hạn

- Mới hỗ trợ một source GitHub công khai và App A.
- Chưa có webhook, chọn nhánh, theo dõi tiến độ build trực tiếp hoặc hủy build.
- Chưa đẩy image lên registry; không có registry digest, chữ ký image hoặc SBOM.
- Build Dockerfile vẫn là thao tác có đặc quyền cao. Chỉ commit trong repository nhóm kiểm soát mới được dùng; không coi đây là sandbox cho mã không tin cậy.
- Build và deployment đang nằm cùng Runner; chưa tách worker hoặc hàng đợi bền vững.
- Việc thay container có khoảng gián đoạn và chưa phải zero-downtime deployment.
