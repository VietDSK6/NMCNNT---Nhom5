# P1 — Kiểm thử tải k6 và đối chiếu Prometheus

**Trạng thái:** Đã triển khai và chạy vòng phát triển trên macOS/OrbStack ngày 12/10/2026. Chưa phải số liệu nghiệm thu VPS Linux.

## 1. Mục tiêu

T06 kiểm tra phương pháp đo tải có thể tái hiện, không nhằm tìm tải phá hủy hệ thống. Các chỉ số cần thu gồm:

- Thông lượng thực tế so với request rate đặt trước.
- Thời gian phản hồi p95 tổng và theo từng ứng dụng.
- Tỷ lệ lỗi HTTP, tỷ lệ check nội dung và số iteration bị rơi.
- CPU, working set RAM, tỷ lệ RAM và health của App A/App B trong đúng khoảng thời gian.

## 2. Phạm vi và luồng đo

```text
k6 tạm thời -- mạng edge --> Gateway :8080
                                  |
                    +-------------+-------------+
                    v                           v
          /apps/app-a/version         /apps/app-b/version
                    |                           |
                    +---------- App A/B --------+

Runner exporter --> Prometheus -- query_range --> script tổng hợp
```

k6 xen kẽ hai endpoint JSON nhỏ qua Gateway. Nó không gọi trực tiếp container ứng dụng, không tham gia mạng `control`, không có Docker socket và bị xóa sau từng mức tải. Bài đo vì vậy bao phủ Nginx path routing cùng Web server Node.js, nhưng không đại diện trang có payload lớn, nghiệp vụ cơ sở dữ liệu, TLS hoặc độ trễ Internet.

## 3. Công cụ và khả năng tái hiện

- Image: `grafana/k6:2.3.0@sha256:9c2dee7f8ed74d317e4027c06a10f169b625638189de8d4555d0b3486a5aeb34`.
- Executor: `constant-arrival-rate` để đặt số iteration mỗi giây độc lập hơn với thời gian phản hồi.
- Script tải: `tests/performance/k6/mini-paas-load.js`.
- Điều phối và lấy metric: `scripts/performance/run-t06.sh`.
- Tổng hợp: `scripts/performance/summarize-k6.mjs`.
- Lệnh pilot: `make test-p1-load-pilot`.
- Lệnh chuẩn: `make test-p1-load`.

Kịch bản tải không nằm trong `make test` hoặc CI mặc định vì kéo dài thời gian, tạo tải chủ ý và cần môi trường đo được ghi rõ.

## 4. Profile và ngưỡng

Profile chuẩn warm-up 5 req/s trong 10 giây, nghỉ 5 giây, sau đó đo:

| Mức | Request rate | Thời lượng | VU chuẩn bị / tối đa |
|---|---:|---:|---:|
| low | 10 req/s | 60 giây | 20 / 40 |
| medium | 25 req/s | 60 giây | 40 / 80 |
| high | 50 req/s | 60 giây | 80 / 160 |

Ngưỡng vòng phát triển:

- `http_req_duration p(95) < 500 ms`, cả tổng và từng app.
- `http_req_failed < 1%`.
- `checks > 99%` cho HTTP 200, đúng `appId` và có version.
- `dropped_iterations = 0`.

Ngưỡng 500 ms là tiêu chí chấp nhận ban đầu cho endpoint nhỏ, không phải SLA thương mại. Nếu phép đo VPS cho thấy phân phối khác, nhóm phải giải thích và chốt lại ngưỡng trước khi chạy release, không sửa ngưỡng sau chỉ để làm đẹp kết quả.

## 5. Kết quả vòng phát triển

| Mức | Request | Thực tế | p95 | Lỗi | Dropped | CPU max A/B | RAM max A/B |
|---|---:|---:|---:|---:|---:|---:|---:|
| low | 601 | 10,02 req/s | 6,19 ms | 0% | 0 | 1,80% / 1,78% | 44,63 / 42,34 MiB |
| medium | 1.501 | 25,02 req/s | 5,51 ms | 0% | 0 | 1,87% / 1,85% | 36,42 / 40,12 MiB |
| high | 3.001 | 50,01 req/s | 7,32 ms | 0% | 0 | 1,99% / 1,96% | 55,80 / 37,27 MiB |

Tổng ba mức có 5.103 request. Tất cả check nội dung đạt và mọi mẫu health của hai app bằng 1. p95 không tăng đơn điệu giữa low và medium; RAM cũng dao động do garbage collection và trạng thái tiến trình. Với một lần đo/mức, không được kết luận các khác biệt nhỏ này có ý nghĩa thống kê.

## 6. Dữ liệu gốc

Thư mục `evidence/T06/2026-10-12T2202-macos/` chứa:

- `*-raw.json.gz`: sự kiện metric k6 gốc, chỉ nén chứ không chỉnh sửa.
- `*-summary.json`: summary gốc từng mức.
- `*-k6.txt.gz`: log console từng mức được nén nguyên trạng; dùng đuôi `.txt` trước khi nén để không bị quy tắc bỏ qua `*.log` loại khỏi repository.
- `*-prometheus-*.json`: query range CPU/RAM/health cùng mốc chạy.
- `summary.json`, `summary.csv`, `summary.md`: kết quả tổng hợp có thể tạo lại.
- `levels.tsv`, `environment.txt`: mức tải, thời gian và môi trường.

## 7. Giới hạn và kế hoạch VPS

- Generator và hệ thống cùng host macOS qua OrbStack, vì vậy tranh chấp tài nguyên có thể làm sai lệch cả tải phát ra lẫn hệ thống nhận tải.
- Mỗi mức chuẩn mới chạy một lần; pilot là vòng riêng ngắn hơn để kiểm tra công cụ.
- Endpoint `/version` có payload nhỏ và không dùng cơ sở dữ liệu.
- Tải đi trong bridge network, không đo Internet, DNS công cộng hoặc HTTPS.
- Exporter lấy mẫu mỗi 5 giây nên chỉ phản ánh xu hướng tài nguyên, không bắt mọi đỉnh ngắn.

Khi có VPS Linux, chạy mỗi mức ít nhất ba lần sau cùng một warm-up, ghi cấu hình VPS và vị trí máy phát tải. Báo cáo dùng median cùng khoảng biến thiên giữa các lần, giữ toàn bộ dữ liệu gốc và không trộn số liệu Mac với Linux.
