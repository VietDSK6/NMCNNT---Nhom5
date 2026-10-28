# Bảng kiểm thử T01–T08 — release candidate `v1.0.0-rc.2`

## 1. Phạm vi và quy ước

Bảng này là bản ghi tổng hợp dùng cho hồ sơ cuối kỳ. Phiên bản trình bày hiện tại là RC2; mỗi kết quả vẫn giữ đúng commit và thời gian đã đo, không gán hồi tố toàn bộ dữ liệu lịch sử cho RC2.

- Tag sản phẩm hiện tại: `v1.0.0-rc.2`.
- Commit tag/evidence RC2: `60853f8`.
- Commit runtime RC2 đã kiểm thử: `2ce0e1c1dedf03f84cb77a426559706d4982f2d6`.
- Evidence hồi quy RC2: `evidence/RELEASE/2026-10-17-v1.0.0-rc.2/`.
- T06 giữ commit đo gốc `5cc99b12bd5f1218da063ce1a08b59a82c005d20` ngày 14/10/2026.
- Evidence T01–T05/T07 lịch sử và biên bản audit RC1 vẫn được giữ để truy vết, không bị thay thế hoặc sửa ngày.
- Múi giờ trình bày: `UTC+07:00` trừ khi file gốc ghi rõ UTC.
- Không chạy kiểm tra responsive, Playwright/CUA hoặc chụp ảnh mới cho RC2.

`Đạt có lưu ý` nghĩa là hành vi kỹ thuật đã quan sát đạt nhưng hồ sơ nguồn có hạn chế được ghi rõ; không đồng nghĩa có dữ liệu gốc đầy đủ như T06/T08.

## 2. Ma trận chính thức

| Mã test | Yêu cầu | Thời gian | Môi trường/commit | Đầu vào hoặc điều kiện trước | Thao tác | Kết quả mong đợi | Kết quả thực tế | Kết quả | Người thực hiện | Bằng chứng |
|---|---|---|---|---|---|---|---|---|---|---|
| T01-01 | Khả năng dựng lại | Dựng VPS ngày 14/10; hồi quy RC2 ngày 17/10/2026 | VPS Debian 12 x86_64, 2 vCPU/3,8–4 GiB RAM; runtime `2ce0e1c`, tag `v1.0.0-rc.2` | VPS đã cài Docker/Compose/Node; repository và `.env` hợp lệ | Lần đầu clone/`make up`; tại RC2 build/recreate, chạy toàn bộ regression và smoke | 8 service khỏe; smoke 9/9; có thể làm lại theo README | Nhật ký ghi nhận lần dựng VPS và 8 service khỏe; RC2 build/recreate đạt, 8/8 service khỏe, smoke 9/9 và toàn bộ hồi quy đạt | **Đạt có lưu ý**: chưa có raw log độc lập của lần dựng VPS sạch ngày 14/10 | Đỗ Sỹ Việt — B24DCCC287 (hồi quy RC2); người dựng sạch chưa được đối soát riêng | [`NHAT_KY_TRIEN_KHAI.md`](../report/NHAT_KY_TRIEN_KHAI.md), [`vps-make-test.log`](../../evidence/RELEASE/2026-10-17-v1.0.0-rc.2/vps-make-test.log), [`RC2`](../release/RELEASE_CANDIDATE_2.md) |
| T02-01 | FR01, FR02 — định tuyến và trạng thái | 17/10/2026 | VPS Debian 12, runtime `2ce0e1c` | Gateway, App A và App B đang chạy ở v1 | Gọi trang/health/version App A/B; inspect host port; kiểm tra API ứng dụng | Route đúng ứng dụng và phiên bản; app không publish host port | Smoke 9/9; App A/B trả health/version đúng; P0.2 đạt 15/15; chỉ Gateway bind loopback | **Đạt** | Đỗ Sỹ Việt — B24DCCC287 | [`vps-make-test.log#L99`](../../evidence/RELEASE/2026-10-17-v1.0.0-rc.2/vps-make-test.log#L99), [`public-checks.txt`](../../evidence/RELEASE/2026-10-17-v1.0.0-rc.2/public-checks.txt) |
| T03-01 | FR05, FR06 — cập nhật phiên bản | 17/10/2026 | VPS Debian 12, runtime `2ce0e1c` | App A v1; image v2 trong catalog; session hợp lệ | Yêu cầu update v2, đọc version, thử version ngoài allowlist, đưa về v1 | Operation đúng trạng thái; v2 được áp dụng; input cấm bị từ chối; trạng thái cuối v1 | P0.2B cập nhật v1 → v2 → v1 thành công; `latest` bị Runner từ chối; endpoint cuối trả `v1.0.0` | **Đạt** | Đỗ Sỹ Việt — B24DCCC287 | [`vps-make-test.log#L129`](../../evidence/RELEASE/2026-10-17-v1.0.0-rc.2/vps-make-test.log#L129) |
| T04-01 | FR04, FR06 — vòng đời ứng dụng | 17/10/2026 | VPS Debian 12, runtime `2ce0e1c` | App B đang chạy và khỏe | Stop → kiểm tra Gateway → start → chờ health → restart | Trạng thái/log phản ánh đúng; khi dừng không truy cập được; sau start/restart phục hồi | Stop thành công, Gateway trả 504 khi App B dừng; start/restart thành công; App B khỏe lại; P0.2B đạt 21 kiểm tra | **Đạt** | Đỗ Sỹ Việt — B24DCCC287 | [`vps-make-test.log#L129`](../../evidence/RELEASE/2026-10-17-v1.0.0-rc.2/vps-make-test.log#L129) |
| T05-01 | FR07, FR08, FR10 — log và tài nguyên | 17/10/2026 | VPS Debian 12, runtime `2ce0e1c`; Prometheus 3.14.0, Grafana 13.2.2 | Stack khỏe; có request App A/B; session hợp lệ và trường hợp không session | Gọi API log/stats, kiểm giới hạn; truy vấn exporter/Prometheus và Grafana provisioning | Log thật; CPU/RAM/PID/mạng hữu hạn; input sai bị từ chối; metric có nhiều mẫu | P0.2C đạt 12 kiểm tra; P1 observability đạt 15; target up, đủ ba rule và sáu panel | **Đạt** | Đỗ Sỹ Việt — B24DCCC287 | [`vps-make-test.log#L153`](../../evidence/RELEASE/2026-10-17-v1.0.0-rc.2/vps-make-test.log#L153), [`stats-sample.json`](../../evidence/T05/2026-10-12-p0.2c/stats-sample.json) |
| T06-01 | Hiệu năng và FR10 | 14/10/2026 13:35:45–13:48:03 | VPS Debian 12, commit `5cc99b1`, k6 2.3.0; generator chạy cùng VPS | App A/B khỏe; warm-up 5 req/s; ba vòng độc lập | Mỗi vòng chạy 10/25/50 req/s trong 60 giây/mức, thu k6 và Prometheus | p95 < 500 ms; lỗi < 1%; check > 99%; dropped = 0; App A/B khỏe | 9/9 tổ hợp đạt; median p95 58,00/22,78/35,00 ms; lỗi 0%; dropped 0; hai app khỏe | **Đạt**; không dùng để tuyên bố SLA/production | **Chưa đối soát tên/MSSV trong evidence** | [`test-record.md`](../../evidence/T06/2026-10-14-vps-linux/test-record.md), [`README`](../../evidence/T06/2026-10-14-vps-linux/README.md), ba thư mục raw `1340`/`1345`/`1350` |
| T07-01 | FR03 và ranh giới bảo mật | 17/10/2026 | VPS Debian 12, runtime `2ce0e1c`; kiểm tra public từ máy ngoài | Thiếu/sai session, origin sai, action/version ngoài schema, request Runner thiếu secret | Gọi API/Runner với input không hợp lệ; inspect Docker socket/host port; gọi applications public chưa đăng nhập | Trả 400/401/403 phù hợp; không chạy action cấm; Docker socket chỉ ở Runner; API điều khiển không public | Các kiểm tra xác thực P0.2/P0.2B/P0.2C đạt; Docker socket chỉ ở Runner; API applications public trả 401; service nội bộ không publish port | **Đạt** | Đỗ Sỹ Việt — B24DCCC287 | [`vps-make-test.log#L111`](../../evidence/RELEASE/2026-10-17-v1.0.0-rc.2/vps-make-test.log#L111), [`public-checks.txt`](../../evidence/RELEASE/2026-10-17-v1.0.0-rc.2/public-checks.txt), [`T07 lịch sử`](../../evidence/T07/) |
| T08-01 | Sao lưu và khôi phục | 17/10/2026 19:19–19:20 (UTC+07) | VPS Debian 12, runtime `2ce0e1c`, SQLite schema v6 | Control API live; volume `mini-paas-control-data`; backup giữ ngoài Git | Online backup, checksum/integrity, restore volume tạm, chạy API tạm, login/list apps/gọi Gateway, dọn tài nguyên | Snapshot toàn vẹn; dữ liệu khớp; API phục hồi hoạt động; không đổi stack live; không publish cổng tạm | Integrity `ok`; 4 app; login/applications/App A HTTP 200; `LIVE_STACK_UNCHANGED=true`; T08 PASS; không còn tài nguyên tạm | **Đạt** | Đỗ Sỹ Việt — B24DCCC287 | [`vps-t08.log`](../../evidence/RELEASE/2026-10-17-v1.0.0-rc.2/vps-t08.log), [`T08 ngày 15/10`](../../evidence/T08/2026-10-15-vps/) |

## 3. Kiểm thử bổ sung trực tiếp cho sản phẩm

| Mã | Yêu cầu | Thời gian/môi trường | Kết quả thực tế | Kết quả | Người thực hiện | Bằng chứng |
|---|---|---|---|---|---|---|
| P1-GIT-LATEST-01 | FR09 | 17/10/2026; VPS; runtime `2ce0e1c` | 15/15 đạt; phân giải đúng `origin/main`, build/deploy image/release đúng SHA và đưa App A về v1 | Đạt | Đỗ Sỹ Việt — B24DCCC287 | [`vps-git-latest.log`](../../evidence/RELEASE/2026-10-17-v1.0.0-rc.2/vps-git-latest.log) |
| P1-ENV-01 | FR11 | 17/10/2026; VPS; runtime `2ce0e1c` | 21 kiểm tra đạt; mã hóa/che secret giả, giữ cấu hình qua update, dọn sạch và audit không lộ giá trị | Đạt | Đỗ Sỹ Việt — B24DCCC287 | [`vps-make-test.log#L199`](../../evidence/RELEASE/2026-10-17-v1.0.0-rc.2/vps-make-test.log#L199) |
| P2-ROLLBACK-01 | FR12 | 17/10/2026; VPS; runtime `2ce0e1c` | 17 kiểm tra đạt; rollback đúng image ID/release/audit và đưa App A về v1 | Đạt | Đỗ Sỹ Việt — B24DCCC287 | [`vps-make-test.log#L223`](../../evidence/RELEASE/2026-10-17-v1.0.0-rc.2/vps-make-test.log#L223) |
| VPS-PUBLIC-01 | FR13 | 17/10/2026; Cloudflare Tunnel và máy khách ngoài | Control Center, API, `demo` và `vps-demo` HTTPS đạt; health lặp 10/10; API chưa đăng nhập trả 401 | Đạt | Đỗ Sỹ Việt — B24DCCC287 | [`public-checks.txt`](../../evidence/RELEASE/2026-10-17-v1.0.0-rc.2/public-checks.txt), [`Cloudflare lịch sử`](../../evidence/VPS/2026-10-15-cloudflare-tunnel/) |

## 4. Đối soát evidence

- RC2 có manifest SHA-256 cho chín file evidence và đã ghi kết quả secret scan.
- Biên bản audit RC1 vẫn đối soát 11/11 manifest có sẵn và ghi checksum 29 file lịch sử T01–T05/T07; đây là provenance lịch sử, không phải bằng chứng runtime RC2.
- Release evidence không chứa database, `.env`, cookie jar, token hoặc private key.
- Backup SQLite thực tế được giữ ngoài repository.

## 5. Việc bắt buộc trước khi nộp

1. Đối soát họ tên/MSSV người trực tiếp chạy T06; không tự suy đoán từ phân công hiện tại.
2. Giữ nguyên lưu ý T01 thiếu raw log riêng của lần dựng VPS sạch; chỉ nâng trạng thái nếu có một lần dựng sạch mới với log đầy đủ.
3. Khi đưa T06 vào báo cáo, ghi đúng commit `5cc99b1`, generator chạy cùng VPS và giới hạn không đại diện production/SLA.
4. Không dùng ảnh responsive lịch sử làm bằng chứng cho RC2.
5. Báo cáo, slide và video phải dùng RC2 làm phiên bản sản phẩm nhưng ghi đúng commit/ngày của từng phép đo lịch sử.
