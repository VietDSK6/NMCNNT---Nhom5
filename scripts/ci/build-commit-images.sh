#!/usr/bin/env sh
set -eu

commit_sha="${1:-}"
output_dir="${2:-output/ci}"

case "$commit_sha" in
  ''|*[!0-9a-fA-F]*)
    printf 'Commit SHA phải là chuỗi hexadecimal từ 7 đến 64 ký tự.\n' >&2
    exit 2
    ;;
esac

sha_length="${#commit_sha}"
if [ "$sha_length" -lt 7 ] || [ "$sha_length" -gt 64 ]; then
  printf 'Commit SHA phải là chuỗi hexadecimal từ 7 đến 64 ký tự.\n' >&2
  exit 2
fi

commit_sha="$(printf '%s' "$commit_sha" | tr 'A-F' 'a-f')"
short_sha="$(printf '%.12s' "$commit_sha")"
image_version="sha-${short_sha}"
app_a_ref="mini-paas/app-a:${image_version}"
app_b_ref="mini-paas/app-b:${image_version}"

mkdir -p "$output_dir"

printf 'Dựng %s từ commit %s\n' "$app_a_ref" "$commit_sha"
docker build \
  --build-arg "APP_VERSION=${image_version}" \
  --label "org.opencontainers.image.revision=${commit_sha}" \
  --tag "$app_a_ref" \
  ./apps/app-a

printf 'Dựng %s từ commit %s\n' "$app_b_ref" "$commit_sha"
docker build \
  --build-arg "APP_VERSION=${image_version}" \
  --label "org.opencontainers.image.revision=${commit_sha}" \
  --tag "$app_b_ref" \
  ./apps/app-b

app_a_id="$(docker image inspect --format '{{.Id}}' "$app_a_ref")"
app_b_id="$(docker image inspect --format '{{.Id}}' "$app_b_ref")"
app_a_platform="$(docker image inspect --format '{{.Os}}/{{.Architecture}}' "$app_a_ref")"
app_b_platform="$(docker image inspect --format '{{.Os}}/{{.Architecture}}' "$app_b_ref")"
manifest_path="${output_dir}/image-manifest.json"

printf '%s\n' \
  '{' \
  '  "schemaVersion": 1,' \
  "  \"commit\": \"${commit_sha}\"," \
  "  \"tag\": \"${image_version}\"," \
  '  "publishStatus": "local-only",' \
  '  "images": [' \
  '    {' \
  '      "application": "app-a",' \
  "      \"reference\": \"${app_a_ref}\"," \
  "      \"imageId\": \"${app_a_id}\"," \
  "      \"platform\": \"${app_a_platform}\"" \
  '    },' \
  '    {' \
  '      "application": "app-b",' \
  "      \"reference\": \"${app_b_ref}\"," \
  "      \"imageId\": \"${app_b_id}\"," \
  "      \"platform\": \"${app_b_platform}\"" \
  '    }' \
  '  ]' \
  '}' > "$manifest_path"

printf 'Đã tạo manifest: %s\n' "$manifest_path"
