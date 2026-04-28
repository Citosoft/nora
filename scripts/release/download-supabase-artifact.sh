#!/usr/bin/env bash

set -euo pipefail

required_vars=(
  SUPABASE_SERVICE_ROLE_KEY
  SUPABASE_BUCKET
  SUPABASE_STORAGE_PATH
  DEST_DIR
)

for required_var in "${required_vars[@]}"; do
  if [ -z "${!required_var:-}" ]; then
    echo "Missing required environment variable: ${required_var}" >&2
    exit 1
  fi
done

storage_base_url="${SUPABASE_STORAGE_URL:-${SUPABASE_URL:-}}"

if [ -z "${storage_base_url}" ]; then
  echo "Missing required environment variable: SUPABASE_STORAGE_URL" >&2
  exit 1
fi

archive_path="$(mktemp "${TMPDIR:-/tmp}/supabase-release-download.XXXXXX.tgz")"
headers_path="$(mktemp "${TMPDIR:-/tmp}/supabase-release-download-headers.XXXXXX.txt")"
trap 'rm -f "${archive_path}" "${headers_path}"' EXIT

download_url="${storage_base_url%/}/storage/v1/object/authenticated/${SUPABASE_BUCKET}/${SUPABASE_STORAGE_PATH}"

curl \
  --fail \
  --silent \
  --show-error \
  --location \
  --dump-header "${headers_path}" \
  --header "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  --header "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  --output "${archive_path}" \
  "${download_url}"

archive_size_bytes="$(wc -c < "${archive_path}")"
if [ "${archive_size_bytes}" -eq 0 ]; then
  echo "Downloaded artifact is empty: ${SUPABASE_BUCKET}/${SUPABASE_STORAGE_PATH}" >&2
  exit 1
fi

content_type="$(awk -F': *' 'BEGIN { IGNORECASE=1 } /^content-type:/ { gsub("\r", "", $2); value=$2 } END { print value }' "${headers_path}")"
if [ -n "${content_type}" ] && [[ ! "${content_type}" =~ ^(application/gzip|application/x-gzip|application/octet-stream)(;.*)?$ ]]; then
  echo "Unexpected content type for ${SUPABASE_BUCKET}/${SUPABASE_STORAGE_PATH}: ${content_type}" >&2
  echo "Response headers:" >&2
  cat "${headers_path}" >&2
  echo "Body preview (first 512 bytes):" >&2
  head -c 512 "${archive_path}" | LC_ALL=C tr -cd '\11\12\15\40-\176' >&2
  echo >&2
  exit 1
fi

if ! gzip -t "${archive_path}" >/dev/null 2>&1; then
  echo "Downloaded artifact is not a valid gzip stream: ${SUPABASE_BUCKET}/${SUPABASE_STORAGE_PATH}" >&2
  echo "Response headers:" >&2
  cat "${headers_path}" >&2
  echo "Body preview (first 512 bytes):" >&2
  head -c 512 "${archive_path}" | LC_ALL=C tr -cd '\11\12\15\40-\176' >&2
  echo >&2
  exit 1
fi

mkdir -p "${DEST_DIR}"
tar -xzf "${archive_path}" -C "${DEST_DIR}"

if [ -z "$(find "${DEST_DIR}" -type f -print -quit)" ]; then
  echo "No release files were extracted into ${DEST_DIR}" >&2
  exit 1
fi

echo "Downloaded ${SUPABASE_BUCKET}/${SUPABASE_STORAGE_PATH} into ${DEST_DIR}"
