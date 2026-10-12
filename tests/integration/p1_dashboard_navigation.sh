#!/usr/bin/env sh
set -eu

base_url="${BASE_URL:-http://127.0.0.1:8080}"
response_file="$(mktemp)"
trap 'rm -f "$response_file"' EXIT

passed=0

expect_dashboard_route() {
  label="$1"
  route="$2"
  status="$(curl --silent --show-error --output "$response_file" --write-out '%{http_code}' \
    --header 'Accept: text/html' "${base_url}${route}")"

  if [ "$status" != "200" ]; then
    printf 'KHÔNG ĐẠT: %s trả HTTP %s\n' "$label" "$status" >&2
    exit 1
  fi
  if ! grep -q '<div id="root"></div>' "$response_file"; then
    printf 'KHÔNG ĐẠT: %s không trả về entrypoint Dashboard\n' "$label" >&2
    exit 1
  fi

  passed=$((passed + 1))
  printf 'ĐẠT: %s\n' "$label"
}

expect_dashboard_route 'Trang Tổng quan' '/'
expect_dashboard_route 'Danh sách ứng dụng' '/applications'
expect_dashboard_route 'Chi tiết App A' '/applications/app-a'
expect_dashboard_route 'Deployment của App A' '/applications/app-a/deployments'
expect_dashboard_route 'Quan sát App A' '/applications/app-a/observability'
expect_dashboard_route 'Chi tiết App B' '/applications/app-b'
expect_dashboard_route 'Triển khai toàn hệ thống' '/deployments'
expect_dashboard_route 'Lịch sử thao tác' '/operations'
expect_dashboard_route 'Nhật ký kiểm toán' '/audit'
expect_dashboard_route 'Quan sát toàn hệ thống' '/observability'

printf '\nP1 Dashboard navigation integration test: %s kiểm tra đạt.\n' "$passed"
