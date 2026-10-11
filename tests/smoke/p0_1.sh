#!/usr/bin/env sh
set -eu

gateway_port="${GATEWAY_PORT:-8080}"
base_url="${BASE_URL:-http://127.0.0.1:${gateway_port}}"
expected_app_a_version="${APP_A_VERSION:-v1.0.0}"
expected_app_b_version="${APP_B_VERSION:-v1.0.0}"
passed=0

check_contains() {
  label="$1"
  path="$2"
  expected="$3"

  response="$(curl --fail --silent --show-error --max-time 5 "${base_url}${path}")" || {
    printf 'KHÔNG ĐẠT: %s — không gọi được %s\n' "$label" "$path" >&2
    exit 1
  }

  printf '%s' "$response" | grep -F "$expected" >/dev/null || {
    printf 'KHÔNG ĐẠT: %s — thiếu nội dung: %s\n' "$label" "$expected" >&2
    printf 'Phản hồi: %s\n' "$response" >&2
    exit 1
  }

  passed=$((passed + 1))
  printf 'ĐẠT: %s\n' "$label"
}

check_contains 'Gateway khỏe' '/healthz' '"service":"gateway"'
check_contains 'Trang Ứng dụng A' '/apps/app-a/' 'Ứng dụng A'
check_contains 'Health Ứng dụng A' '/apps/app-a/health' '"status":"ok"'
check_contains 'Phiên bản Ứng dụng A' '/apps/app-a/version' "\"version\":\"${expected_app_a_version}\""
check_contains 'Trang Ứng dụng B' '/apps/app-b/' 'Ứng dụng B'
check_contains 'Health Ứng dụng B' '/apps/app-b/health' '"status":"ok"'
check_contains 'Phiên bản Ứng dụng B' '/apps/app-b/version' "\"version\":\"${expected_app_b_version}\""

for service in app-a app-b; do
  container_id="$(docker compose ps -q "$service")"
  port_bindings="$(docker inspect "$container_id" --format '{{json .HostConfig.PortBindings}}')"
  if [ "$port_bindings" != '{}' ] && [ "$port_bindings" != 'null' ]; then
    printf 'KHÔNG ĐẠT: %s có ánh xạ cổng ra máy chủ: %s\n' "$service" "$port_bindings" >&2
    exit 1
  fi
  passed=$((passed + 1))
  printf 'ĐẠT: %s không công khai cổng 3000\n' "$service"
done

printf '\nP0.1 smoke test: %s/9 kiểm tra đạt.\n' "$passed"
