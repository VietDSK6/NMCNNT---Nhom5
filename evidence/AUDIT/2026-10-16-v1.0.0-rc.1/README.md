# Đối soát evidence T01–T08 cho `v1.0.0-rc.1`

## Phạm vi

- Thời điểm đối soát: `2026-10-16T19:03:27+07:00`.
- Tag sản phẩm: `v1.0.0-rc.1`.
- Commit tag/evidence: `a8388b973e7821b89aeb53989850232244a92494`.
- Commit runtime RC: `37289d852a9e2078490e08528f925d0500781f96`.
- Người đối soát: `TV1 – chủ dự án`; phải thay bằng họ tên/MSSV thật trước khi nộp.

Hồ sơ này chỉ kiểm kê, tính checksum và liên kết bằng chứng. Không sửa dữ liệu gốc, không chạy lại tải T06 và không thay đổi runtime.

## Kết quả kiểm tra toàn vẹn

Toàn bộ 11 file `checksums.sha256` có sẵn đều xác minh thành công:

1. Release candidate.
2. T06 pilot macOS.
3. T06 chuẩn macOS.
4. T06 tổng hợp VPS.
5. T06 pilot VPS.
6. Ba vòng T06 chuẩn VPS.
7. T08 VPS ngày 15/10/2026.
8. Cloudflare Tunnel VPS.
9. Web Service động VPS.

T01–T05 và T07 chưa có checksum lịch sử. File `historical-source-checksums.sha256` ghi SHA-256 hiện tại của 29 file nguồn thuộc sáu nhóm này. Có thể xác minh từ repository root bằng:

```bash
shasum -a 256 -c evidence/AUDIT/2026-10-16-v1.0.0-rc.1/historical-source-checksums.sha256
```

## Mức đầy đủ của hồ sơ

| Nhóm | Hồ sơ lịch sử | Evidence RC bổ sung | Đánh giá |
|---|---|---|---|
| T01 | Có environment, procedure, commands, result, conclusion; không có test-record/checksum gốc | Smoke RC và nhật ký dựng VPS ngày 14/10 | Đạt có lưu ý: thiếu raw log riêng của lần dựng VPS sạch |
| T02 | Có environment, procedure, result, conclusion; thiếu commands/test-record/checksum gốc | P0.1/P0.2 và public checks RC | Đủ để kết luận định tuyến App A/B đạt |
| T03 | Có environment, procedure, commands, result, conclusion; thiếu test-record/checksum gốc | P0.2B RC trên VPS | Đủ để kết luận cập nhật v1 → v2 → v1 đạt |
| T04 | Có environment, procedure, commands, result, conclusion; thiếu test-record/checksum gốc | P0.2B RC trên VPS | Đủ để kết luận stop/start/restart đạt |
| T05 | Chỉ có README và mẫu stats; cấu trúc lịch sử chưa theo mẫu | P0.2C và P1 observability RC trên VPS | Đủ dữ liệu chức năng; dùng ma trận chuẩn làm test-record tổng hợp |
| T06 | Có environment, commands, test-record, conclusion, raw data và checksum | Không đo lại ở RC | Đầy đủ; số liệu thuộc commit `5cc99b1`, đường App A/B và kịch bản tải không đổi về mục tiêu |
| T07 | Hai biên bản và hai ảnh lịch sử; chưa theo cấu trúc thư mục chuẩn | P0.2/P0.2B/P0.2C và public 401 RC | Đủ dữ liệu tự động; ảnh chỉ là bằng chứng lịch sử |
| T08 | Có đầy đủ cấu trúc và checksum ngày 15/10 | T08 chạy lại đúng commit runtime RC ngày 16/10 | Đầy đủ |

## Khoảng trống còn lại

1. T01 không có raw log độc lập cho lần clone/cấu hình/`make up` trên VPS sạch ngày 14/10; không được mô tả quá mức thành “dữ liệu gốc đầy đủ”.
2. Họ tên và MSSV người thực hiện chưa được cung cấp; ma trận tạm dùng `TV1 – chủ dự án`.
3. T06 được đo tại commit `5cc99b1`, không phải commit RC. Báo cáo phải nêu rõ điều này và không tuyên bố SLA/production.

Các khoảng trống trên không làm thay đổi kết quả runtime đã quan sát, nhưng phải được trình bày trung thực trong hồ sơ nộp.
