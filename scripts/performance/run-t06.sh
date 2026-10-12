#!/usr/bin/env sh
set -eu

profile="${1:-pilot}"
k6_image="${K6_IMAGE:-grafana/k6:2.3.0@sha256:9c2dee7f8ed74d317e4027c06a10f169b625638189de8d4555d0b3486a5aeb34}"
network_name="${K6_NETWORK:-mini-paas-edge}"
base_url="${K6_BASE_URL:-http://gateway:8080}"
pause_seconds="${K6_PAUSE_SECONDS:-5}"
timestamp="$(date '+%Y-%m-%dT%H%M%S')"
output_directory="${T06_OUTPUT_DIR:-output/performance/${timestamp}-${profile}}"

case "$profile" in
  pilot|standard) ;;
  *)
    printf 'Profile không hợp lệ: %s. Chỉ chấp nhận pilot hoặc standard.\n' "$profile" >&2
    exit 2
    ;;
esac

mkdir -p "$output_directory"
output_parent="$(cd "$(dirname "$output_directory")" && pwd)"
output_absolute="${output_parent}/$(basename "$output_directory")"
script_directory="$(cd "$(dirname "$0")/../.." && pwd)"
levels_file="${output_absolute}/levels.tsv"
overall_status=0

if ! docker image inspect "$k6_image" >/dev/null 2>&1; then
  docker pull "$k6_image"
fi
docker network inspect "$network_name" >/dev/null
docker compose ps --status running >/dev/null

{
  printf 'profile=%s\n' "$profile"
  printf 'started_at=%s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  printf 'base_url=%s\n' "$base_url"
  printf 'network=%s\n' "$network_name"
  printf 'k6_image=%s\n' "$k6_image"
  printf 'host_arch=%s\n' "$(uname -m)"
  printf 'node=%s\n' "$(node --version)"
  printf 'docker=%s\n' "$(docker version --format '{{.Server.Version}}')"
  printf 'compose=%s\n' "$(docker compose version --short)"
  printf 'base_commit=%s\n' "$(git rev-parse HEAD)"
  printf 'source_state=Kết quả được tạo từ working tree và phải commit cùng script, cấu hình, tài liệu tương ứng.\n'
} > "${output_absolute}/environment.txt"

printf 'level\ttarget_rps\tduration\tstarted_at\tended_at\tstatus\n' > "$levels_file"

collect_prometheus() {
  level="$1"
  name="$2"
  encoded_query="$3"
  range_start="$4"
  range_end="$5"
  destination="${output_absolute}/${level}-prometheus-${name}.json"
  temporary="${destination}.tmp"
  url="http://127.0.0.1:9090/api/v1/query_range?query=${encoded_query}&start=${range_start}&end=${range_end}&step=5"

  if docker compose exec -T prometheus wget -q -O - "$url" > "$temporary"; then
    mv "$temporary" "$destination"
  else
    rm -f "$temporary"
    printf 'Không lấy được metric Prometheus %s cho mức %s.\n' "$name" "$level" >&2
    overall_status=1
  fi
}

run_warmup() {
  warmup_duration="$1"
  log_file="${output_absolute}/warmup-k6.txt"
  printf '\nWarm-up: 5 req/s trong %s (không tính vào bảng kết quả)...\n' "$warmup_duration"

  if docker run --rm \
    --network "$network_name" \
    --env BASE_URL="$base_url" \
    --env LEVEL="warmup" \
    --env RATE="5" \
    --env DURATION="$warmup_duration" \
    --env PRE_ALLOCATED_VUS="10" \
    --env MAX_VUS="20" \
    --env SUMMARY_PATH="/results/warmup-summary.json" \
    --env K6_NO_COLOR=true \
    --volume "${script_directory}/tests/performance/k6:/scripts:ro" \
    --volume "${output_absolute}:/results" \
    "$k6_image" run /scripts/mini-paas-load.js > "$log_file" 2>&1; then
    sed -n '1,160p' "$log_file"
  else
    sed -n '1,160p' "$log_file"
    printf 'Warm-up không đạt ngưỡng; dừng trước khi đo chính thức.\n' >&2
    exit 1
  fi
}

run_level() {
  level="$1"
  target_rps="$2"
  duration="$3"
  pre_vus="$4"
  max_vus="$5"
  started_epoch="$(date -u '+%s')"
  started_iso="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  log_file="${output_absolute}/${level}-k6.txt"

  printf '\nChạy mức %s: %s req/s trong %s...\n' "$level" "$target_rps" "$duration"
  if docker run --rm \
    --network "$network_name" \
    --env BASE_URL="$base_url" \
    --env LEVEL="$level" \
    --env RATE="$target_rps" \
    --env DURATION="$duration" \
    --env PRE_ALLOCATED_VUS="$pre_vus" \
    --env MAX_VUS="$max_vus" \
    --env SUMMARY_PATH="/results/${level}-summary.json" \
    --env K6_NO_COLOR=true \
    --volume "${script_directory}/tests/performance/k6:/scripts:ro" \
    --volume "${output_absolute}:/results" \
    "$k6_image" run --out "json=/results/${level}-raw.json" /scripts/mini-paas-load.js > "$log_file" 2>&1; then
    level_status="passed"
  else
    level_status="failed"
    overall_status=1
  fi

  ended_epoch="$(date -u '+%s')"
  ended_iso="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$level" "$target_rps" "$duration" "$started_iso" "$ended_iso" "$level_status" >> "$levels_file"
  sed -n '1,220p' "$log_file"

  sleep 6
  metric_start=$((started_epoch - 5))
  metric_end=$((ended_epoch + 5))
  collect_prometheus "$level" "cpu" 'mini_paas_app_cpu_percent%7Bapp_id%3D~%22app-a%7Capp-b%22%7D' "$metric_start" "$metric_end"
  collect_prometheus "$level" "memory-ratio" 'mini_paas_app_memory_usage_ratio%7Bapp_id%3D~%22app-a%7Capp-b%22%7D' "$metric_start" "$metric_end"
  collect_prometheus "$level" "memory-bytes" 'mini_paas_app_memory_working_set_bytes%7Bapp_id%3D~%22app-a%7Capp-b%22%7D' "$metric_start" "$metric_end"
  collect_prometheus "$level" "health" 'mini_paas_app_healthy%7Bapp_id%3D~%22app-a%7Capp-b%22%7D' "$metric_start" "$metric_end"
}

if [ "$profile" = "pilot" ]; then
  run_warmup 5s
  sleep "$pause_seconds"
  run_level low 5 20s 10 20
  sleep "$pause_seconds"
  run_level medium 15 20s 20 40
  sleep "$pause_seconds"
  run_level high 30 20s 40 80
else
  run_warmup 10s
  sleep "$pause_seconds"
  run_level low 10 60s 20 40
  sleep "$pause_seconds"
  run_level medium 25 60s 40 80
  sleep "$pause_seconds"
  run_level high 50 60s 80 160
fi

node "${script_directory}/scripts/performance/summarize-k6.mjs" "$output_absolute" || overall_status=1

for raw_file in "${output_absolute}"/*-raw.json; do
  if [ -f "$raw_file" ]; then
    gzip -f "$raw_file"
  fi
done

for k6_log in "${output_absolute}"/*-k6.txt; do
  if [ -f "$k6_log" ]; then
    gzip -f "$k6_log"
  fi
done

printf '\nKết quả T06: %s\n' "$output_absolute"
if [ "$overall_status" -ne 0 ]; then
  printf 'Một hoặc nhiều mức tải không đạt ngưỡng hoặc thiếu dữ liệu.\n' >&2
  exit 1
fi

printf 'Ba mức tải đều đạt ngưỡng của profile %s.\n' "$profile"
