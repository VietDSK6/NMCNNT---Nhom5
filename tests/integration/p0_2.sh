#!/usr/bin/env sh
set -eu

gateway_port="${GATEWAY_PORT:-8080}"
base_url="${BASE_URL:-http://127.0.0.1:${gateway_port}}"
admin_username="${ADMIN_USERNAME:-}"
admin_password="${ADMIN_PASSWORD:-}"

if [ -z "$admin_username" ] || [ -z "$admin_password" ]; then
  compose_config="$(docker compose config --format json)"
  if [ -z "$admin_username" ]; then
    admin_username="$(printf '%s' "$compose_config" | node -e '
      let input = "";
      process.stdin.on("data", (chunk) => input += chunk);
      process.stdin.on("end", () => process.stdout.write(JSON.parse(input).services["control-api"].environment.ADMIN_USERNAME));
    ')"
  fi
  if [ -z "$admin_password" ]; then
    admin_password="$(printf '%s' "$compose_config" | node -e '
      let input = "";
      process.stdin.on("data", (chunk) => input += chunk);
      process.stdin.on("end", () => process.stdout.write(JSON.parse(input).services["control-api"].environment.ADMIN_PASSWORD));
    ')"
  fi
  unset compose_config
fi

if [ -z "$admin_password" ]; then
  printf 'KHÔNG ĐẠT: không đọc được ADMIN_PASSWORD từ môi trường hoặc cấu hình Compose\n' >&2
  exit 1
fi
cookie_jar="$(mktemp -t mini-paas-cookie.XXXXXX)"
response_file="$(mktemp -t mini-paas-response.XXXXXX)"
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
  actual="$(curl --silent --show-error --output "$response_file" --write-out '%{http_code}' --max-time 8 "$@")"
  if [ "$actual" != "$expected" ]; then
    printf 'KHÔNG ĐẠT: %s — mong đợi HTTP %s, nhận HTTP %s\n' "$label" "$expected" "$actual" >&2
    sed -n '1,20p' "$response_file" >&2
    exit 1
  fi
  passed=$((passed + 1))
  printf 'ĐẠT: %s\n' "$label"
}

expect_status 'Dashboard được phục vụ qua Gateway' 200 "${base_url}/"
grep -F 'Mini PaaS' "$response_file" >/dev/null || {
  printf 'KHÔNG ĐẠT: HTML Dashboard thiếu tiêu đề Mini PaaS\n' >&2
  exit 1
}

expect_status 'Control API khỏe qua Gateway' 200 "${base_url}/api/health"
grep -F '"service":"control-api"' "$response_file" >/dev/null || {
  printf 'KHÔNG ĐẠT: phản hồi health không phải Control API\n' >&2
  exit 1
}

expect_status 'Từ chối danh sách ứng dụng khi chưa đăng nhập' 401 "${base_url}/api/v1/applications"

expect_status 'Từ chối mật khẩu sai' 401 \
  -X POST -H 'Content-Type: application/json' \
  --data "{\"username\":\"${admin_username}\",\"password\":\"not-the-password\"}" \
  "${base_url}/api/v1/auth/login"

expect_status 'Đăng nhập bằng tài khoản hợp lệ' 200 \
  -c "$cookie_jar" -X POST -H 'Content-Type: application/json' \
  --data "$login_payload" \
  "${base_url}/api/v1/auth/login"

expect_status 'Đọc phiên quản trị' 200 -b "$cookie_jar" "${base_url}/api/v1/auth/session"
node -e '
  const fs = require("node:fs");
  const body = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  if (body.user.username !== process.argv[2]) process.exit(1);
' "$response_file" "$admin_username" || {
  printf 'KHÔNG ĐẠT: phiên không trả đúng người dùng\n' >&2
  exit 1
}

expect_status 'Đọc hai ứng dụng từ Control API' 200 -b "$cookie_jar" "${base_url}/api/v1/applications"
node -e '
  const fs = require("node:fs");
  const body = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  if (body.data.length !== 2) process.exit(1);
  if (!body.data.every((app) => app.runtime.status === "not_integrated")) process.exit(1);
' "$response_file" || {
  printf 'KHÔNG ĐẠT: dữ liệu ứng dụng hoặc ranh giới Runner không đúng\n' >&2
  exit 1
}

expect_status 'Đọc nhật ký kiểm toán' 200 -b "$cookie_jar" "${base_url}/api/v1/audit-events?limit=10"

for service in dashboard control-api app-a app-b; do
  container_id="$(docker compose ps -q "$service")"
  port_bindings="$(docker inspect "$container_id" --format '{{json .HostConfig.PortBindings}}')"
  if [ "$port_bindings" != '{}' ] && [ "$port_bindings" != 'null' ]; then
    printf 'KHÔNG ĐẠT: %s có ánh xạ cổng ra máy chủ: %s\n' "$service" "$port_bindings" >&2
    exit 1
  fi
  passed=$((passed + 1))
  printf 'ĐẠT: %s không công khai cổng trực tiếp\n' "$service"
done

expect_status 'Đăng xuất phiên quản trị' 204 -b "$cookie_jar" -X POST "${base_url}/api/v1/auth/logout"
expect_status 'Phiên cũ bị vô hiệu sau đăng xuất' 401 -b "$cookie_jar" "${base_url}/api/v1/auth/session"

printf '\nP0.2 integration test: %s/14 kiểm tra đạt.\n' "$passed"
