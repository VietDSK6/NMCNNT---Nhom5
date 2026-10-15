#!/usr/bin/env sh
set -eu

repository_root="$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd -P)"
timestamp="$(date -u '+%Y%m%dT%H%M%SZ')"
output_directory="${T08_OUTPUT_DIR:-${repository_root}/output/t08/${timestamp}}"
restore_volume="mini-paas-t08-restore-${timestamp}-$$"
restore_container="mini-paas-t08-restore-${timestamp}-$$"
control_image="${CONTROL_API_IMAGE:-mini-paas/control-api:p1-observability}"
result_file="${output_directory}/result.txt"

umask 077
mkdir -p "$output_directory"
output_absolute="$(CDPATH= cd -- "$output_directory" && pwd -P)"

cleanup() {
  docker rm -f "$restore_container" >/dev/null 2>&1 || true
  docker volume rm "$restore_volume" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

run_test() {
  cd "$repository_root"
  docker compose up -d --wait --no-deps runner control-api >/dev/null
  printf 'T08_START=%s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  printf 'SOURCE_COMMIT=%s\n' "$(git rev-parse HEAD)"

  backup_output="$(${repository_root}/scripts/backup/backup-control-data.sh "${output_absolute}/backup")"
  printf '%s\n' "$backup_output"
  ${repository_root}/scripts/backup/restore-control-data.sh "${output_absolute}/backup" "$restore_volume"

  docker run -d \
    --name "$restore_container" \
    --network mini-paas-control \
    --env-file "${repository_root}/.env" \
    --env HOST=0.0.0.0 \
    --env PORT=3000 \
    --env DATABASE_PATH=/data/control.db \
    --env PUBLIC_ORIGIN=http://t08-restore.local \
    --env SESSION_COOKIE_SECURE=false \
    --env GATEWAY_BASE_URL=http://gateway:8080 \
    --env RUNNER_BASE_URL=http://runner:3001 \
    --read-only \
    --tmpfs /tmp:size=16m,noexec,nosuid \
    --cap-drop ALL \
    --security-opt no-new-privileges \
    --mount "type=volume,src=${restore_volume},dst=/data" \
    "$control_image" >/dev/null
  docker network connect mini-paas-edge "$restore_container"

  attempt=0
  until docker exec "$restore_container" node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"; do
    attempt=$((attempt + 1))
    if [ "$attempt" -ge 20 ]; then
      printf 'KHÔNG ĐẠT: Control API phục hồi không khỏe sau 20 lần kiểm tra.\n' >&2
      docker logs --tail 50 "$restore_container" >&2
      exit 1
    fi
    sleep 1
  done

  docker exec "$restore_container" node -e '
    (async () => {
      const origin = process.env.PUBLIC_ORIGIN;
      const login = await fetch("http://127.0.0.1:3000/api/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json", origin },
        body: JSON.stringify({ username: process.env.ADMIN_USERNAME || "admin", password: process.env.ADMIN_PASSWORD }),
      });
      if (login.status !== 200) throw new Error(`Đăng nhập thất bại: HTTP ${login.status}`);
      const setCookie = login.headers.get("set-cookie");
      if (!setCookie) throw new Error("Thiếu session cookie sau đăng nhập.");
      const cookie = setCookie.split(";")[0];
      const applications = await fetch("http://127.0.0.1:3000/api/v1/applications", { headers: { cookie } });
      if (applications.status !== 200) throw new Error(`Đọc applications thất bại: HTTP ${applications.status}`);
      const body = await applications.json();
      if (!Array.isArray(body.data) || body.data.length < 2) throw new Error("Dữ liệu phục hồi thiếu ứng dụng.");
      process.stdout.write(`${JSON.stringify({ loginStatus: login.status, applicationsStatus: applications.status, applicationCount: body.data.length, slugs: body.data.map((app) => app.slug).sort() })}\n`);
    })().catch((error) => { console.error(error.message); process.exit(1); });
  '

  docker exec "$restore_container" node -e '
    fetch("http://gateway:8080/apps/app-a/health")
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const body = await response.json();
        process.stdout.write(`${JSON.stringify({ gatewayHealthStatus: response.status, app: body })}\n`);
      })
      .catch((error) => { console.error(error.message); process.exit(1); });
  '

  docker compose ps --status running --services | grep -Fx control-api >/dev/null
  docker compose ps --status running --services | grep -Fx runner >/dev/null
  printf 'LIVE_STACK_UNCHANGED=true\n'
  printf 'TEMP_CONTAINER_PUBLISHED_PORTS=%s\n' "$(docker inspect "$restore_container" --format '{{json .HostConfig.PortBindings}}')"
  printf 'T08_RESULT=PASS\n'
  printf 'T08_FINISH=%s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
}

set +e
(set -e; run_test) >"$result_file" 2>&1
status="$?"
set -e
if [ "$status" -eq 0 ]; then
  cat "$result_file"
else
  cat "$result_file" >&2
  exit "$status"
fi
chmod 600 "$result_file"
printf 'T08_OUTPUT_DIRECTORY=%s\n' "$output_absolute"
