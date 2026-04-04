#!/usr/bin/env bash

set -euo pipefail

PACKAGE_NAME="${PACKAGE_NAME:-@edvintoome/meta-mcp}"
INSTALL_COMMAND="${INSTALL_COMMAND:-install-codex-plugin}"

usage() {
  cat <<'EOF'
Usage: install-codex-plugin.sh [options]

Installs the Meta Ads Codex plugin bundle and bootstraps missing local Meta config.

Options:
  --force          Replace the installed Codex plugin bundle and missing local files
  -h, --help       Show this help

If you run this script from a local clone, it uses the repo checkout directly.
If you run it from curl, it falls back to the published npm package.
EOF
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    printf 'Error: missing required command: %s\n' "$1" >&2
    exit 1
  }
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ -n "${BASH_SOURCE[0]:-}" && -f "${BASH_SOURCE[0]}" ]]; then
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  repo_root="$(cd "${script_dir}/.." && pwd)"

  if [[ -f "${repo_root}/scripts/setup-codex-plugin.js" ]]; then
    need_cmd node
    exec node "${repo_root}/scripts/setup-codex-plugin.js" "$@"
  fi
fi

need_cmd npx
exec npx -y "${PACKAGE_NAME}" "${INSTALL_COMMAND}" "$@"
