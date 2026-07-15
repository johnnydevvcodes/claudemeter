#!/usr/bin/env bash
#
# claudemeter installer
#
#   Remote (one-liner):
#     curl -fsSL https://raw.githubusercontent.com/johnnydevvcodes/claudemeter/main/install.sh | bash
#
#   Local (from a checkout):
#     ./install.sh
#
set -euo pipefail

# ---- config (override via env, e.g. GH_USER=me GH_BRANCH=dev bash install.sh) ----
GH_USER="${GH_USER:-johnnydevvcodes}"
GH_REPO="${GH_REPO:-claudemeter}"
GH_BRANCH="${GH_BRANCH:-main}"
RAW_BASE="https://raw.githubusercontent.com/${GH_USER}/${GH_REPO}/${GH_BRANCH}"

CLAUDE_DIR="${HOME}/.claude"
SCRIPT_DEST="${CLAUDE_DIR}/claudemeter-statusline.js"
SETTINGS="${CLAUDE_DIR}/settings.json"

c_ok(){   printf '\033[38;5;42m▰\033[0m %s\n' "$*"; }
c_warn(){ printf '\033[38;5;220m▰\033[0m %s\n' "$*"; }
c_err(){  printf '\033[38;5;203m▰\033[0m %s\n' "$*" >&2; }

echo
c_ok "Installing claudemeter…"

# 1. Node.js is required
if ! command -v node >/dev/null 2>&1; then
  c_err "Node.js is required. Install it first: https://nodejs.org"
  exit 1
fi

# 2. ccusage (data source) — install globally if missing
if ! command -v ccusage >/dev/null 2>&1; then
  if command -v npm >/dev/null 2>&1; then
    c_ok "Installing ccusage globally (npm i -g ccusage)…"
    npm install -g ccusage >/dev/null 2>&1 || {
      c_warn "Global install failed — the status line will fall back to 'npx ccusage' (slower)."
    }
  else
    c_warn "npm not found — the status line will use 'npx ccusage' at runtime (slower)."
  fi
fi

# 3. Place the status line script (copy from local checkout, else download)
mkdir -p "$CLAUDE_DIR"
SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || true)"
if [ -n "${SELF_DIR}" ] && [ -f "${SELF_DIR}/statusline.js" ]; then
  cp "${SELF_DIR}/statusline.js" "$SCRIPT_DEST"
  c_ok "Copied statusline.js → ${SCRIPT_DEST}"
else
  c_ok "Downloading statusline.js…"
  curl -fsSL "${RAW_BASE}/statusline.js" -o "$SCRIPT_DEST"
fi

# 4. Wire it into ~/.claude/settings.json, preserving any existing keys (backup first)
node - "$SETTINGS" "$SCRIPT_DEST" <<'NODE'
const fs = require("fs");
const [, , settingsPath, scriptDest] = process.argv;
let s = {};
try { s = JSON.parse(fs.readFileSync(settingsPath, "utf8")); } catch {}
if (fs.existsSync(settingsPath)) fs.copyFileSync(settingsPath, settingsPath + ".bak");
s.statusLine = { type: "command", command: `node ${scriptDest}` };
fs.writeFileSync(settingsPath, JSON.stringify(s, null, 2) + "\n");
console.log("\x1b[38;5;42m▰\x1b[0m Updated " + settingsPath +
  (fs.existsSync(settingsPath + ".bak") ? " (backup: settings.json.bak)" : ""));
NODE

echo
c_ok "Done! Start a new Claude Code session (or reload) to see your usage bars:"
echo
printf '   current session: \033[38;5;220m▰▰▰▰▰\033[38;5;250m▰\033[0m  78%%  [resets in 1h 6m]\n'
echo
c_ok "Optional: create ${CLAUDE_DIR}/claudemeter.config.json to add weekly buckets."
c_ok "Uninstall anytime with: bash <(curl -fsSL ${RAW_BASE}/uninstall.sh)"
echo
