# Bảng kiểm thử T01–T08 — release candidate `v1.0.0-rc.1`

## 1. Phạm vi và quy ước

Bảng này là bản ghi tổng hợp dùng cho hồ sơ cuối kỳ. Nguồn chính là dữ liệu lịch sử T01–T08, hồi quy VPS của release candidate và hồ sơ đối soát checksum ngày 16/10/2026.

- Tag sản phẩm: `v1.0.0-rc.1`.
- Commit tag/evidence: `a8388b973e7821b89aeb53989850232244a92494`.
- Commit runtime RC: `37289d852a9e2078490e08528f925d0500781f96`.
- Múi giờ trình bày: `UTC+07:00`.
- Người thực hiện tạm ghi `TV1 – chủ dự án`; phải thay bằng họ tên/MSSV thật trước khi nộp.
- Không chạy kiểm tra responsive, Playwright/CUA hoặc chụp ảnh mới. Evidence giao diện T07 cũ chỉ là bằng chứng lịch sử.

`Đạt có lưu ý` nghĩa là hành vi kỹ thuật đã quan sát đạt nhưng hồ sơ nguồn có hạn chế được ghi rõ; không đồng nghĩa có dữ liệu gốc đầy đủ như T06/T08.

## 2. Ma trận chính thức

| Mã test | Yêu cầu | Thời gian | Môi trường/commit | Đầu vào hoặc điều kiện trước | Thao tác | Kết quả mong đợi | Kết quả thực tế | Kết quả | Người thực hiện | Bằng chứng |
|---|---|---|---|---|---|---|---|---|---|---|
| T01-01 | Khả năng dựng lại | 14/10/2026; đối soát RC 16/10/2026 09:43–09:53 | VPS Debian 12 x86_64, 2 vCPU/3,8 GiB RAM; RC `37289d8`, tag `v1.0.0-rc.1` | VPS đã cài Docker/Compose/Node; repository và `.env` hợp lệ | Clone vào `/home/user/mini-paas`, `make up`; tại RC chạy config, toàn bộ regression, checksum và smoke cuối | 8 service khỏe; smoke 9/9; có thể làm lại theo README | Nhật ký ngày 14/10 ghi nhận clone/`make up` và 8 service khỏe; RC config hợp lệ, `make test` đạt, smoke cuối 9/9 | **Đạt có lưu ý**: không có raw log độc lập của lần dựng VPS sạch | TV1 – chủ dự án | [`NHAT_KY_TRIEN_KHAI.md`](../report/NHAT_KY_TRIEN_KHAI.md), [`vps-make-test.log`](../../evidence/RELEASE/2026-10-16-v1.0.0-rc.1/vps-make-test.log), [`README RC`](../../evidence/RELEASE/2026-10-16-v1.0.0-rc.1/README.md) |
| T02-01 | FR01, FR02 — định tuyến và trạng thái | 16/10/2026 09:43:57–09:46:40 | VPS Debian 12, commit `37289d8` | Gateway, App A và App B đang chạy ở v1 | Gọi trang/health/version App A/B; inspect host port; kiểm tra API ứng dụng | Route đúng ứng dụng và phiên bản; app không publish host port | Smoke 9/9; App A/B trả health/version đúng; chỉ Gateway bind `127.0.0.1:8080`; P0.2 đạt 15/15 | **Đạt** | TV1 – chủ dự án | [`vps-make-test.log#L106`](../../evidence/RELEASE/2026-10-16-v1.0.0-rc.1/vps-make-test.log#L106), [`public-checks.txt`](../../evidence/RELEASE/2026-10-16-v1.0.0-rc.1/public-checks.txt) |
| T03-01 | FR05, FR06 — cập nhật phiên bản | 16/10/2026 09:43:57–09:46:40 | VPS Debian 12, commit `37289d8` | App A v1; image v2 trong catalog; session hợp lệ | Yêu cầu update v2, đọc version, thử version ngoài allowlist, đưa về v1 | Operation đúng trạng thái; v2 được áp dụng; input cấm bị từ chối; trạng thái cuối v1 | P0.2B cập nhật v1 → v2 → v1 thành công; `latest` bị từ chối ở action version; endpoint cuối trả `v1.0.0` | **Đạt** | TV1 – chủ dự án | [`vps-make-test.log#L150`](../../evidence/RELEASE/2026-10-16-v1.0.0-rc.1/vps-make-test.log#L150) |
| T04-01 | FR04, FR06 — vòng đời ứng dụng | 16/10/2026 09:43:57–09:46:40 | VPS Debian 12, commit `37289d8` | App B đang chạy và khỏe | Stop → kiểm tra Gateway → start → chờ health → restart | Trạng thái/log phản ánh đúng; khi dừng không truy cập được; sau start/restart phục hồi | Stop thành công, Gateway trả 504 khi App B dừng; start và restart thành công; App B khỏe lại; P0.2B đạt 21 kiểm tra | **Đạt** | TV1 – chủ dự án | [`vps-make-test.log#L142`](../../evidence/RELEASE/2026-10-16-v1.0.0-rc.1/vps-make-test.log#L142) |
| T05-01 | FR07, FR08, FR10 — log và tài nguyên | 16/10/2026 09:43:57–09:46:40 | VPS Debian 12, commit `37289d8`; Prometheus 3.14.0, Grafana 13.2.2 | Stack khỏe; có request App A/B; session hợp lệ và trường hợp không session | Gọi API log/stats, kiểm giới hạn; truy vấn exporter/Prometheus và Grafana provisioning | Log thật; CPU/RAM/PID/mạng hữu hạn; input sai bị từ chối; metric có nhiều mẫu | P0.2C đạt 12 kiểm tra; P1 observability đạt 15; metric App A/B nhiều mẫu, RAM dương, target up, đủ ba rule và sáu panel | **Đạt** | TV1 – chủ dự án | [`vps-make-test.log#L160`](../../evidence/RELEASE/2026-10-16-v1.0.0-rc.1/vps-make-test.log#L160), [`stats-sample.json`](../../evidence/T05/2026-10-12-p0.2c/stats-sample.json) |
| T06-01 | Hiệu năng và FR10 | 14/10/2026 13:35:45–13:48:03 | VPS Debian 12, commit `5cc99b1`, k6 2.3.0; generator chạy cùng VPS | App A/B khỏe; warm-up 5 req/s; ba vòng độc lập | Mỗi vòng chạy 10/25/50 req/s trong 60 giây/mức, thu k6 và Prometheus | p95 < 500 ms; lỗi < 1%; check > 99%; dropped = 0; App A/B khỏe | 9/9 tổ hợp đạt; median p95 58,00/22,78/35,00 ms; lỗi 0%; dropped 0; hai app khỏe | **Đạt**; không dùng để tuyên bố SLA/production | TV1 – chủ dự án | [`test-record.md`](../../evidence/T06/2026-10-14-vps-linux/test-record.md), [`README`](../../evidence/T06/2026-10-14-vps-linux/README.md), ba thư mục raw `1340`/`1345`/`1350` |
| T07-01 | FR03 và ranh giới bảo mật | 16/10/2026 09:43:57–09:49 | VPS Debian 12, commit `37289d8`; kiểm tra public từ máy ngoài | Thiếu/sai session, origin sai, action/version ngoài schema, request Runner thiếu secret | Gọi API/Runner với input không hợp lệ; inspect Docker socket/host port; gọi applications public chưa đăng nhập | Trả 400/401/403 phù hợp; không chạy action cấm; Docker socket chỉ ở Runner; API điều khiển không public | Các kiểm tra xác thực P0.2/P0.2B/P0.2C đạt; Docker socket chỉ ở Runner; applications public trả 401; service nội bộ không publish port | **Đạt** | TV1 – chủ dự án | [`vps-make-test.log#L118`](../../evidence/RELEASE/2026-10-16-v1.0.0-rc.1/vps-make-test.log#L118), [`public-checks.txt`](../../evidence/RELEASE/2026-10-16-v1.0.0-rc.1/public-checks.txt), [`T07 lịch sử`](../../evidence/T07/) |
| T08-01 | Sao lưu và khôi phục | 16/10/2026 09:47:47–09:47:55 | VPS Debian 12, commit `37289d8`, SQLite schema v6 | Control API live; volume `mini-paas-control-data`; backup giữ ngoài Git | Online backup, checksum/integrity, restore volume tạm, chạy API tạm, login/list apps/gọi Gateway, dọn tài nguyên | Snapshot toàn vẹn; dữ liệu khớp; API phục hồi hoạt động; không đổi stack live; không publish cổng tạm | Integrity `ok`; 4 app; login/applications/App A HTTP 200; `LIVE_STACK_UNCHANGED=true`; T08 PASS; backup chuyển ra thư mục `0700/0600` ngoài repo | **Đạt** | TV1 – chủ dự án | [`vps-t08.log`](../../evidence/RELEASE/2026-10-16-v1.0.0-rc.1/vps-t08.log), [`T08 ngày 15/10`](../../evidence/T08/2026-10-15-vps/) |

## 3. Kiểm thử bổ sung trực tiếp cho sản phẩm

| Mã | Yêu cầu | Thời gian/môi trường | Kết quả thực tế | Kết quả | Người thực hiện | Bằng chứng |
|---|---|---|---|---|---|---|
| P1-GIT-LATEST-01 | FR09 | 16/10/2026 09:46:48–09:47:34; VPS; commit `37289d8` | 15 kiểm tra đạt; phân giải đúng `origin/main`, build/deploy image/release đúng SHA và đưa App A về v1 | Đạt | TV1 – chủ dự án | [`vps-git-latest.log`](../../evidence/RELEASE/2026-10-16-v1.0.0-rc.1/vps-git-latest.log) |
| P1-ENV-01 | FR11 | 16/10/2026; VPS; commit `37289d8` | 21 kiểm tra đạt; mã hóa/che secret giả, giữ cấu hình qua update, dọn sạch và audit không lộ giá trị | Đạt | TV1 – chủ dự án | [`vps-make-test.log#L207`](../../evidence/RELEASE/2026-10-16-v1.0.0-rc.1/vps-make-test.log#L207) |
| P2-ROLLBACK-01 | FR12 | 16/10/2026; VPS; commit `37289d8` | 17 kiểm tra đạt; rollback đúng image ID/release/audit và đưa App A về v1 | Đạt | TV1 – chủ dự án | [`vps-make-test.log#L231`](../../evidence/RELEASE/2026-10-16-v1.0.0-rc.1/vps-make-test.log#L231) |
| VPS-PUBLIC-01 | FR13 | 15–16/10/2026; Cloudflare Tunnel và máy khách ngoài | Control Center, `demo` và `vps-demo` HTTPS đạt; wildcard định tuyến đúng; API chưa đăng nhập 401 | Đạt | TV1 – chủ dự án | [`public-checks.txt`](../../evidence/RELEASE/2026-10-16-v1.0.0-rc.1/public-checks.txt), [`Cloudflare`](../../evidence/VPS/2026-10-15-cloudflare-tunnel/), [`Web Service`](../../evidence/VPS/2026-10-15-dynamic-web-service/) |

## 4. Đối soát evidence

- 11/11 manifest checksum có sẵn xác minh thành công.
- 29 file lịch sử T01–T05/T07 đã được ghi SHA-256 mà không chỉnh sửa file nguồn.
- Hồ sơ chi tiết: [`evidence/AUDIT/2026-10-16-v1.0.0-rc.1/`](../../evidence/AUDIT/2026-10-16-v1.0.0-rc.1/README.md).
- Release evidence không chứa database, `.env`, cookie jar, token hoặc private key.

## 5. Việc bắt buộc trước khi nộp

1. Thay `TV1 – chủ dự án` bằng họ tên và MSSV thật của người đã chạy test.
2. Giữ nguyên lưu ý T01 thiếu raw log riêng của lần dựng VPS sạch; chỉ chạy lại nếu nhóm muốn nâng chất lượng hồ sơ, không được bịa log cũ.
3. Khi đưa T06 vào báo cáo, ghi đúng commit `5cc99b1`, generator chạy cùng VPS và giới hạn không đại diện production/SLA.
4. Không dùng ảnh responsive lịch sử làm bằng chứng cho release candidate.
