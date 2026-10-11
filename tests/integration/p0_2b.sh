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

cookie_jar="$(mktemp -t mini-paas-p02b-cookie.XXXXXX)"
response_file="$(mktemp -t mini-paas-p02b-response.XXXXXX)"
login_payload="$(node -e 'process.stdout.write(JSON.stringify({ username: process.argv[1], password: process.argv[2] }))' "$admin_username" "$admin_password")"
passed=0
completed=false

cleanup() {
  if [ "$completed" != "true" ]; then
    docker compose up -d --wait --force-recreate app-a app-b gateway >/dev/null 2>&1 || true
  fi
  rm -f "$cookie_jar" "$response_file"
}
trap cleanup EXIT INT TERM

expect_status() {
  label="$1"
  expected="$2"
  shift 2
  actual="$(curl --silent --show-error --output "$response_file" --write-out '%{http_code}' --max-time 12 "$@")"
  if [ "$actual" != "$expected" ]; then
    printf 'KHÔNG ĐẠT: %s — mong đợi HTTP %s, nhận HTTP %s\n' "$label" "$expected" "$actual" >&2
    sed -n '1,20p' "$response_file" >&2
    exit 1
  fi
  passed=$((passed + 1))
  printf 'ĐẠT: %s\n' "$label"
}

wait_operation() {
  operation_id="$1"
  expected="$2"
  attempt=0
  while [ "$attempt" -lt 60 ]; do
    curl --silent --show-error --max-time 8 -b "$cookie_jar" \
      "${base_url}/api/v1/operations?limit=30" > "$response_file"
    current="$(node -e '
      const fs = require("node:fs");
      const body = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
      const operation = body.data.find((item) => item.id === process.argv[2]);
      process.stdout.write(operation ? operation.status : "missing");
    ' "$response_file" "$operation_id")"
    if [ "$current" = "$expected" ]; then return 0; fi
    if [ "$current" = "failed" ] && [ "$expected" != "failed" ]; then
      printf 'KHÔNG ĐẠT: operation %s thất bại\n' "$operation_id" >&2
      sed -n '1,20p' "$response_file" >&2
      return 1
    fi
    attempt=$((attempt + 1))
    sleep 1
  done
  printf 'KHÔNG ĐẠT: operation %s không đạt trạng thái %s trong thời gian cho phép\n' "$operation_id" "$expected" >&2
  return 1
}

submit_action() {
  app_id="$1"
  payload="$2"
  expect_status "Tiếp nhận thao tác ${payload} cho ${app_id}" 202 \
    -b "$cookie_jar" -X POST -H 'Content-Type: application/json' \
    --data "$payload" "${base_url}/api/v1/applications/${app_id}/actions"
  submitted_operation_id="$(node -e '
    const fs = require("node:fs");
    const body = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    process.stdout.write(body.data.id);
  ' "$response_file")"
}

expect_status 'Đăng nhập để kiểm thử thao tác P0.2B' 200 \
  -c "$cookie_jar" -X POST -H 'Content-Type: application/json' \
  --data "$login_payload" "${base_url}/api/v1/auth/login"

expect_status 'Từ chối thao tác ứng dụng khi chưa đăng nhập' 401 \
  -X POST -H 'Content-Type: application/json' --data '{"action":"restart"}' \
  "${base_url}/api/v1/applications/app-a/actions"

expect_status 'Từ chối action ngoài schema tại Control API' 400 \
  -b "$cookie_jar" -X POST -H 'Content-Type: application/json' --data '{"action":"exec"}' \
  "${base_url}/api/v1/applications/app-a/actions"

runner_id="$(docker compose ps -q runner)"
runner_unauthorized="$(docker exec "$runner_id" node -e '
  fetch("http://127.0.0.1:3001/v1/apps/app-a").then((response) => process.stdout.write(String(response.status)));
')"
if [ "$runner_unauthorized" != "401" ]; then
  printf 'KHÔNG ĐẠT: Runner không từ chối yêu cầu thiếu secret\n' >&2
  exit 1
fi
passed=$((passed + 1))
printf 'ĐẠT: Runner từ chối yêu cầu nội bộ thiếu secret\n'

for service in gateway dashboard control-api app-a app-b; do
  container_id="$(docker compose ps -q "$service")"
  socket_mount="$(docker inspect "$container_id" --format '{{range .Mounts}}{{if eq .Destination "/var/run/docker.sock"}}{{.Source}}{{end}}{{end}}')"
  if [ -n "$socket_mount" ]; then
    printf 'KHÔNG ĐẠT: %s được gắn Docker socket ngoài thiết kế\n' "$service" >&2
    exit 1
  fi
done
runner_socket="$(docker inspect "$runner_id" --format '{{range .Mounts}}{{if eq .Destination "/var/run/docker.sock"}}{{.Destination}}{{end}}{{end}}')"
if [ "$runner_socket" != "/var/run/docker.sock" ]; then
  printf 'KHÔNG ĐẠT: Runner chưa được gắn Docker socket\n' >&2
  exit 1
fi
passed=$((passed + 1))
printf 'ĐẠT: Docker socket chỉ được gắn vào Runner\n'

submit_action app-b '{"action":"stop"}'
operation_id="$submitted_operation_id"
wait_operation "$operation_id" succeeded
passed=$((passed + 1))
printf 'ĐẠT: Dừng App B và ghi operation thành công\n'

stopped_status="$(curl --silent --show-error --output "$response_file" --write-out '%{http_code}' --max-time 8 "${base_url}/apps/app-b/health")"
if [ "$stopped_status" != "502" ] && [ "$stopped_status" != "504" ]; then
  printf 'KHÔNG ĐẠT: Gateway phải phản ánh App B đã dừng bằng HTTP 502/504, nhận HTTP %s\n' "$stopped_status" >&2
  exit 1
fi
passed=$((passed + 1))
printf 'ĐẠT: Gateway phản ánh App B đã dừng bằng HTTP %s\n' "$stopped_status"

submit_action app-b '{"action":"start"}'
operation_id="$submitted_operation_id"
wait_operation "$operation_id" succeeded
passed=$((passed + 1))
printf 'ĐẠT: Khởi động lại App B và chờ health thành công\n'
expect_status 'App B truy cập lại qua Gateway' 200 "${base_url}/apps/app-b/health"

submit_action app-b '{"action":"restart"}'
operation_id="$submitted_operation_id"
wait_operation "$operation_id" succeeded
passed=$((passed + 1))
printf 'ĐẠT: Khởi động lại App B có kiểm soát\n'

submit_action app-a '{"action":"update","version":"v2.0.0"}'
operation_id="$submitted_operation_id"
wait_operation "$operation_id" succeeded
passed=$((passed + 1))
printf 'ĐẠT: Cập nhật App A từ v1 lên v2\n'
expect_status 'Endpoint phiên bản App A trả v2.0.0' 200 "${base_url}/apps/app-a/version"
grep -F '"version":"v2.0.0"' "$response_file" >/dev/null || {
  printf 'KHÔNG ĐẠT: App A chưa chạy v2.0.0\n' >&2
  exit 1
}

submit_action app-a '{"action":"update","version":"latest"}'
operation_id="$submitted_operation_id"
wait_operation "$operation_id" failed
passed=$((passed + 1))
printf 'ĐẠT: Runner từ chối phiên bản không nằm trong danh sách cho phép\n'

submit_action app-a '{"action":"update","version":"v1.0.0"}'
operation_id="$submitted_operation_id"
wait_operation "$operation_id" succeeded
passed=$((passed + 1))
printf 'ĐẠT: Đưa App A về v1 sau kiểm thử\n'
expect_status 'Endpoint phiên bản App A trở lại v1.0.0' 200 "${base_url}/apps/app-a/version"
grep -F '"version":"v1.0.0"' "$response_file" >/dev/null || {
  printf 'KHÔNG ĐẠT: App A chưa trở lại v1.0.0\n' >&2
  exit 1
}

completed=true
printf '\nP0.2B integration test: %s kiểm tra đạt.\n' "$passed"
