#!/usr/bin/env bash
set -euo pipefail

# Installs Nora from the latest GitHub release (Apple Silicon .dmg).
# Default: ~/Applications (no admin password). For all users: NORA_INSTALL_SYSTEM=1 → /Applications (sudo).
# Usage: curl -fsSL https://raw.githubusercontent.com/Citosoft/nora/main/scripts/install-macos.sh | bash
#    or: bash scripts/install-macos.sh

RELEASE_REPO="${NORA_GITHUB_REPO:-Citosoft/nora}"
DMG_FILENAME="Nora-arm64.dmg"
DOWNLOAD_URL="https://github.com/${RELEASE_REPO}/releases/latest/download/${DMG_FILENAME}"

SYSTEM_NORA_APP="/Applications/Nora.app"

GREEN=""
YELLOW=""
BOLD=""
RESET=""
if [ -t 1 ]; then
  GREEN="$(printf '\033[32m')"
  YELLOW="$(printf '\033[33m')"
  BOLD="$(printf '\033[1m')"
  RESET="$(printf '\033[0m')"
fi

print_banner() {
  printf '%s\n' "${BOLD}"
  cat <<'EOF'
 ███╗   ██╗  ██████╗  ██████╗   █████╗
 ██╔██╗ ██║ ██╔═══██╗ ██╔══██╗ ██╔══██╗
 ██║╚██╗██║ ██║   ██║ ██████╔╝ ███████║
 ██║ ╚████║ ██║   ██║ ██╔══██╗ ██╔══██║
 ██║  ╚███║ ╚██████╔╝ ██║  ██║ ██║  ██║
 ╚═╝   ╚══╝  ╚═════╝  ╚═╝  ╚═╝ ╚═╝  ╚═╝
EOF
  printf '%s' "${RESET}"
  printf '\n%s%s%s\n\n' "${BOLD}" "Nora · macOS installer (Apple Silicon)" "${RESET}"
}

die() {
  printf '%sError:%s %s\n' "${BOLD}" "${RESET}" "$*" >&2
  exit 1
}

step_ok() {
  printf '%s✓%s %s\n' "${GREEN}" "${RESET}" "$*"
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    die "Required command not found: $1"
  fi
}

warn_if_system_nora_exists() {
  if [ "${USE_SYSTEM_INSTALL}" -eq 1 ]; then
    return 0
  fi
  if [ ! -e "${SYSTEM_NORA_APP}" ]; then
    return 0
  fi
  printf '\n%s! Warning:%s Nora is already installed for all users at:\n' "${YELLOW}${BOLD}" "${RESET}" >&2
  printf '  %s%s%s\n\n' "${BOLD}" "${SYSTEM_NORA_APP}" "${RESET}" >&2
  printf '%sRemove that copy first%s to avoid two installs (macOS may launch the one in /Applications instead of the new one in your folder).\n' "${BOLD}" "${RESET}" >&2
  printf '  • Finder: open /Applications, move Nora to Trash (admin password), empty Trash\n' >&2
  printf "  • Terminal: %ssudo rm -rf '%s'%s\n\n" "${BOLD}" "${SYSTEM_NORA_APP}" "${RESET}" >&2
}

if [ "$(uname -s)" != "Darwin" ]; then
  print_banner
  die "This installer only supports macOS. For Linux use scripts/install.sh; for Windows use scripts/install.ps1."
fi

if [ "$(uname -m)" != "arm64" ]; then
  print_banner
  die "This package targets Apple Silicon (arm64). This Mac reports $(uname -m). An Intel build is not available from this script."
fi

if [ -n "${NORA_INSTALL_SYSTEM:-}" ]; then
  INSTALL_DEST="/Applications/Nora.app"
  USE_SYSTEM_INSTALL=1
else
  INSTALL_DEST="${HOME}/Applications/Nora.app"
  USE_SYSTEM_INSTALL=0
fi

SUDO=""
if [ "${USE_SYSTEM_INSTALL}" -eq 1 ] && [ "$(id -u)" -ne 0 ]; then
  if ! command -v sudo >/dev/null 2>&1; then
    die "sudo is required to install into /Applications. Omit NORA_INSTALL_SYSTEM to install to ~/Applications without a password."
  fi
  SUDO="sudo"
fi

print_banner

require_command curl
require_command hdiutil
require_command ditto
require_command xattr
require_command open

warn_if_system_nora_exists

TEMP_DIRECTORY="$(mktemp -d "${TMPDIR:-/tmp}/nora-macos-install.XXXXXX")"
MOUNT_POINT="${TEMP_DIRECTORY}/volume"
DMG_PATH="${TEMP_DIRECTORY}/nora.dmg"
cleanup() {
  if [ -n "${MOUNT_POINT:-}" ] && [ -d "${MOUNT_POINT}" ]; then
    hdiutil detach "${MOUNT_POINT}" >/dev/null 2>&1 || true
  fi
  rm -rf "${TEMP_DIRECTORY}"
}
trap cleanup EXIT INT TERM

step_ok "Release DMG: ${DMG_FILENAME}"

printf '%s→%s Downloading (this may take a moment)…\n' "${BOLD}" "${RESET}"
# Do not pass an empty bash array into curl with set -u: "${arr[@]}" on an empty
# array is an error in bash 4.4+ (nounset).
_curl_release_dmg() {
  if [ -n "${GITHUB_TOKEN:-}" ]; then
    curl -fL --progress-bar --retry 3 --retry-delay 2 \
      -H "Authorization: Bearer ${GITHUB_TOKEN}" \
      -o "${DMG_PATH}" "${DOWNLOAD_URL}"
  else
    curl -fL --progress-bar --retry 3 --retry-delay 2 \
      -o "${DMG_PATH}" "${DOWNLOAD_URL}"
  fi
}
if ! _curl_release_dmg; then
  die "Download failed. Ensure ${DMG_FILENAME} is attached to the latest GitHub release (see .github/workflows/release-macos.yml), then retry."
fi
step_ok "Download complete"

printf '%s→%s Verifying disk image…\n' "${BOLD}" "${RESET}"
hdiutil verify -quiet "${DMG_PATH}" || die "The downloaded .dmg failed verification (corrupt or incomplete download)."
step_ok "Image verified"

printf '%s→%s Mounting disk image…\n' "${BOLD}" "${RESET}"
mkdir -p "${MOUNT_POINT}"
hdiutil attach -nobrowse -readonly -mountpoint "${MOUNT_POINT}" "${DMG_PATH}" >/dev/null || die "Could not mount the disk image."
step_ok "Image mounted"

printf '%s→%s Locating Nora.app…\n' "${BOLD}" "${RESET}"
APP_SRC="$(find "${MOUNT_POINT}" -maxdepth 3 -name "Nora.app" -type d | head -n 1)"
if [ -z "${APP_SRC}" ]; then
  die "Nora.app was not found inside the disk image (unexpected layout)."
fi
step_ok "Found ${APP_SRC}"

if [ "${USE_SYSTEM_INSTALL}" -eq 1 ]; then
  printf '%s→%s Installing to /Applications (admin)…\n' "${BOLD}" "${RESET}"
else
  printf '%s→%s Installing to your Applications folder…\n' "${BOLD}" "${RESET}"
  mkdir -p "${HOME}/Applications"
fi
if [ -e "${INSTALL_DEST}" ]; then
  ${SUDO} rm -rf "${INSTALL_DEST}"
fi
${SUDO} ditto "${APP_SRC}" "${INSTALL_DEST}" || die "Failed to copy Nora to ${INSTALL_DEST}."
step_ok "Copied to ${INSTALL_DEST}"

printf '%s→%s Ejecting disk image…\n' "${BOLD}" "${RESET}"
hdiutil detach "${MOUNT_POINT}" >/dev/null || true
MOUNT_POINT=""
step_ok "Disk image ejected"

printf '%s→%s Removing Gatekeeper quarantine flag…\n' "${BOLD}" "${RESET}"
${SUDO} xattr -dr com.apple.quarantine "${INSTALL_DEST}" 2>/dev/null || true
step_ok "Quarantine cleared (${INSTALL_DEST})"

printf '%s→%s Launching Nora…\n' "${BOLD}" "${RESET}"
open "${INSTALL_DEST}" || die "Nora is installed but failed to launch (try opening it from Applications)."
step_ok "Nora started"

printf '\n%sAll set.%s Nora should be opening now.\n' "${BOLD}" "${RESET}"
