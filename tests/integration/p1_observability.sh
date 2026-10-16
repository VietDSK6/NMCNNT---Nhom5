#!/usr/bin/env sh
set -eu

gateway_port="${GATEWAY_PORT:-8080}"
base_url="${BASE_URL:-http://127.0.0.1:${gateway_port}}"
compose_config="$(docker compose config --format json)"
admin_username="$(printf '%s' "$compose_config" | node -e '
  let input = "";
  process.stdin.on("data", (chunk) => input += chunk);
  process.stdin.on("end", () => process.stdout.write(JSON.parse(input).services.grafana.environment.GF_SECURITY_ADMIN_USER));
')"
admin_password="$(printf '%s' "$compose_config" | node -e '
  let input = "";
  process.stdin.on("data", (chunk) => input += chunk);
  process.stdin.on("end", () => process.stdout.write(JSON.parse(input).services.grafana.environment.GF_SECURITY_ADMIN_PASSWORD));
')"
unset compose_config

response_file="$(mktemp -t mini-paas-p1-observability.XXXXXX)"
passed=0

cleanup() {
  rm -f "$response_file"
}
trap cleanup EXIT INT TERM

pass() {
  passed=$((passed + 1))
  printf 'ĐẠT: %s\n' "$1"
}

fail() {
  printf 'KHÔNG ĐẠT: %s\n' "$1" >&2
  exit 1
}

expect_status() {
  label="$1"
  expected="$2"
  shift 2
  actual="$(curl --silent --show-error --output "$response_file" --write-out '%{http_code}' --max-time 15 "$@")"
  if [ "$actual" != "$expected" ]; then
    printf 'KHÔNG ĐẠT: %s — mong đợi HTTP %s, nhận HTTP %s\n' "$label" "$expected" "$actual" >&2
    sed -n '1,20p' "$response_file" >&2
    exit 1
  fi
  pass "$label"
}

runner_id="$(docker compose ps -q runner)"
docker exec "$runner_id" node -e '
  fetch("http://127.0.0.1:3001/metrics").then(async (response) => {
    if (response.status !== 200) process.exit(1);
    const contentType = response.headers.get("content-type") || "";
    const body = await response.text();
    if (!contentType.includes("version=0.0.4")) process.exit(1);
    if (!body.includes("mini_paas_app_running{app_id=\"app-a\"} 1")) process.exit(1);
    if (!body.includes("mini_paas_app_running{app_id=\"app-b\"} 1")) process.exit(1);
    if (/NaN|Infinity/.test(body)) process.exit(1);
  }).catch(() => process.exit(1));
' || fail 'Runner không xuất đúng metric Prometheus cho hai ứng dụng'
pass 'Runner xuất metric Prometheus hữu hạn cho App A và App B'

for service in runner prometheus; do
  container_id="$(docker compose ps -q "$service")"
  port_bindings="$(docker inspect "$container_id" --format '{{json .HostConfig.PortBindings}}')"
  if [ "$port_bindings" != '{}' ] && [ "$port_bindings" != 'null' ]; then
    fail "$service đang công khai cổng ra host: $port_bindings"
  fi
done
pass 'Runner và Prometheus không công khai cổng ra host'

docker compose exec -T prometheus wget -q -O - http://127.0.0.1:9090/-/ready >"$response_file" \
  || fail 'Prometheus chưa sẵn sàng'
grep -F 'Prometheus Server is Ready' "$response_file" >/dev/null \
  || fail 'Phản hồi readiness của Prometheus không đúng'
pass 'Prometheus sẵn sàng nhận truy vấn'

attempt=0
while [ "$attempt" -lt 15 ]; do
  docker compose exec -T prometheus wget -q -O - \
    'http://127.0.0.1:9090/api/v1/query?query=mini_paas_app_running' >"$response_file" || true
  if node -e '
    const fs = require("node:fs");
    try {
      const body = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
      const core = body.data.result.filter((item) => ["app-a", "app-b"].includes(item.metric.app_id));
      if (body.status === "success" && core.length === 2 && core.every((item) => Number(item.value[1]) === 1)) process.exit(0);
    } catch {}
    process.exit(1);
  ' "$response_file"; then
    break
  fi
  attempt=$((attempt + 1))
  sleep 2
done
[ "$attempt" -lt 15 ] || fail 'Prometheus chưa thu được trạng thái của hai ứng dụng sau 30 giây'
pass 'Prometheus thu được trạng thái đang chạy của App A và App B'

range_end="$(date +%s)"
range_start=$((range_end - 30))
docker compose exec -T prometheus wget -q -O - \
  "http://127.0.0.1:9090/api/v1/query_range?query=mini_paas_app_running&start=${range_start}&end=${range_end}&step=5" >"$response_file" \
  || fail 'Không truy vấn được chuỗi thời gian 30 giây'
node -e '
  const fs = require("node:fs");
  const body = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  const core = body.data.result.filter((item) => ["app-a", "app-b"].includes(item.metric.app_id));
  if (body.status !== "success" || core.length !== 2) process.exit(1);
  if (core.some((item) => item.values.length < 2)) process.exit(1);
' "$response_file" || fail 'Chuỗi thời gian chưa có ít nhất hai mẫu cho mỗi ứng dụng'
pass 'Prometheus lưu nhiều mẫu theo thời gian cho App A và App B'

docker compose exec -T prometheus wget -q -O - \
  'http://127.0.0.1:9090/api/v1/query?query=mini_paas_app_memory_working_set_bytes' >"$response_file" \
  || fail 'Không truy vấn được metric RAM'
node -e '
  const fs = require("node:fs");
  const body = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  const core = body.data.result.filter((item) => ["app-a", "app-b"].includes(item.metric.app_id));
  if (body.status !== "success" || core.length !== 2) process.exit(1);
  if (core.some((item) => !Number.isFinite(Number(item.value[1])) || Number(item.value[1]) <= 0)) process.exit(1);
' "$response_file" || fail 'Metric RAM thiếu ứng dụng hoặc có giá trị không hợp lệ'
pass 'Chuỗi metric RAM có giá trị thực cho hai ứng dụng'

docker compose exec -T prometheus wget -q -O - \
  'http://127.0.0.1:9090/api/v1/targets' >"$response_file" || fail 'Không đọc được Prometheus targets'
node -e '
  const fs = require("node:fs");
  const body = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  const target = body.data.activeTargets.find((item) => item.labels.job === "mini-paas-runner");
  if (!target || target.health !== "up" || !target.scrapeUrl.endsWith("runner:3001/metrics")) process.exit(1);
' "$response_file" || fail 'Target Runner không ở trạng thái up'
pass 'Prometheus target Runner ở trạng thái up'

docker compose exec -T prometheus wget -q -O - \
  'http://127.0.0.1:9090/api/v1/rules' >"$response_file" || fail 'Không đọc được Prometheus rules'
node -e '
  const fs = require("node:fs");
  const body = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  const rules = body.data.groups.flatMap((group) => group.rules);
  const names = new Set(rules.map((rule) => rule.name));
  for (const required of ["MiniPaasApplicationNotHealthy", "MiniPaasApplicationMemoryHigh", "MiniPaasRunnerScrapeFailed"]) {
    if (!names.has(required)) process.exit(1);
  }
' "$response_file" || fail 'Thiếu một hoặc nhiều cảnh báo Prometheus đã khai báo'
pass 'Prometheus nạp đủ ba quy tắc cảnh báo'

expect_status 'Grafana khỏe qua đường dẫn Gateway' 200 \
  "${base_url}/monitoring/api/health"
node -e '
  const fs = require("node:fs");
  const body = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  if (body.database !== "ok") process.exit(1);
' "$response_file" || fail 'Grafana chưa kết nối được cơ sở dữ liệu nội bộ'
pass 'Grafana báo cơ sở dữ liệu nội bộ hoạt động'

expect_status 'Grafana yêu cầu xác thực khi đọc datasource' 401 \
  "${base_url}/monitoring/api/datasources/uid/mini-paas-prometheus"

expect_status 'Datasource Prometheus được cấp sẵn trong Grafana' 200 \
  -u "${admin_username}:${admin_password}" \
  "${base_url}/monitoring/api/datasources/uid/mini-paas-prometheus"
node -e '
  const fs = require("node:fs");
  const body = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  if (body.uid !== "mini-paas-prometheus" || body.url !== "http://prometheus:9090" || body.isDefault !== true) process.exit(1);
' "$response_file" || fail 'Datasource Grafana không đúng cấu hình mong đợi'
pass 'Datasource Grafana trỏ đúng Prometheus nội bộ'

expect_status 'Dashboard Mini PaaS được cấp sẵn trong Grafana' 200 \
  -u "${admin_username}:${admin_password}" \
  "${base_url}/monitoring/api/dashboards/uid/mini-paas-overview"
node -e '
  const fs = require("node:fs");
  const body = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  if (body.dashboard.uid !== "mini-paas-overview" || body.dashboard.panels.length < 6) process.exit(1);
' "$response_file" || fail 'Dashboard Grafana thiếu hoặc chưa đủ biểu đồ'
pass 'Dashboard Grafana có đủ sáu bảng trạng thái/tài nguyên'

printf '\nP1 observability integration test: %s kiểm tra đạt.\n' "$passed"
