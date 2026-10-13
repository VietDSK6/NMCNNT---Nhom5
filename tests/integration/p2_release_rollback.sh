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

cookie_jar="$(mktemp -t mini-paas-rollback-cookie.XXXXXX)"
response_file="$(mktemp -t mini-paas-rollback-response.XXXXXX)"
login_payload="$(node -e 'process.stdout.write(JSON.stringify({ username: process.argv[1], password: process.argv[2] }))' "$admin_username" "$admin_password")"
passed=0
completed=false

cleanup() {
  if [ "$completed" != "true" ]; then
    docker compose up -d --wait --force-recreate app-a gateway >/dev/null 2>&1 || true
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
      "${base_url}/api/v1/operations?limit=40" > "$response_file"
    current="$(node -e '
      const fs = require("node:fs");
      const operation = JSON.parse(fs.readFileSync(process.argv[1], "utf8")).data.find((item) => item.id === process.argv[2]);
      process.stdout.write(operation ? operation.status : "missing");
    ' "$response_file" "$operation_id")"
    if [ "$current" = "succeeded" ]; then return 0; fi
    if [ "$current" = "failed" ]; then return 1; fi
    attempt=$((attempt + 1))
    sleep 1
  done
  return 1
}

update_app_a() {
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

expect_status 'Từ chối đọc release khi chưa đăng nhập' 401 \
  "${base_url}/api/v1/releases?applicationId=app-a"

expect_status 'Đăng nhập để kiểm thử rollback' 200 \
  -c "$cookie_jar" -X POST -H 'Content-Type: application/json' \
  --data "$login_payload" "${base_url}/api/v1/auth/login"

update_app_a 'v2.0.0'

expect_status 'Đọc lịch sử release của App A' 200 \
  -b "$cookie_jar" "${base_url}/api/v1/releases?applicationId=app-a&limit=40"
target_release="$(node -e '
  const fs = require("node:fs");
  const releases = JSON.parse(fs.readFileSync(process.argv[1], "utf8")).data;
  const target = releases.find((item) => item.origin === "catalog" && item.version === "v2.0.0");
  if (!target || !/^sha256:[0-9a-f]{64}$/.test(target.imageId)) process.exit(1);
  process.stdout.write(JSON.stringify({ id: target.id, imageId: target.imageId }));
' "$response_file")" || {
  printf 'KHÔNG ĐẠT: không tìm thấy release v2 có image ID hợp lệ\n' >&2
  exit 1
}
target_release_id="$(node -e 'process.stdout.write(JSON.parse(process.argv[1]).id)' "$target_release")"
target_image_id="$(node -e 'process.stdout.write(JSON.parse(process.argv[1]).imageId)' "$target_release")"
passed=$((passed + 1))
printf 'ĐẠT: Release v2 lưu image ID bất biến\n'

update_app_a 'v1.0.0'

expect_status 'Từ chối rollback khi chưa đăng nhập' 401 \
  -X POST "${base_url}/api/v1/releases/${target_release_id}/rollback"

expect_status 'Rollback App A về release v2' 200 \
  -b "$cookie_jar" -X POST "${base_url}/api/v1/releases/${target_release_id}/rollback"
node -e '
  const fs = require("node:fs");
  const body = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  if (body.data.origin !== "rollback") process.exit(1);
  if (body.data.rollbackOfReleaseId !== process.argv[2]) process.exit(1);
  if (body.runtime.imageId !== process.argv[3]) process.exit(1);
' "$response_file" "$target_release_id" "$target_image_id" || {
  printf 'KHÔNG ĐẠT: phản hồi rollback không khớp release đích\n' >&2
  exit 1
}
passed=$((passed + 1))
printf 'ĐẠT: Bản ghi rollback tham chiếu đúng release đích và image ID\n'

expect_status 'Endpoint App A phản ánh phiên bản v2 sau rollback' 200 \
  "${base_url}/apps/app-a/version"
grep -F '"version":"v2.0.0"' "$response_file" >/dev/null || {
  printf 'KHÔNG ĐẠT: App A chưa chạy v2.0.0 sau rollback\n' >&2
  exit 1
}

app_a_id="$(docker compose ps -q app-a)"
docker inspect "$app_a_id" | node -e '
  let input = "";
  process.stdin.on("data", (chunk) => input += chunk);
  process.stdin.on("end", () => {
    const inspect = JSON.parse(input)[0];
    if (inspect.Image !== process.argv[1]) process.exit(1);
    if (!inspect.Config.Env.includes("APP_VERSION=v2.0.0")) process.exit(1);
  });
' "$target_image_id" || {
  printf 'KHÔNG ĐẠT: container sau rollback không dùng đúng image ID/version\n' >&2
  exit 1
}
passed=$((passed + 1))
printf 'ĐẠT: Container chạy đúng image ID đã ghi trong release\n'

expect_status 'Audit ghi nhận rollback thành công' 200 \
  -b "$cookie_jar" "${base_url}/api/v1/audit-events?limit=30"
grep -F 'release.rollback' "$response_file" >/dev/null || {
  printf 'KHÔNG ĐẠT: audit thiếu hành động release.rollback\n' >&2
  exit 1
}

update_app_a 'v1.0.0'
expect_status 'Đưa App A về v1 sau kiểm thử rollback' 200 "${base_url}/apps/app-a/version"
grep -F '"version":"v1.0.0"' "$response_file" >/dev/null || exit 1

completed=true
printf '\nP2 Release rollback integration test: %s kiểm tra đạt.\n' "$passed"
