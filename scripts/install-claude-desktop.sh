#!/usr/bin/env bash

set -euo pipefail

REPO_SLUG="${REPO_SLUG:-EdvinToome/meta-mcp}"
REPO_REF="${REPO_REF:-main}"
MARKETPLACE_SOURCE="${MARKETPLACE_SOURCE:-https://github.com/${REPO_SLUG}}"
RAW_BASE_URL="${RAW_BASE_URL:-https://raw.githubusercontent.com/${REPO_SLUG}/refs/heads/${REPO_REF}}"
PLUGIN_ID="meta-mcp@meta-mcp-marketplace"
PLUGIN_SCOPE="user"
PROJECT_DIR="$(pwd)"
META_ACCESS_TOKEN="${META_ACCESS_TOKEN:-}"
SITE_PROFILES_FILE=""
BUSINESS_RULES_FILE=""
FORCE=0
DRY_RUN=0

usage() {
  cat <<'EOF'
Usage: install-claude-desktop.sh [options]

Installs the Meta Ads Claude plugin, configures the global Claude MCP server,
and bootstraps project-local site profiles and business rules.

Options:
  --project <path>                Target project directory (default: current directory)
  --scope <scope>                 Claude plugin scope: user, project, local (default: user)
  --meta-token <token>            Meta access token for the global Claude MCP config
  --site-profiles-file <path>     Copy a prepared site-profiles.local.json into the project
  --business-rules-file <path>    Copy a prepared BUSINESS_RULES.local.md into the project
  --force                         Overwrite existing project-local Meta MCP files
  --dry-run                       Print actions without mutating Claude/plugin state or files
  -h, --help                      Show this help

If token or file paths are omitted, the installer prompts for them.
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

can_prompt() {
  [[ -r /dev/tty ]]
}

run_cmd() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '[dry-run] %s\n' "$*"
    return
  fi

  "$@"
}

prompt_secret() {
  local prompt="$1"
  local value
  can_prompt || die "Cannot prompt for input here. Pass the value with a flag instead."
  read -r -s -p "$prompt" value </dev/tty
  printf '\n' >/dev/tty
  printf '%s' "$value"
}

prompt_optional_path() {
  local prompt="$1"
  local value
  can_prompt || return 0
  read -r -p "$prompt" value </dev/tty
  printf '%s' "$value"
}

download_or_copy() {
  local remote_path="$1"
  local target_path="$2"

  if [[ -n "${LOCAL_SOURCE_DIR:-}" ]]; then
    cp "${LOCAL_SOURCE_DIR}/${remote_path}" "$target_path"
    return
  fi

  curl -fsSL "${RAW_BASE_URL}/${remote_path}" -o "$target_path"
}

copy_if_needed() {
  local source_path="$1"
  local target_path="$2"

  if [[ -e "$target_path" && "$FORCE" -ne 1 ]]; then
    log "Keeping existing ${target_path}"
    return
  fi

  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '[dry-run] write %s from %s\n' "$target_path" "$source_path"
    return
  fi

  mkdir -p "$(dirname "$target_path")"
  cp "$source_path" "$target_path"
}

ensure_gitignore_entries() {
  local gitignore_path="$1"
  local entries=(
    "meta-mcp/site-profiles.local.json"
    "meta-mcp/BUSINESS_RULES.local.md"
  )

  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '[dry-run] ensure %s contains Meta MCP local file ignores\n' "$gitignore_path"
    return
  fi

  mkdir -p "$(dirname "$gitignore_path")"
  touch "$gitignore_path"

  local entry
  for entry in "${entries[@]}"; do
    if ! grep -qxF "$entry" "$gitignore_path"; then
      printf '%s\n' "$entry" >>"$gitignore_path"
    fi
  done
}

write_project_readme() {
  local target_path="$1"

  if [[ -e "$target_path" && "$FORCE" -ne 1 ]]; then
    log "Keeping existing ${target_path}"
    return
  fi

  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '[dry-run] write %s\n' "$target_path"
    return
  fi

  mkdir -p "$(dirname "$target_path")"
  cat >"$target_path" <<'EOF'
# Meta MCP local config

Do not invent values in these files:
- `.claude/meta-mcp/site-profiles.local.json`
- `.claude/meta-mcp/BUSINESS_RULES.local.md`

Read `.claude/meta-mcp/MCP_USAGE.md` before running Meta analysis commands so tool routing stays consistent.

The Meta access token is configured globally in Claude Code Desktop.
This project directory only stores site profiles and business-specific rules.
EOF
}

write_global_claude_mcp_config() {
  local token="$1"

  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '[dry-run] write global Claude MCP config for server meta with META_ACCESS_TOKEN\n'
    return
  fi

  node - <<'EOF' "$token"
const fs = require("fs");
const os = require("os");
const path = require("path");

const token = process.argv[2];

const configPath = (() => {
  switch (process.platform) {
    case "darwin":
      return path.join(
        os.homedir(),
        "Library",
        "Application Support",
        "Claude",
        "claude_desktop_config.json"
      );
    case "win32":
      return path.join(
        os.homedir(),
        "AppData",
        "Roaming",
        "Claude",
        "claude_desktop_config.json"
      );
    case "linux":
      return path.join(
        os.homedir(),
        ".config",
        "Claude",
        "claude_desktop_config.json"
      );
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
})();

let payload = {};

if (fs.existsSync(configPath)) {
  payload = JSON.parse(fs.readFileSync(configPath, "utf8"));
}

payload.mcpServers ||= {};
const existingServer = payload.mcpServers.meta || {};
const existingEnv = existingServer.env || {};
payload.mcpServers.meta = {
  command: "npx",
  args: ["-y", "@edvintoome/meta-mcp"],
  env: {
    ...existingEnv,
    META_ACCESS_TOKEN: token,
  },
};

fs.mkdirSync(path.dirname(configPath), { recursive: true });
fs.writeFileSync(configPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Configured Claude MCP: ${configPath}`);
EOF
}

install_or_update_marketplace() {
  local listed

  listed="$(claude plugin marketplace list 2>/dev/null || true)"

  if printf '%s' "$listed" | grep -q "meta-mcp-marketplace"; then
    run_cmd claude plugin marketplace update meta-mcp-marketplace
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
    --site-profiles-file)
      SITE_PROFILES_FILE="$2"
      shift 2
      ;;
    --business-rules-file)
      BUSINESS_RULES_FILE="$2"
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
need_cmd curl
need_cmd node

if [[ "$DRY_RUN" -ne 1 ]]; then
  if [[ -z "$META_ACCESS_TOKEN" ]]; then
    META_ACCESS_TOKEN="$(prompt_secret 'META_ACCESS_TOKEN: ')"
  fi

  if [[ -z "$SITE_PROFILES_FILE" ]]; then
    SITE_PROFILES_FILE="$(prompt_optional_path 'Existing site-profiles.local.json path (optional, press Enter to use template): ')"
  fi

  if [[ -z "$BUSINESS_RULES_FILE" ]]; then
    BUSINESS_RULES_FILE="$(prompt_optional_path 'Existing BUSINESS_RULES.local.md path (optional, press Enter to use template): ')"
  fi
fi

PROJECT_DIR="$(cd "$PROJECT_DIR" && pwd)"
[[ -d "$PROJECT_DIR" ]] || die "Project directory does not exist: $PROJECT_DIR"
[[ -n "$META_ACCESS_TOKEN" || "$DRY_RUN" -eq 1 ]] || die "META_ACCESS_TOKEN is required"

if [[ -n "$SITE_PROFILES_FILE" ]]; then
  SITE_PROFILES_FILE="$(cd "$(dirname "$SITE_PROFILES_FILE")" && pwd)/$(basename "$SITE_PROFILES_FILE")"
  [[ -f "$SITE_PROFILES_FILE" ]] || die "Missing site profiles file: $SITE_PROFILES_FILE"
fi

if [[ -n "$BUSINESS_RULES_FILE" ]]; then
  BUSINESS_RULES_FILE="$(cd "$(dirname "$BUSINESS_RULES_FILE")" && pwd)/$(basename "$BUSINESS_RULES_FILE")"
  [[ -f "$BUSINESS_RULES_FILE" ]] || die "Missing business rules file: $BUSINESS_RULES_FILE"
fi

if [[ "$PLUGIN_SCOPE" != "user" && "$PLUGIN_SCOPE" != "project" && "$PLUGIN_SCOPE" != "local" ]]; then
  die "Unsupported scope: $PLUGIN_SCOPE"
fi

TEMP_DIR=""
cleanup() {
  if [[ -n "$TEMP_DIR" && -d "$TEMP_DIR" ]]; then
    rm -rf "$TEMP_DIR"
  fi
}
trap cleanup EXIT

if [[ "$DRY_RUN" -ne 1 ]]; then
  TEMP_DIR="$(mktemp -d)"
  download_or_copy "plugins/meta-mcp/site-profiles.example.json" "${TEMP_DIR}/site-profiles.example.json"
  download_or_copy "plugins/meta-mcp/BUSINESS_RULES.example.md" "${TEMP_DIR}/BUSINESS_RULES.example.md"
  download_or_copy "plugins/meta-mcp/MCP_USAGE.md" "${TEMP_DIR}/MCP_USAGE.md"
else
  TEMP_DIR="/tmp/meta-mcp-dry-run"
fi

log "Configuring global Claude MCP server"
write_global_claude_mcp_config "$META_ACCESS_TOKEN"

log "Installing/updating Claude marketplace"
install_or_update_marketplace

log "Installing/updating plugin ${PLUGIN_ID}"
install_or_update_plugin

log "Bootstrapping project files in ${PROJECT_DIR}"

META_ROOT="${PROJECT_DIR}/.claude/meta-mcp"
SITE_PROFILES_PATH="${META_ROOT}/site-profiles.local.json"
BUSINESS_RULES_PATH="${META_ROOT}/BUSINESS_RULES.local.md"
README_PATH="${META_ROOT}/README.md"
MCP_USAGE_PATH="${META_ROOT}/MCP_USAGE.md"
GITIGNORE_PATH="${PROJECT_DIR}/.claude/.gitignore"

if [[ "$DRY_RUN" -eq 1 ]]; then
  printf '[dry-run] mkdir -p %s\n' "$META_ROOT"
else
  mkdir -p "$META_ROOT"
fi

if [[ -n "$SITE_PROFILES_FILE" ]]; then
  copy_if_needed "$SITE_PROFILES_FILE" "$SITE_PROFILES_PATH"
else
  copy_if_needed "${TEMP_DIR}/site-profiles.example.json" "$SITE_PROFILES_PATH"
fi

if [[ -n "$BUSINESS_RULES_FILE" ]]; then
  copy_if_needed "$BUSINESS_RULES_FILE" "$BUSINESS_RULES_PATH"
else
  copy_if_needed "${TEMP_DIR}/BUSINESS_RULES.example.md" "$BUSINESS_RULES_PATH"
fi

copy_if_needed "${TEMP_DIR}/MCP_USAGE.md" "$MCP_USAGE_PATH"

write_project_readme "$README_PATH"
ensure_gitignore_entries "$GITIGNORE_PATH"

log ""
log "Setup complete."
log "Project: ${PROJECT_DIR}"
log "Plugin scope: ${PLUGIN_SCOPE}"
log "Global Claude MCP server: meta"
log "Next files to review:"
log "- ${SITE_PROFILES_PATH}"
log "- ${BUSINESS_RULES_PATH}"
log "- ${MCP_USAGE_PATH}"
log ""
log "Then restart Claude Code Desktop if it was already open."
