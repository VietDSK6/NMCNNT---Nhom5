#!/usr/bin/env sh
set -eu

RULE_NAME="MiniPaasApplicationNotHealthy"
APP_ID="app-a"
RESTORED=0

query_prometheus() {
  api_path="$1"
  docker compose exec -T prometheus wget -q -O - "http://127.0.0.1:9090${api_path}"
}

restore_app_a() {
  if [ "$RESTORED" -eq 0 ]; then
    printf '\n[Khôi phục] Đảm bảo bật lại container %s...\n' "$APP_ID"
    docker compose start "$APP_ID" >/dev/null 2>&1 || true
    RESTORED=1
  fi
}
trap restore_app_a EXIT INT TERM

check_app_health_metric() {
  expected_value="$1"
  response="$(query_prometheus "/api/v1/query?query=mini_paas_app_healthy%7Bapp_id%3D%22${APP_ID}%22%7D")"
  printf '%s' "$response" | node -e '
    const fs = require("node:fs");
    const expected = Number(process.argv[1]);
    const body = JSON.parse(fs.readFileSync(0, "utf8"));
    const item = body.data?.result?.[0];
    if (!item || Number(item.value?.[1]) !== expected) process.exit(1);
  ' "$expected_value"
}

read_rule_state_for_app() {
  response="$(query_prometheus "/api/v1/rules")"
  printf '%s' "$response" | node -e '
    const fs = require("node:fs");
    const ruleName = process.argv[1];
    const appId = process.argv[2];
    const body = JSON.parse(fs.readFileSync(0, "utf8"));
    const rules = (body.data?.groups ?? []).flatMap((g) => g.rules ?? []);
    const rule = rules.find((r) => r.name === ruleName);
    if (!rule) process.exit(2);
    const matchingAlert = (rule.alerts ?? []).find((a) => a.labels?.app_id === appId);
    console.log(matchingAlert ? matchingAlert.state : "inactive");
  ' "$RULE_NAME" "$APP_ID"
}

printf '=== KỊCH BẢN KIỂM THỬ CẢNH BÁO PROMETHEUS KHI DỪNG %s ===\n' "$APP_ID"

check_app_health_metric 1 || {
  printf 'KHÔNG ĐẠT: %s ban đầu chưa ở trạng thái healthy=1\n' "$APP_ID" >&2
  exit 1
}
initial_state="$(read_rule_state_for_app)"
printf '1. Trạng thái ban đầu (%s): mini_paas_app_healthy=1, rule %s=%s\n' "$(date -u '+%H:%M:%SZ')" "$RULE_NAME" "$initial_state"
if [ "$initial_state" != "inactive" ]; then
  printf 'KHÔNG ĐẠT: Rule %s ban đầu phải là inactive, nhận được %s\n' "$RULE_NAME" "$initial_state" >&2
  exit 1
fi

printf '2. Tạo sự cố giả lập: dừng container %s...\n' "$APP_ID"
docker compose stop "$APP_ID" >/dev/null

attempt=0
while [ "$attempt" -lt 10 ]; do
  if check_app_health_metric 0 2>/dev/null; then
    break
  fi
  attempt=$((attempt + 1))
  sleep 2
done
[ "$attempt" -lt 10 ] || {
  printf 'KHÔNG ĐẠT: Prometheus không ghi nhận mini_paas_app_healthy=0 sau 20s\n' >&2
  exit 1
}
pending_state="$(read_rule_state_for_app)"
printf '3. Sau khi dừng (%s): Prometheus ghi nhận mini_paas_app_healthy=0, rule %s=%s\n' "$(date -u '+%H:%M:%SZ')" "$RULE_NAME" "$pending_state"

printf '4. Chờ rule vượt ngưỡng for: 30s để chuyển sang firing...\n'
attempt=0
final_state="$pending_state"
while [ "$attempt" -lt 25 ]; do
  final_state="$(read_rule_state_for_app)"
  if [ "$final_state" = "firing" ]; then
    break
  fi
  attempt=$((attempt + 1))
  sleep 2
done
[ "$final_state" = "firing" ] || {
  printf 'KHÔNG ĐẠT: Rule %s không chuyển sang firing (trạng thái cuối: %s)\n' "$RULE_NAME" "$final_state" >&2
  exit 1
}
printf 'ĐẠT: (%s) Rule %s đã chuyển sang trạng thái FIRING cho %s!\n' "$(date -u '+%H:%M:%SZ')" "$RULE_NAME" "$APP_ID"

printf '5. Khôi phục container %s và chờ đạt healthy...\n' "$APP_ID"
docker compose start "$APP_ID" >/dev/null
RESTORED=1

attempt=0
while [ "$attempt" -lt 20 ]; do
  if check_app_health_metric 1 2>/dev/null; then
    break
  fi
  attempt=$((attempt + 1))
  sleep 2
done
[ "$attempt" -lt 20 ] || {
  printf 'KHÔNG ĐẠT: %s không quay về healthy=1 sau 40s\n' "$APP_ID" >&2
  exit 1
}

attempt=0
recovered_state=""
while [ "$attempt" -lt 15 ]; do
  recovered_state="$(read_rule_state_for_app)"
  if [ "$recovered_state" = "inactive" ]; then
    break
  fi
  attempt=$((attempt + 1))
  sleep 2
done
[ "$recovered_state" = "inactive" ] || {
  printf 'KHÔNG ĐẠT: Rule %s chưa tự tắt về inactive (trạng thái: %s)\n' "$RULE_NAME" "$recovered_state" >&2
  exit 1
}
printf 'ĐẠT: (%s) %s đã phục hồi healthy=1 và rule %s quay về inactive!\n' "$(date -u '+%H:%M:%SZ')" "$APP_ID" "$RULE_NAME"
