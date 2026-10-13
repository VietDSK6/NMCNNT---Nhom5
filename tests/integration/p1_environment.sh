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

cookie_jar="$(mktemp -t mini-paas-env-cookie.XXXXXX)"
response_file="$(mktemp -t mini-paas-env-response.XXXXXX)"
login_payload="$(node -e 'process.stdout.write(JSON.stringify({ username: process.argv[1], password: process.argv[2] }))' "$admin_username" "$admin_password")"
passed=0

cleanup() {
  if [ -s "$cookie_jar" ]; then
    curl --silent --show-error --max-time 50 -b "$cookie_jar" -X PUT \
      -H 'Content-Type: application/json' --data '{"variables":[]}' \
      "${base_url}/api/v1/applications/app-a/environment" >/dev/null 2>&1 || true
  fi
  rm -f "$cookie_jar" "$response_file"
}
trap cleanup EXIT INT TERM

expect_status() {
  label="$1"
  expected="$2"
  shift 2
  actual="$(curl --silent --show-error --output "$response_file" --write-out '%{http_code}' --max-time 50 "$@")"
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
    if [ "$current" = "succeeded" ]; then return 0; fi
    if [ "$current" = "failed" ]; then return 1; fi
    attempt=$((attempt + 1))
    sleep 1
  done
  return 1
}

submit_update() {
  version="$1"
  payload="$(node -e 'process.stdout.write(JSON.stringify({ action: "update", version: process.argv[1] }))' "$version")"
  expect_status "Tiếp nhận cập nhật App A lên ${version}" 202 \
    -b "$cookie_jar" -X POST -H 'Content-Type: application/json' --data "$payload" \
    "${base_url}/api/v1/applications/app-a/actions"
  operation_id="$(node -e '
    const fs = require("node:fs");
    process.stdout.write(JSON.parse(fs.readFileSync(process.argv[1], "utf8")).data.id);
  ' "$response_file")"
  wait_operation "$operation_id" || {
    printf 'KHÔNG ĐẠT: cập nhật App A lên %s thất bại\n' "$version" >&2
    exit 1
  }
  passed=$((passed + 1))
  printf 'ĐẠT: App A hoàn tất cập nhật lên %s\n' "$version"
}

expect_status 'Từ chối đọc biến môi trường khi chưa đăng nhập' 401 \
  "${base_url}/api/v1/applications/app-a/environment"

expect_status 'Đăng nhập để kiểm thử biến môi trường' 200 \
  -c "$cookie_jar" -X POST -H 'Content-Type: application/json' \
  --data "$login_payload" "${base_url}/api/v1/auth/login"

expect_status 'Đưa cấu hình App A về trạng thái rỗng ban đầu' 200 \
  -b "$cookie_jar" -X PUT -H 'Content-Type: application/json' --data '{"variables":[]}' \
  "${base_url}/api/v1/applications/app-a/environment"

expect_status 'Từ chối ghi đè APP_VERSION do nền tảng quản lý' 400 \
  -b "$cookie_jar" -X PUT -H 'Content-Type: application/json' \
  --data '{"variables":[{"key":"APP_VERSION","value":"unsafe","sensitive":false}]}' \
  "${base_url}/api/v1/applications/app-a/environment"

environment_payload='{"variables":[{"key":"APP_MESSAGE","value":"Cau hinh tu Mini PaaS","sensitive":false},{"key":"DEMO_SECRET","value":"development-secret-not-for-production","sensitive":true}]}'
expect_status 'Áp dụng biến thường và biến nhạy cảm cho App A' 200 \
  -b "$cookie_jar" -X PUT -H 'Content-Type: application/json' --data "$environment_payload" \
  "${base_url}/api/v1/applications/app-a/environment"

if grep -F 'development-secret-not-for-production' "$response_file" >/dev/null; then
  printf 'KHÔNG ĐẠT: API trả lại giá trị nhạy cảm sau khi lưu\n' >&2
  exit 1
fi
passed=$((passed + 1))
printf 'ĐẠT: Phản hồi cập nhật không làm lộ giá trị nhạy cảm\n'

expect_status 'Đọc danh sách biến môi trường đã lưu' 200 \
  -b "$cookie_jar" "${base_url}/api/v1/applications/app-a/environment"
node -e '
  const fs = require("node:fs");
  const body = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  const message = body.data.variables.find((item) => item.key === "APP_MESSAGE");
  const secret = body.data.variables.find((item) => item.key === "DEMO_SECRET");
  if (body.data.count !== 2) process.exit(1);
  if (message?.value !== "Cau hinh tu Mini PaaS") process.exit(1);
  if (secret?.value !== null || secret?.sensitive !== true) process.exit(1);
' "$response_file" || {
  printf 'KHÔNG ĐẠT: API không trả đúng metadata hoặc chưa che secret\n' >&2
  exit 1
}
passed=$((passed + 1))
printf 'ĐẠT: API chỉ trả metadata của biến nhạy cảm\n'

expect_status 'Ứng dụng nhận cấu hình mới qua Gateway' 200 "${base_url}/apps/app-a/config"
node -e '
  const fs = require("node:fs");
  const body = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  if (body.appMessage !== "Cau hinh tu Mini PaaS" || body.hasDemoSecret !== true) process.exit(1);
' "$response_file" || {
  printf 'KHÔNG ĐẠT: App A chưa nhận đủ biến môi trường\n' >&2
  exit 1
}
passed=$((passed + 1))
printf 'ĐẠT: App A dùng biến thường và nhận biết secret mà không công khai giá trị\n'

app_a_id="$(docker compose ps -q app-a)"
docker inspect "$app_a_id" | node -e '
  let input = "";
  process.stdin.on("data", (chunk) => input += chunk);
  process.stdin.on("end", () => {
    const inspect = JSON.parse(input)[0];
    const labels = inspect.Config.Labels || {};
    if (labels["io.mini-paas.environment-keys"] !== "APP_MESSAGE,DEMO_SECRET") process.exit(1);
    if (!inspect.Config.Env.includes("APP_MESSAGE=Cau hinh tu Mini PaaS")) process.exit(1);
    if (!inspect.Config.Env.includes("DEMO_SECRET=development-secret-not-for-production")) process.exit(1);
  });
' || {
  printf 'KHÔNG ĐẠT: container không có cấu hình môi trường mong đợi\n' >&2
  exit 1
}
passed=$((passed + 1))
printf 'ĐẠT: Runner gắn biến vào đúng container và ghi nhãn tên biến\n'

submit_update 'v2.0.0'
expect_status 'Biến môi trường còn hiệu lực sau cập nhật phiên bản' 200 "${base_url}/apps/app-a/config"
node -e '
  const fs = require("node:fs");
  const body = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  if (body.appMessage !== "Cau hinh tu Mini PaaS" || body.hasDemoSecret !== true) process.exit(1);
' "$response_file" || {
  printf 'KHÔNG ĐẠT: biến môi trường bị mất sau cập nhật phiên bản\n' >&2
  exit 1
}
passed=$((passed + 1))
printf 'ĐẠT: Cập nhật image bảo toàn biến môi trường đã quản lý\n'

expect_status 'Xóa toàn bộ biến môi trường tùy chỉnh' 200 \
  -b "$cookie_jar" -X PUT -H 'Content-Type: application/json' --data '{"variables":[]}' \
  "${base_url}/api/v1/applications/app-a/environment"
expect_status 'Ứng dụng không còn cấu hình tùy chỉnh sau khi xóa' 200 "${base_url}/apps/app-a/config"
grep -F '"appMessage":null' "$response_file" >/dev/null || exit 1
grep -F '"hasDemoSecret":false' "$response_file" >/dev/null || exit 1

submit_update 'v1.0.0'

expect_status 'Audit ghi nhận thay đổi cấu hình mà không chứa secret' 200 \
  -b "$cookie_jar" "${base_url}/api/v1/audit-events?limit=20"
if grep -F 'development-secret-not-for-production' "$response_file" >/dev/null; then
  printf 'KHÔNG ĐẠT: audit làm lộ giá trị nhạy cảm\n' >&2
  exit 1
fi
grep -F 'application.environment.update' "$response_file" >/dev/null || {
  printf 'KHÔNG ĐẠT: audit thiếu thao tác cập nhật biến môi trường\n' >&2
  exit 1
}
passed=$((passed + 1))
printf 'ĐẠT: Audit chỉ lưu hành động và số lượng biến\n'

printf '\nP1 Environment Variables integration test: %s kiểm tra đạt.\n' "$passed"
