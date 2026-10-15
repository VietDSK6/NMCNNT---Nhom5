#!/usr/bin/env sh
set -eu

script_directory="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)"
repository_root="$(CDPATH= cd -- "${script_directory}/../.." && pwd -P)"
timestamp="$(date -u '+%Y%m%dT%H%M%SZ')"
output_directory="${1:-${repository_root}/output/backups/control-${timestamp}}"
source_volume="${CONTROL_DATA_VOLUME:-mini-paas-control-data}"
control_image="${CONTROL_API_IMAGE:-mini-paas/control-api:p1-observability}"

umask 077
mkdir -p "$output_directory"
output_absolute="$(CDPATH= cd -- "$output_directory" && pwd -P)"

if [ -e "${output_absolute}/control.db" ] || [ -e "${output_absolute}/summary.json" ]; then
  printf 'KHÔNG ĐẠT: thư mục backup đã có dữ liệu: %s\n' "$output_absolute" >&2
  exit 1
fi
docker volume inspect "$source_volume" >/dev/null
docker image inspect "$control_image" >/dev/null

source_commit="$(git -C "$repository_root" rev-parse HEAD 2>/dev/null || printf 'unknown')"
docker run --rm \
  --network none \
  --read-only \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  --user "$(id -u):$(id -g)" \
  --mount "type=volume,src=${source_volume},dst=/source,readonly" \
  --mount "type=bind,src=${output_absolute},dst=/backup" \
  --mount "type=bind,src=${script_directory}/backup-control-db.mjs,dst=/tool/backup-control-db.mjs,readonly" \
  --env "SOURCE_VOLUME=${source_volume}" \
  --env "SOURCE_COMMIT=${source_commit}" \
  --entrypoint node \
  "$control_image" /tool/backup-control-db.mjs

chmod 700 "$output_absolute"
chmod 600 "${output_absolute}/control.db" "${output_absolute}/summary.json"
if command -v sha256sum >/dev/null 2>&1; then
  (cd "$output_absolute" && sha256sum control.db summary.json > checksums.sha256)
else
  (cd "$output_absolute" && shasum -a 256 control.db summary.json > checksums.sha256)
fi
chmod 600 "${output_absolute}/checksums.sha256"
printf 'BACKUP_DIRECTORY=%s\n' "$output_absolute"
