#!/usr/bin/env sh
set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
WITH_ALERT_DRILL=0

if [ "${1:-}" = "--with-alert-drill" ]; then
  WITH_ALERT_DRILL=1
fi

cd "$REPO_ROOT"

printf '=== [1/3] Chạy kiểm thử tích hợp Giám sát T05 (p1_observability.sh) ===\n'
./tests/integration/p1_observability.sh

printf '\n=== [2/3] Chạy kiểm tra mở rộng Alert Rules & 9 nhóm Metric (OBS-02) ===\n'
node "${SCRIPT_DIR}/verify-observability-rules.mjs"

if [ "$WITH_ALERT_DRILL" -eq 1 ]; then
  printf '\n=== [3/3] Chạy kịch bản giả lập dừng/khôi phục app-a kích hoạt cảnh báo ===\n'
  "${SCRIPT_DIR}/test-alert-app-a-stop.sh"
else
  printf '\n[Bỏ qua bước 3] Truyền thêm cờ --with-alert-drill nếu muốn chạy kịch bản dừng thử app-a (~45s).\n'
fi

printf '\n=== [Hoàn tất] Phân tích & vẽ biểu đồ T06 từ dữ liệu gốc VPS ===\n'
python "${SCRIPT_DIR}/analyze-t06.py"
python "${SCRIPT_DIR}/generate-t06-charts.py"
