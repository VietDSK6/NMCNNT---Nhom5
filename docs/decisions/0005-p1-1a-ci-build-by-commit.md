# ADR 0005 — Tách CI dựng ảnh theo commit khỏi triển khai tự động

- Trạng thái: đã áp dụng cục bộ trong P1.1A; chờ chạy workflow trên GitHub.
- Ngày: 12/10/2026.

## Bối cảnh

G3 yêu cầu truy vết từ commit đến ảnh và lần triển khai. Repository hiện chưa có Git remote, chưa chọn cấu hình GitHub Container Registry và chưa chốt cách VPS nhận lệnh triển khai. Nếu ghép build, push và deploy ngay trong một workflow, lỗi hoặc secret sai có thể làm mờ ranh giới bảo mật và khó xác định bước nào đã thực sự đạt.

## Quyết định

Chia P1.1 thành hai mốc:

- P1.1A: kiểm tra mã, regression P0, build ảnh theo commit và lưu manifest/artifact; không có quyền ghi registry hoặc truy cập VPS.
- P1.1B: sau khi P1.1A chạy thật trên GitHub, thêm registry digest và cơ chế triển khai image nằm trong danh sách cho phép.

Ảnh P1.1A dùng tag `sha-<12 ký tự>`, đồng thời lưu commit đầy đủ trong nhãn OCI. GitHub Actions được ghim bằng SHA đầy đủ.

## Hệ quả

Ưu điểm:

- Chứng minh CI và khả năng truy vết mà chưa cần cấp secret triển khai.
- Pull request không có đường tác động tới VPS.
- Có thể kiểm thử và sửa pipeline độc lập với registry/CD.
- Phân biệt rõ image ID cục bộ với registry digest.

Đánh đổi:

- P1.1A chưa phải CI/CD hoàn chỉnh.
- Artifact image manifest không thay thế registry.
- Cần thêm một mốc để nối image đã phát hành vào Runner và lịch sử deployment.

## Phương án không chọn

- Cho GitHub Actions SSH trực tiếp vào VPS và chạy `docker compose`: chưa chọn vì chưa có remote, secret, allowlist release và quy trình khôi phục.
- Gắn Docker socket của máy phát triển vào self-hosted runner: không chọn vì tăng mạnh quyền của code trong pull request.
- Dùng tag `latest`: không chọn vì không truy vết được commit và có thể bị ghi đè.
