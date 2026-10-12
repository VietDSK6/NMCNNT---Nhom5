# Quy trình kiểm thử P1 Git deployment

## Mục tiêu

Kiểm chứng luồng sản phẩm từ commit Git tin cậy tới image và container App A, đồng thời kiểm tra xác thực và giới hạn đầu vào.

## Thao tác

1. Đăng nhập bằng tài khoản quản trị cấu hình trong môi trường.
2. Đọc danh sách source từ Control API.
3. Gửi request không có session và commit `main` để xác minh từ chối.
4. Gửi source `github-app-a` cùng SHA đầy đủ.
5. Chờ deployment kết thúc và đọc bản ghi SQLite qua API.
6. Gọi `/apps/app-a/version` qua Gateway.
7. Inspect label revision của image.
8. Đưa App A về `v1.0.0` và kiểm tra lại qua Gateway.

## Lệnh

```bash
make test-p1-git COMMIT_SHA=093f1b29341accae2520ba5854db1a5a992b959f
```
