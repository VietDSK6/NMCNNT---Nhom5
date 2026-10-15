#!/usr/bin/env sh
set -eu

if [ "$#" -ne 2 ]; then
  printf 'Cách dùng: %s <thư-mục-backup> <volume-đích-tạm>\n' "$0" >&2
  exit 2
fi

script_directory="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)"
backup_directory="$1"
target_volume="$2"
control_image="${CONTROL_API_IMAGE:-mini-paas/control-api:p1-observability}"

case "$target_volume" in
  mini-paas-t08-restore-*) ;;
  *)
    printf 'KHÔNG ĐẠT: script chỉ restore vào volume tạm mini-paas-t08-restore-* để tránh ghi đè dữ liệu live.\n' >&2
    exit 2
    ;;
esac

backup_absolute="$(CDPATH= cd -- "$backup_directory" && pwd -P)"
test -f "${backup_absolute}/control.db"
test -f "${backup_absolute}/summary.json"
test -f "${backup_absolute}/checksums.sha256"

if command -v sha256sum >/dev/null 2>&1; then
  (cd "$backup_absolute" && sha256sum -c checksums.sha256)
else
  (cd "$backup_absolute" && shasum -a 256 -c checksums.sha256)
fi

if docker volume inspect "$target_volume" >/dev/null 2>&1; then
  printf 'KHÔNG ĐẠT: volume đích đã tồn tại: %s\n' "$target_volume" >&2
  exit 1
fi
docker volume create "$target_volume" >/dev/null

docker run --rm \
  --network none \
  --read-only \
  --cap-drop ALL \
  --cap-add CHOWN \
  --cap-add DAC_OVERRIDE \
  --security-opt no-new-privileges \
  --user 0:0 \
  --mount "type=bind,src=${backup_absolute},dst=/backup,readonly" \
  --mount "type=volume,src=${target_volume},dst=/target" \
  --mount "type=bind,src=${script_directory}/restore-control-db.mjs,dst=/tool/restore-control-db.mjs,readonly" \
  --env RESTORE_UID=1000 \
  --env RESTORE_GID=1000 \
  --entrypoint node \
  "$control_image" /tool/restore-control-db.mjs

printf 'RESTORED_VOLUME=%s\n' "$target_volume"
