# Nhật ký sử dụng AI và nguồn tham khảo

> Đây là file làm việc để tổng hợp vào báo cáo cuối. Không ghi chung chung “dùng AI để làm bài”; phải nêu phạm vi hỗ trợ và cách kiểm chứng.

## 1. Sử dụng AI

| Thời gian | Công cụ | Hạng mục được hỗ trợ | File liên quan | Phần sinh viên đã quyết định/chỉnh sửa | Cách kiểm chứng |
|---|---|---|---|---|---|
| 11–12/10/2026 | ChatGPT/Codex | Phân tích kiến trúc, tạo khung mã/cấu hình, viết test và tài liệu | Repository Mini PaaS | Chọn phạm vi, duyệt kiến trúc, điều chỉnh yêu cầu, chạy và sửa theo kết quả thực tế | Unit test, integration test, Docker Compose, GitHub Actions và evidence trong repository |
| 26/10/2026 | Codex | Đối chiếu dự án với tám chương học phần, chuẩn hóa ma trận T01–T08 sang RC2 và rà giới hạn diễn giải | `docs/report/DOI_CHIEU_KIEN_THUC_MON_HOC.md`, `docs/test-plan/BANG_KIEM_THU_T01_T08.md` | Giữ nguyên provenance phép đo, không gán RC2 cho T06 lịch sử, chưa công nhận backup 3–2–1 hoặc kiến thức VLAN/CPU scheduling chưa triển khai | Đối chiếu mã nguồn, Compose, evidence T06/T08 và hồi quy RC2 |

Nguyên tắc khai báo cuối:

- AI hỗ trợ đề xuất và tạo bản nháp; sinh viên chịu trách nhiệm lựa chọn, chỉnh sửa, chạy lại và giải thích.
- Không dùng kết quả AI làm bằng chứng nếu chưa chạy trên môi trường được phép.
- Không bịa số liệu, log, ảnh hoặc nguồn tham khảo.
- Không đưa secret hoặc dữ liệu cá nhân vào prompt hay repository.

## 2. Nguồn mã và cấu hình tham khảo

| Thành phần | Nguồn chính thức/tham khảo | Nội dung đã sử dụng | Phần nhóm tự điều chỉnh |
|---|---|---|---|
| Docker/Compose | Tài liệu chính thức Docker | Container, health check, mạng, giới hạn tài nguyên | Cấu trúc một host, mạng `edge`/`control`, policy và test |
| Nginx | Tài liệu chính thức Nginx | Reverse proxy, timeout, DNS resolver | Route Mini PaaS và Docker DNS động |
| GitHub Actions | Tài liệu và action chính thức của GitHub | Workflow, checkout, Node setup, artifact | Quyền chỉ đọc, regression P0 và image manifest |
| React/Vite/Fastify | Tài liệu chính thức từng dự án | API/framework và production build | Dashboard, Control API, xác thực và operation flow |
| Prometheus | <https://prometheus.io/docs/prometheus/latest/installation/>, <https://prometheus.io/download/>; truy cập 12/10/2026 | Image chính thức, cấu hình scrape và lưu TSDB | Runner exporter allowlist, chu kỳ 5 giây, retention 7 ngày/256 MiB và alert rule |
| Grafana | <https://grafana.com/docs/grafana/latest/setup-grafana/installation/docker/>, <https://grafana.com/docs/grafana/latest/administration/provisioning/>; truy cập 12/10/2026 | Image Docker và provisioning từ file | Route `/monitoring/`, datasource nội bộ, dashboard sáu panel, giới hạn tài nguyên và kiểm thử API |
| Grafana k6 | <https://grafana.com/docs/k6/latest/>, <https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/constant-arrival-rate/> và <https://github.com/grafana/k6/releases/tag/v2.3.0>; truy cập 12/10/2026 | Image chính thức, executor arrival rate, threshold và summary | Ba mức tải giới hạn qua Gateway, ghép dữ liệu k6 với Prometheus và nén dữ liệu gốc |
| Bộ slide học phần RIPT1304 | Tài liệu giảng dạy do giảng viên cung cấp; bản tổng hợp của nhóm bao quát 8 chương từ tổng quan hệ thống CNTT đến bảo mật | Khái niệm process/thread, CPU scheduling, mạng, file system, VLAN, ảo hóa/Cloud và bảo mật | Dùng làm khung đối chiếu với sản phẩm; không coi nội dung slide là bằng chứng sản phẩm đã triển khai |

Khi bổ sung nguồn mới phải lưu URL, ngày truy cập và mục báo cáo sử dụng nguồn đó. Trước khi nộp, dòng bộ slide RIPT1304 phải được bổ sung tên file/buổi học hoặc thông tin thư mục gốc theo cách trích dẫn mà giảng viên yêu cầu; không trích dẫn chỉ từ bản tổng hợp trung gian nếu còn bản slide gốc.
