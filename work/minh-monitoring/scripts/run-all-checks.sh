#!/usr/bin/env sh
set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
WITH_ALERT_DRILL=0
WITH_DYNAMIC_LOAD=0

for arg in "$@"; do
  case "$arg" in
    --with-alert-drill)
      WITH_ALERT_DRILL=1
      ;;
    --with-dynamic-load)
      WITH_DYNAMIC_LOAD=1
      ;;
    *)
      printf 'Tham số không hợp lệ: %s\n' "$arg" >&2
      exit 2
      ;;
  esac
done

cd "$REPO_ROOT"

printf '=== [1/4] Chạy kiểm thử tích hợp Giám sát T05 (p1_observability.sh) ===\n'
./tests/integration/p1_observability.sh

printf '\n=== [2/4] Chạy kiểm tra mở rộng Alert Rules & 9 nhóm Metric (OBS-02) ===\n'
node "${SCRIPT_DIR}/verify-observability-rules.mjs"

if [ "$WITH_ALERT_DRILL" -eq 1 ]; then
  printf '\n=== [3/4] Chạy kịch bản giả lập dừng/khôi phục app-a kích hoạt cảnh báo ===\n'
  "${SCRIPT_DIR}/test-alert-app-a-stop.sh"
else
  printf '\n[Bỏ qua bước 3] Truyền thêm cờ --with-alert-drill nếu muốn chạy kịch bản dừng thử app-a (~45s).\n'
fi

if [ "$WITH_DYNAMIC_LOAD" -eq 1 ]; then
  printf '\n=== [4/4] Chạy kiểm thử tải động đa ứng dụng (k6 + Prometheus) ===\n'
  node "${SCRIPT_DIR}/run-dynamic-load.mjs" quick
else
  printf '\n[Bỏ qua bước 4] Truyền thêm cờ --with-dynamic-load nếu muốn chạy k6 tự động phát hiện mọi app đang chạy.\n'
fi

printf '\n=== [Hoàn tất] Phân tích & vẽ biểu đồ T06 từ dữ liệu gốc VPS ===\n'
python "${SCRIPT_DIR}/analyze-t06.py"
python "${SCRIPT_DIR}/generate-t06-charts.py"
