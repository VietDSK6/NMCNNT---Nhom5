#!/usr/bin/env sh
set -eu

commit_sha="${1:-$(git rev-parse HEAD)}"
gateway_port="${GATEWAY_PORT:-8080}"
base_url="${BASE_URL:-http://127.0.0.1:${gateway_port}}"
source_id="github-app-a"

case "$commit_sha" in
  *[!0-9a-f]*|'') printf 'Commit kiểm thử phải là SHA viết thường.\n' >&2; exit 2 ;;
esac
[ "${#commit_sha}" -eq 40 ] || { printf 'Commit kiểm thử phải đủ 40 ký tự.\n' >&2; exit 2; }

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

cookie_jar="$(mktemp -t mini-paas-p1-git-cookie.XXXXXX)"
response_file="$(mktemp -t mini-paas-p1-git-response.XXXXXX)"
login_payload="$(node -e 'process.stdout.write(JSON.stringify({ username: process.argv[1], password: process.argv[2] }))' "$admin_username" "$admin_password")"
passed=0
restored=false

cleanup() {
  if [ "$restored" != "true" ]; then
    docker compose up -d --wait --force-recreate app-a gateway >/dev/null 2>&1 || true
  fi
  rm -f "$cookie_jar" "$response_file"
}
trap cleanup EXIT INT TERM

expect_status() {
  label="$1"
  expected="$2"
  shift 2
  actual="$(curl --silent --show-error --output "$response_file" --write-out '%{http_code}' --max-time 20 "$@")"
  if [ "$actual" != "$expected" ]; then
    printf 'KHÔNG ĐẠT: %s — mong đợi HTTP %s, nhận HTTP %s\n' "$label" "$expected" "$actual" >&2
    sed -n '1,20p' "$response_file" >&2
    exit 1
  fi
  passed=$((passed + 1))
  printf 'ĐẠT: %s\n' "$label"
}

wait_deployment() {
  deployment_id="$1"
  attempt=0
  while [ "$attempt" -lt 180 ]; do
    curl --silent --show-error --max-time 10 -b "$cookie_jar" \
      "${base_url}/api/v1/deployments?limit=20" > "$response_file"
    current="$(node -e '
      const fs = require("node:fs");
      const body = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
      const deployment = body.data.find((item) => item.id === process.argv[2]);
      process.stdout.write(deployment ? deployment.status : "missing");
    ' "$response_file" "$deployment_id")"
    if [ "$current" = "succeeded" ]; then return 0; fi
    if [ "$current" = "failed" ]; then
      printf 'KHÔNG ĐẠT: deployment thất bại\n' >&2
      node -e '
        const fs = require("node:fs");
        const body = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
        const item = body.data.find((value) => value.id === process.argv[2]);
        console.error(item?.message ?? "Không có thông báo lỗi.");
        if (item?.buildLog) console.error(item.buildLog);
      ' "$response_file" "$deployment_id"
      return 1
    fi
    attempt=$((attempt + 1))
    sleep 1
  done
  printf 'KHÔNG ĐẠT: deployment chưa kết thúc sau 180 giây.\n' >&2
  return 1
}

wait_operation() {
  operation_id="$1"
  attempt=0
  while [ "$attempt" -lt 60 ]; do
    curl --silent --show-error --max-time 10 -b "$cookie_jar" \
      "${base_url}/api/v1/operations?limit=20" > "$response_file"
    current="$(node -e '
      const fs = require("node:fs");
      const body = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
      const operation = body.data.find((item) => item.id === process.argv[2]);
      process.stdout.write(operation ? operation.status : "missing");
    ' "$response_file" "$operation_id")"
    [ "$current" = "succeeded" ] && return 0
    [ "$current" = "failed" ] && return 1
    attempt=$((attempt + 1))
    sleep 1
  done
  return 1
}

expect_status 'Đăng nhập để kiểm thử deployment từ Git' 200 \
  -c "$cookie_jar" -X POST -H 'Content-Type: application/json' \
  --data "$login_payload" "${base_url}/api/v1/auth/login"

expect_status 'Danh sách source chỉ trả repository được phép' 200 \
  -b "$cookie_jar" "${base_url}/api/v1/sources"
grep -F '"id":"github-app-a"' "$response_file" >/dev/null

expect_status 'Từ chối tạo deployment khi chưa đăng nhập' 401 \
  -X POST -H 'Content-Type: application/json' \
  --data "{\"sourceId\":\"${source_id}\",\"commit\":\"${commit_sha}\"}" \
  "${base_url}/api/v1/deployments"

expect_status 'Từ chối tên nhánh thay cho commit SHA' 400 \
  -b "$cookie_jar" -X POST -H 'Content-Type: application/json' \
  --data "{\"sourceId\":\"${source_id}\",\"commit\":\"main\"}" \
  "${base_url}/api/v1/deployments"

expect_status 'Tiếp nhận build và deploy commit tin cậy' 202 \
  -b "$cookie_jar" -X POST -H 'Content-Type: application/json' \
  --data "{\"sourceId\":\"${source_id}\",\"commit\":\"${commit_sha}\"}" \
  "${base_url}/api/v1/deployments"
deployment_id="$(node -e '
  const fs = require("node:fs");
  process.stdout.write(JSON.parse(fs.readFileSync(process.argv[1], "utf8")).data.id);
' "$response_file")"

wait_deployment "$deployment_id"
passed=$((passed + 1))
printf 'ĐẠT: Runner build và triển khai commit thành công\n'

image_reference="$(node -e '
  const fs = require("node:fs");
  const body = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  const item = body.data.find((value) => value.id === process.argv[2]);
  process.stdout.write(item.imageReference);
' "$response_file" "$deployment_id")"

short_sha="$(printf '%.12s' "$commit_sha")"
expected_version="git-${short_sha}"
expect_status 'App A phản hồi qua Gateway sau deployment' 200 "${base_url}/apps/app-a/version"
grep -F "\"version\":\"${expected_version}\"" "$response_file" >/dev/null || {
  printf 'KHÔNG ĐẠT: App A chưa chạy phiên bản %s\n' "$expected_version" >&2
  exit 1
}

revision_label="$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$image_reference")"
[ "$revision_label" = "$commit_sha" ] || { printf 'KHÔNG ĐẠT: nhãn revision của image không khớp commit.\n' >&2; exit 1; }
passed=$((passed + 1))
printf 'ĐẠT: Image lưu đúng nhãn commit và lịch sử deployment\n'

expect_status 'Tiếp nhận yêu cầu đưa App A về v1.0.0' 202 \
  -b "$cookie_jar" -X POST -H 'Content-Type: application/json' \
  --data '{"action":"update","version":"v1.0.0"}' \
  "${base_url}/api/v1/applications/app-a/actions"
operation_id="$(node -e '
  const fs = require("node:fs");
  process.stdout.write(JSON.parse(fs.readFileSync(process.argv[1], "utf8")).data.id);
' "$response_file")"
wait_operation "$operation_id"
expect_status 'App A trở lại v1.0.0 sau kiểm thử' 200 "${base_url}/apps/app-a/version"
grep -F '"version":"v1.0.0"' "$response_file" >/dev/null
restored=true

printf '\nP1 Git deployment integration test: %s kiểm tra đạt.\n' "$passed"
