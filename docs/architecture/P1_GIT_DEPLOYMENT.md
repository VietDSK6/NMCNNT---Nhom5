# Kiến trúc P1 — triển khai ứng dụng từ commit Git tin cậy

## 1. Trạng thái

Lát cắt P1 này được kiểm thử trên môi trường phát triển ngày 12–13/10/2026. Người quản trị có thể chọn một repository nằm trong danh sách cho phép, triển khai commit mới nhất của nhánh mặc định hoặc nhập commit SHA đầy đủ. Mini PaaS luôn chuyển lựa chọn thành SHA 40 ký tự trước khi tải snapshot, build image, thay container App A và lưu lịch sử cùng build log.

Đây là luồng sản phẩm của Mini PaaS, khác với workflow GitHub Actions chỉ dùng để kiểm tra repository của chính nền tảng.

## 2. Luồng xử lý

```text
Quản trị viên
      |
      | sourceId + commit SHA 40 ký tự
      | hoặc yêu cầu commit mới nhất
      v
Dashboard -> Control API
                 | yêu cầu latest
                 v
        Deployment Runner -- GitHub ref main --> SHA 40 ký tự
                 |
                 v
Control API -> SQLite: deployment = queued
                 |
                 v
        Deployment Runner
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
| Dashboard | Hiển thị source/nhánh mặc định, cho chọn commit mới nhất hoặc nhập SHA, gửi deployment và đọc lịch sử/build log |
| Control API | Xác thực phiên, yêu cầu Runner phân giải latest khi cần, tạo deployment bất đồng bộ, lưu SQLite và audit |
| Deployment Runner | Giữ allowlist source/nhánh, phân giải GitHub ref thành SHA, tải archive, build image và thay container |
| Docker Engine | Build image, lưu image cục bộ và quản lý container |
| SQLite | Lưu trạng thái, commit, image, log, người yêu cầu và thời gian |

## 4. Ranh giới đầu vào

- API công khai không nhận URL repository, Dockerfile, build context, image hoặc lệnh shell tùy ý.
- Source `github-app-a` được khai báo trong mã Runner và ánh xạ cố định tới App A cùng thư mục `apps/app-a`.
- Commit cụ thể phải là SHA viết thường đủ 40 ký tự.
- Thao tác latest chỉ dùng `defaultBranch=main` và GitHub ref URL cố định trong Runner. Dashboard không gửi tên nhánh hoặc tag.
- Phản hồi metadata GitHub tối đa 64 KiB; commit phân giải được kiểm tra lại thành SHA 40 ký tự trước khi tạo deployment.
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

Kết quả commit cụ thể ngày 12/10/2026: 10 kiểm tra tích hợp đạt. Hệ thống đã tải 636.145 byte mã nguồn, build image, triển khai App A, xác minh phiên bản qua Gateway, kiểm tra nhãn revision và đưa App A về `v1.0.0` sau thử nghiệm.

Kiểm thử commit mới nhất:

```bash
make test-p1-git-latest
```

Kết quả ngày 13/10/2026: 15 kiểm tra đạt. SHA phân giải khớp `origin/main`, image và release lưu đúng commit, App A chạy đúng phiên bản rồi được đưa về `v1.0.0`.

## 8. Giới hạn

- Mới hỗ trợ một source GitHub công khai và App A.
- Nhánh mặc định hiện cố định là `main`; chưa có webhook/auto-deploy, chọn nhánh tùy ý, theo dõi tiến độ build trực tiếp hoặc hủy build.
- Phân giải latest qua GitHub API công khai nên có giới hạn tần suất; chưa cấu hình GitHub App/token riêng.
- Chưa đẩy image lên registry; không có registry digest, chữ ký image hoặc SBOM.
- Build Dockerfile vẫn là thao tác có đặc quyền cao. Chỉ commit trong repository nhóm kiểm soát mới được dùng; không coi đây là sandbox cho mã không tin cậy.
- Build và deployment đang nằm cùng Runner; chưa tách worker hoặc hàng đợi bền vững.
- Việc thay container có khoảng gián đoạn và chưa phải zero-downtime deployment.
