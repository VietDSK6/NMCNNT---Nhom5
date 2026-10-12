#!/usr/bin/env sh
set -eu

commit_sha="${1:-}"
output_dir="${2:-output/ci}"
invalid_output="$(mktemp -t mini-paas-ci-invalid.XXXXXX)"

cleanup() {
  rm -f "$invalid_output"
}
trap cleanup EXIT INT TERM

if [ -z "$commit_sha" ]; then
  printf 'KHÔNG ĐẠT: thiếu commit SHA để kiểm thử P1.1A\n' >&2
  exit 2
fi

if ./scripts/ci/build-commit-images.sh 'not-a-commit' "$output_dir/invalid" >"$invalid_output" 2>&1; then
  printf 'KHÔNG ĐẠT: script chấp nhận commit SHA không hợp lệ\n' >&2
  exit 1
fi
printf 'ĐẠT: từ chối commit SHA không hợp lệ trước khi dựng ảnh\n'

./scripts/ci/build-commit-images.sh "$commit_sha" "$output_dir"
node ./scripts/ci/verify-image-manifest.mjs "$output_dir/image-manifest.json" "$commit_sha"

printf '\nP1.1A CI image test: 8/8 kiểm tra đạt.\n'
