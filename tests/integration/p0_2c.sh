#!/usr/bin/env sh
set -eu

gateway_port="${GATEWAY_PORT:-8080}"
base_url="${BASE_URL:-http://127.0.0.1:${gateway_port}}"
compose_config="$(docker compose config --format json)"
admin_username="$(printf '%s' "$compose_config" | node -e '
  let input = "";
  process.stdin.on("data", (chunk) => input += chunk);
  process.stdin.on("end", () => process.stdout.write(JSON.parse(input).services["control-api"].environment.ADMIN_USERNAME));
')"
admin_password="$(printf '%s' "$compose_config" | node -e '
  let input = "";
  process.stdin.on("data", (chunk) => input += chunk);
  process.stdin.on("end", () => process.stdout.write(JSON.parse(input).services["control-api"].environment.ADMIN_PASSWORD));
')"
unset compose_config

cookie_jar="$(mktemp -t mini-paas-p02c-cookie.XXXXXX)"
response_file="$(mktemp -t mini-paas-p02c-response.XXXXXX)"
login_payload="$(node -e 'process.stdout.write(JSON.stringify({ username: process.argv[1], password: process.argv[2] }))' "$admin_username" "$admin_password")"
passed=0

cleanup() {
  rm -f "$cookie_jar" "$response_file"
}
trap cleanup EXIT INT TERM

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
  passed=$((passed + 1))
  printf 'ĐẠT: %s\n' "$label"
}

# Tạo thêm log thật trước khi đọc qua control plane.
curl --silent --show-error --max-time 8 "${base_url}/apps/app-a/health" >/dev/null
curl --silent --show-error --max-time 8 "${base_url}/apps/app-a/version" >/dev/null

expect_status 'Từ chối đọc log khi chưa đăng nhập' 401 \
  "${base_url}/api/v1/applications/app-a/logs"
expect_status 'Từ chối đọc stats khi chưa đăng nhập' 401 \
  "${base_url}/api/v1/applications/app-a/stats"

expect_status 'Đăng nhập để kiểm thử P0.2C' 200 \
  -c "$cookie_jar" -X POST -H 'Content-Type: application/json' \
  --data "$login_payload" "${base_url}/api/v1/auth/login"

expect_status 'Từ chối tail bằng 0' 400 \
  -b "$cookie_jar" "${base_url}/api/v1/applications/app-a/logs?tail=0"
expect_status 'Từ chối tail vượt giới hạn 200' 400 \
  -b "$cookie_jar" "${base_url}/api/v1/applications/app-a/logs?tail=201"
expect_status 'Từ chối ứng dụng không đăng ký' 404 \
  -b "$cookie_jar" "${base_url}/api/v1/applications/not-registered/stats"

expect_status 'Đọc tối đa 50 dòng log App A' 200 \
  -b "$cookie_jar" "${base_url}/api/v1/applications/app-a/logs?tail=50"
node -e '
  const fs = require("node:fs");
  const body = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  const data = body.data;
  if (data.appId !== "app-a" || data.requestedTail !== 50) process.exit(1);
  if (!Array.isArray(data.lines) || data.lines.length < 1 || data.lines.length > 50) process.exit(1);
  if (data.lines.some((line) => !["stdout", "stderr"].includes(line.stream) || line.message.length > 4097)) process.exit(1);
' "$response_file" || {
  printf 'KHÔNG ĐẠT: Phản hồi log không đúng hợp đồng hoặc vượt giới hạn\n' >&2
  exit 1
}
passed=$((passed + 1))
printf 'ĐẠT: Phản hồi log đúng hợp đồng và có dữ liệu thật\n'

expect_status 'Đọc ảnh chụp tài nguyên App A' 200 \
  -b "$cookie_jar" "${base_url}/api/v1/applications/app-a/stats"
node -e '
  const fs = require("node:fs");
  const data = JSON.parse(fs.readFileSync(process.argv[1], "utf8")).data;
  const numeric = ["cpuPercent", "memoryWorkingSetBytes", "memoryLimitBytes", "memoryPercent", "pids", "networkRxBytes", "networkTxBytes"];
  if (data.appId !== "app-a" || !data.containerId || !data.sampledAt) process.exit(1);
  if (numeric.some((key) => !Number.isFinite(data[key]) || data[key] < 0)) process.exit(1);
  if (data.memoryLimitBytes <= 0 || data.pids < 1) process.exit(1);
' "$response_file" || {
  printf 'KHÔNG ĐẠT: Phản hồi stats thiếu trường hoặc giá trị không hợp lệ\n' >&2
  exit 1
}
passed=$((passed + 1))
printf 'ĐẠT: CPU/RAM/PID/mạng là số hữu hạn và có thời điểm lấy mẫu\n'

runner_id="$(docker compose ps -q runner)"
for path in logs stats; do
  direct_status="$(docker exec "$runner_id" node -e '
    fetch(`http://127.0.0.1:3001/v1/apps/app-a/${process.argv[1]}`).then((response) => process.stdout.write(String(response.status)));
  ' "$path")"
  if [ "$direct_status" != "401" ]; then
    printf 'KHÔNG ĐẠT: Runner không từ chối endpoint %s thiếu secret\n' "$path" >&2
    exit 1
  fi
  passed=$((passed + 1))
  printf 'ĐẠT: Runner từ chối endpoint %s thiếu secret\n' "$path"
done

printf '\nP0.2C integration test: %s kiểm tra đạt.\n' "$passed"
