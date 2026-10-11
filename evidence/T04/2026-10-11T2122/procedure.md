# Quy trình T04

1. Gửi operation `stop` cho App B qua Control API.
2. Chờ operation thành công và gọi route App B qua Gateway.
3. Gửi operation `start`, chờ container đạt health check và gọi lại route.
4. Gửi operation `restart`, chờ health trở lại.
5. Đọc operation/audit để đối chiếu kết quả.
