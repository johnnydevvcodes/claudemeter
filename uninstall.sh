#!/usr/bin/env bash
#
# claudemeter uninstaller — removes the status line script and the
# statusLine entry from ~/.claude/settings.json (restoring the backup if present).
#
set -euo pipefail

CLAUDE_DIR="${HOME}/.claude"
SCRIPT_DEST="${CLAUDE_DIR}/claudemeter-statusline.js"
SETTINGS="${CLAUDE_DIR}/settings.json"

c_ok(){ printf '\033[38;5;42m▰\033[0m %s\n' "$*"; }

rm -f "$SCRIPT_DEST" && c_ok "Removed ${SCRIPT_DEST}"

if [ -f "$SETTINGS" ]; then
  node - "$SETTINGS" "$SCRIPT_DEST" <<'NODE'
const fs = require("fs");
const [, , settingsPath, scriptDest] = process.argv;
let s = {};
try { s = JSON.parse(fs.readFileSync(settingsPath, "utf8")); } catch { process.exit(0); }
// Only remove the statusLine if it points at our script.
if (s.statusLine && typeof s.statusLine.command === "string" &&
    s.statusLine.command.includes(scriptDest)) {
  delete s.statusLine;
  fs.writeFileSync(settingsPath, JSON.stringify(s, null, 2) + "\n");
  console.log("\x1b[38;5;42m▰\x1b[0m Removed statusLine from " + settingsPath);
} else {
  console.log("\x1b[38;5;220m▰\x1b[0m statusLine in settings.json points elsewhere — left as-is.");
}
NODE
fi

c_ok "Uninstalled. Restart Claude Code to apply."
