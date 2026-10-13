#!/usr/bin/env sh
set -eu

gateway_port="${GATEWAY_PORT:-8080}"
base_url="${BASE_URL:-http://127.0.0.1:${gateway_port}}"
source_id="github-app-a"
expected_commit="$(git ls-remote origin refs/heads/main | awk 'NR == 1 { print $1 }')"

case "$expected_commit" in
  *[!0-9a-f]*|'') printf 'Không đọc được commit mới nhất của origin/main.\n' >&2; exit 2 ;;
esac
[ "${#expected_commit}" -eq 40 ] || { printf 'Commit mới nhất không đủ 40 ký tự.\n' >&2; exit 2; }

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

cookie_jar="$(mktemp -t mini-paas-latest-cookie.XXXXXX)"
response_file="$(mktemp -t mini-paas-latest-response.XXXXXX)"
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
  actual="$(curl --silent --show-error --output "$response_file" --write-out '%{http_code}' --max-time 30 "$@")"
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
      "${base_url}/api/v1/deployments?limit=30" > "$response_file"
    current="$(node -e '
      const fs = require("node:fs");
      const deployment = JSON.parse(fs.readFileSync(process.argv[1], "utf8")).data.find((item) => item.id === process.argv[2]);
      process.stdout.write(deployment ? deployment.status : "missing");
    ' "$response_file" "$deployment_id")"
    [ "$current" = "succeeded" ] && return 0
    if [ "$current" = "failed" ]; then
      sed -n '1,20p' "$response_file" >&2
      return 1
    fi
    attempt=$((attempt + 1))
    sleep 1
  done
  return 1
}

wait_operation() {
  operation_id="$1"
  attempt=0
  while [ "$attempt" -lt 60 ]; do
    curl --silent --show-error --max-time 10 -b "$cookie_jar" \
      "${base_url}/api/v1/operations?limit=30" > "$response_file"
    current="$(node -e '
      const fs = require("node:fs");
      const operation = JSON.parse(fs.readFileSync(process.argv[1], "utf8")).data.find((item) => item.id === process.argv[2]);
      process.stdout.write(operation ? operation.status : "missing");
    ' "$response_file" "$operation_id")"
    [ "$current" = "succeeded" ] && return 0
    [ "$current" = "failed" ] && return 1
    attempt=$((attempt + 1))
    sleep 1
  done
  return 1
}

expect_status 'Đăng nhập để kiểm thử commit mới nhất' 200 \
  -c "$cookie_jar" -X POST -H 'Content-Type: application/json' \
  --data "$login_payload" "${base_url}/api/v1/auth/login"

expect_status 'Source công khai nhánh mặc định đã allowlist' 200 \
  -b "$cookie_jar" "${base_url}/api/v1/sources"
node -e '
  const fs = require("node:fs");
  const source = JSON.parse(fs.readFileSync(process.argv[1], "utf8")).data.find((item) => item.id === process.argv[2]);
  if (!source || source.defaultBranch !== "main") process.exit(1);
' "$response_file" "$source_id" || { printf 'KHÔNG ĐẠT: source không công khai đúng nhánh main.\n' >&2; exit 1; }
passed=$((passed + 1))
printf 'ĐẠT: Nhánh main được cố định trong source catalog\n'

expect_status 'Từ chối deploy latest khi chưa đăng nhập' 401 \
  -X POST -H 'Content-Type: application/json' \
  --data "{\"sourceId\":\"${source_id}\"}" "${base_url}/api/v1/deployments/latest"

expect_status 'Từ chối source ngoài allowlist' 404 \
  -b "$cookie_jar" -X POST -H 'Content-Type: application/json' \
  --data '{"sourceId":"unknown-source"}' "${base_url}/api/v1/deployments/latest"

expect_status 'Phân giải và tiếp nhận commit mới nhất' 202 \
  -b "$cookie_jar" -X POST -H 'Content-Type: application/json' \
  --data "{\"sourceId\":\"${source_id}\"}" "${base_url}/api/v1/deployments/latest"
deployment_id="$(node -e '
  const fs = require("node:fs");
  const item = JSON.parse(fs.readFileSync(process.argv[1], "utf8")).data;
  if (item.commitSha !== process.argv[2]) process.exit(1);
  process.stdout.write(item.id);
' "$response_file" "$expected_commit")" || { printf 'KHÔNG ĐẠT: SHA đã phân giải không khớp origin/main.\n' >&2; exit 1; }
passed=$((passed + 1))
printf 'ĐẠT: API lưu đúng SHA 40 ký tự của origin/main\n'

wait_deployment "$deployment_id" || { printf 'KHÔNG ĐẠT: build/deploy commit mới nhất thất bại.\n' >&2; exit 1; }
passed=$((passed + 1))
printf 'ĐẠT: Runner build và triển khai commit mới nhất\n'

image_reference="$(node -e '
  const fs = require("node:fs");
  const item = JSON.parse(fs.readFileSync(process.argv[1], "utf8")).data.find((value) => value.id === process.argv[2]);
  process.stdout.write(item.imageReference);
' "$response_file" "$deployment_id")"

short_sha="$(printf '%.12s' "$expected_commit")"
expected_version="git-${short_sha}"
expect_status 'App A phản hồi sau deployment latest' 200 "${base_url}/apps/app-a/version"
grep -F "\"version\":\"${expected_version}\"" "$response_file" >/dev/null || {
  printf 'KHÔNG ĐẠT: App A chưa chạy phiên bản %s.\n' "$expected_version" >&2
  exit 1
}
passed=$((passed + 1))
printf 'ĐẠT: App A chạy đúng phiên bản từ commit mới nhất\n'

revision_label="$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$image_reference")"
[ "$revision_label" = "$expected_commit" ] || { printf 'KHÔNG ĐẠT: nhãn revision không khớp commit mới nhất.\n' >&2; exit 1; }
passed=$((passed + 1))
printf 'ĐẠT: Image lưu đúng nhãn commit mới nhất\n'

expect_status 'Release ghi nhận commit mới nhất' 200 \
  -b "$cookie_jar" "${base_url}/api/v1/releases?applicationId=app-a&limit=30"
grep -F "$expected_commit" "$response_file" >/dev/null || { printf 'KHÔNG ĐẠT: release thiếu commit mới nhất.\n' >&2; exit 1; }

expect_status 'Tiếp nhận yêu cầu đưa App A về v1.0.0' 202 \
  -b "$cookie_jar" -X POST -H 'Content-Type: application/json' \
  --data '{"action":"update","version":"v1.0.0"}' \
  "${base_url}/api/v1/applications/app-a/actions"
operation_id="$(node -e '
  const fs = require("node:fs");
  process.stdout.write(JSON.parse(fs.readFileSync(process.argv[1], "utf8")).data.id);
' "$response_file")"
wait_operation "$operation_id" || exit 1
passed=$((passed + 1))
printf 'ĐẠT: Hoàn tất thao tác khôi phục App A\n'

expect_status 'App A trở lại v1.0.0 sau kiểm thử' 200 "${base_url}/apps/app-a/version"
grep -F '"version":"v1.0.0"' "$response_file" >/dev/null
restored=true

printf '\nP1 Deploy latest commit integration test: %s kiểm tra đạt.\n' "$passed"
