#!/usr/bin/env bash

set -euo pipefail

REPO_SLUG="${REPO_SLUG:-EdvinToome/meta-mcp}"
REPO_REF="${REPO_REF:-main}"
REPO_URL="https://github.com/${REPO_SLUG}.git"

usage() {
  cat <<'EOF'
Usage: install-codex-plugin.sh [options]

Installs or updates the Meta Marketing Codex plugin bundle and performs a full plugin refresh.
During refresh, only these global config files are preserved:
  - ~/.meta-marketing-plugin/meta.env
  - ~/.meta-marketing-plugin/site-profiles.local.json
  - ~/.meta-marketing-plugin/brand_dna.yaml

Options:
  -h, --help       Show this help

If you run this script from a local clone, it uses the repo checkout directly.
If you run it from curl, it clones the GitHub repo and runs the same installer from that checkout.
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

  if [[ -f "${repo_root}/meta-mcp/scripts/setup-codex-plugin.js" ]]; then
    need_cmd node
    exec node "${repo_root}/meta-mcp/scripts/setup-codex-plugin.js" "$@"
  fi
fi

need_cmd git
need_cmd node
need_cmd npm

temp_dir="$(mktemp -d 2>/dev/null || mktemp -d -t meta-marketing-plugin)"
cleanup() {
  rm -rf "$temp_dir"
}
trap cleanup EXIT

git clone --depth 1 --branch "${REPO_REF}" "${REPO_URL}" "$temp_dir" >/dev/null
exec node "${temp_dir}/meta-mcp/scripts/setup-codex-plugin.js" "$@"
