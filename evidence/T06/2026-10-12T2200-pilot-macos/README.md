# Pilot T06 trên macOS

Vòng này chạy 5/15/30 req/s trong 20 giây/mức để xác nhận kịch bản k6, output JSON, truy vấn Prometheus và bộ tổng hợp trước vòng chuẩn. Pilot được tạo trước khi bổ sung pha warm-up riêng, vì vậy không dùng làm bảng kết quả chính.

Ba mức đều đạt threshold, không lỗi và không dropped iteration. Vòng chuẩn có warm-up và thời lượng 60 giây/mức nằm tại `../2026-10-12T2202-macos/`.
