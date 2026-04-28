#!/bin/sh
set -eu

APT_REPO_URL="https://apt.citosoft.co.uk"
APT_KEY_DOWNLOAD_URL="${APT_REPO_URL}/keys/citosoft-archive-keyring.gpg"
APT_KEYRING_PATH="/usr/share/keyrings/citosoft-archive-keyring.gpg"
APT_SOURCE_LIST_PATH="/etc/apt/sources.list.d/citosoft.list"
APT_SOURCE_ENTRY="deb [signed-by=${APT_KEYRING_PATH}] ${APT_REPO_URL} stable main"
PACKAGE_NAME="nora"

if [ "$(uname -s)" != "Linux" ]; then
  echo "This installer only supports Linux." >&2
  exit 1
fi

if ! command -v apt-get >/dev/null 2>&1; then
  echo "apt-get is required to install ${PACKAGE_NAME}." >&2
  exit 1
fi

if [ "$(id -u)" -eq 0 ]; then
  SUDO=""
else
  if ! command -v sudo >/dev/null 2>&1; then
    echo "sudo is required when running this installer as a non-root user." >&2
    exit 1
  fi

  SUDO="sudo"
fi

TEMP_DIRECTORY="$(mktemp -d)"
cleanup() {
  rm -rf "${TEMP_DIRECTORY}"
}
trap cleanup EXIT INT TERM

KEY_PATH="${TEMP_DIRECTORY}/citosoft-archive-keyring.gpg"
SOURCE_PATH="${TEMP_DIRECTORY}/citosoft.list"

echo "Downloading Citosoft signing key..."
curl -fsSL "${APT_KEY_DOWNLOAD_URL}" -o "${KEY_PATH}"

printf '%s\n' "${APT_SOURCE_ENTRY}" > "${SOURCE_PATH}"

echo "Configuring the Citosoft APT repository..."
${SUDO} install -D -m 0644 "${KEY_PATH}" "${APT_KEYRING_PATH}"
${SUDO} install -D -m 0644 "${SOURCE_PATH}" "${APT_SOURCE_LIST_PATH}"

echo "Refreshing package indexes..."
${SUDO} apt-get update

echo "Downloading ${PACKAGE_NAME}..."
(
  cd "${TEMP_DIRECTORY}"
  apt-get download "${PACKAGE_NAME}"
)

DEB_PATH="$(find "${TEMP_DIRECTORY}" -maxdepth 1 -type f -name "${PACKAGE_NAME}_*.deb" | head -n 1)"

if [ -z "${DEB_PATH}" ]; then
  echo "Failed to download a ${PACKAGE_NAME} .deb package from ${APT_REPO_URL}." >&2
  exit 1
fi

echo "Installing ${PACKAGE_NAME}..."
${SUDO} apt-get install -y "${DEB_PATH}"

echo "${PACKAGE_NAME} is installed. Future updates will come from ${APT_REPO_URL}."
