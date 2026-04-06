#!/usr/bin/env bash

set -euo pipefail

REPO_SLUG="${REPO_SLUG:-EdvinToome/meta-mcp}"
REPO_REF="${REPO_REF:-main}"
REPO_URL="https://github.com/${REPO_SLUG}.git"
MARKETPLACE_SOURCE="${MARKETPLACE_SOURCE:-https://github.com/${REPO_SLUG}}"
PLUGIN_ID="meta-marketing-plugin@meta-marketing-plugin-marketplace"

PROJECT_DIR="$(pwd)"
PLUGIN_SCOPE="user"
META_ACCESS_TOKEN="${META_ACCESS_TOKEN:-}"
FORCE=0
DRY_RUN=0

usage() {
  cat <<'EOF'
Usage: install-claude-desktop.sh [options]

Install/update Meta Marketing Plugin for Claude Code Desktop and bootstrap project files.

Options:
  --project <path>       Target project directory (default: current directory)
  --scope <scope>        Plugin scope: user, project, local (default: user)
  --meta-token <token>   Meta access token for global Claude MCP config
  --force                Replace existing project symlinks and generated command files
  --dry-run              Print planned actions only
  -h, --help             Show help
EOF
}

log() {
  printf '%s\n' "$1"
}

die() {
  printf 'Error: %s\n' "$1" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

prompt_secret() {
  local prompt="$1"
  local value
  read -r -s -p "$prompt" value </dev/tty
  printf '\n' >/dev/tty
  printf '%s' "$value"
}

run_cmd() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '[dry-run] %s\n' "$*"
    return
  fi
  "$@"
}

install_or_update_marketplace() {
  local listed
  listed="$(claude plugin marketplace list 2>/dev/null || true)"
  if printf '%s' "$listed" | grep -q "meta-marketing-plugin-marketplace"; then
    run_cmd claude plugin marketplace update meta-marketing-plugin-marketplace
  else
    run_cmd claude plugin marketplace add "$MARKETPLACE_SOURCE"
  fi
}

install_or_update_plugin() {
  if run_cmd claude plugin install "$PLUGIN_ID" --scope "$PLUGIN_SCOPE"; then
    return
  fi
  run_cmd claude plugin update "$PLUGIN_ID" --scope "$PLUGIN_SCOPE"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project)
      PROJECT_DIR="$2"
      shift 2
      ;;
    --scope)
      PLUGIN_SCOPE="$2"
      shift 2
      ;;
    --meta-token)
      META_ACCESS_TOKEN="$2"
      shift 2
      ;;
    --force)
      FORCE=1
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "Unknown argument: $1"
      ;;
  esac
done

need_cmd claude
need_cmd git
need_cmd node

PROJECT_DIR="$(cd "$PROJECT_DIR" && pwd)"
[[ -d "$PROJECT_DIR" ]] || die "Project directory does not exist: $PROJECT_DIR"

if [[ "$PLUGIN_SCOPE" != "user" && "$PLUGIN_SCOPE" != "project" && "$PLUGIN_SCOPE" != "local" ]]; then
  die "Unsupported scope: $PLUGIN_SCOPE"
fi

if [[ "$DRY_RUN" -ne 1 && -z "$META_ACCESS_TOKEN" ]]; then
  META_ACCESS_TOKEN="$(prompt_secret 'META_ACCESS_TOKEN: ')"
fi

[[ -n "$META_ACCESS_TOKEN" || "$DRY_RUN" -eq 1 ]] || die "META_ACCESS_TOKEN is required"

log "Installing/updating Claude marketplace"
install_or_update_marketplace

log "Installing/updating plugin ${PLUGIN_ID}"
install_or_update_plugin

repo_root=""
temp_dir=""
cleanup() {
  if [[ -n "$temp_dir" && -d "$temp_dir" ]]; then
    rm -rf "$temp_dir"
  fi
}
trap cleanup EXIT

if [[ -n "${BASH_SOURCE[0]:-}" && -f "${BASH_SOURCE[0]}" ]]; then
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  candidate_root="$(cd "${script_dir}/.." && pwd)"
  if [[ -f "${candidate_root}/meta-mcp/scripts/setup-claude.js" ]]; then
    repo_root="$candidate_root"
  fi
fi

if [[ -z "$repo_root" ]]; then
  temp_dir="$(mktemp -d 2>/dev/null || mktemp -d -t meta-marketing-plugin)"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '[dry-run] git clone --depth 1 --branch %s %s %s\n' "$REPO_REF" "$REPO_URL" "$temp_dir"
  else
    git clone --depth 1 --branch "$REPO_REF" "$REPO_URL" "$temp_dir" >/dev/null
  fi
  repo_root="$temp_dir"
fi

setup_args=(--project "$PROJECT_DIR")
if [[ "$DRY_RUN" -eq 0 ]]; then
  setup_args+=(--meta-token "$META_ACCESS_TOKEN")
fi
if [[ "$FORCE" -eq 1 ]]; then
  setup_args+=(--force)
fi

if [[ "$DRY_RUN" -eq 1 ]]; then
  printf '[dry-run] node %s/meta-mcp/scripts/setup-claude.js %s\n' "$repo_root" "${setup_args[*]}"
else
  node "$repo_root/meta-mcp/scripts/setup-claude.js" "${setup_args[@]}"
fi

log ""
log "Setup complete."
log "Project: ${PROJECT_DIR}"
log "Plugin scope: ${PLUGIN_SCOPE}"
log "Global MCP server: meta-marketing-plugin"
log "MCP runtime: local build via .claude/meta-marketing-plugin/scripts/launch-meta-server.js"
log "Skills: .claude/skills/*"
log "Then restart Claude Code Desktop if it was already open."
