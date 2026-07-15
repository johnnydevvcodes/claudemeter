#!/usr/bin/env node
/**
 * claudemeter — a Claude Code status line with live usage bars.
 *
 * Shows, on every prompt (default layout):
 *   • current session : how far into the active 5-hour block you are (+ reset countdown)  [LIVE]
 *   • all models      : static placeholder weekly bucket (edit in config)                 [MANUAL]
 *   • fable           : static placeholder weekly bucket (edit in config)                 [MANUAL]
 *   • context         : context-window fill % — opt-in via "showContext": true            [LIVE]
 *
 * Everything runs locally via `ccusage` reading ~/.claude logs — it sends
 * nothing to any API and consumes zero tokens / plan quota.
 *
 * IMPORTANT: the "all models" / "fable" percentages are STATIC placeholders,
 * not your real usage. Real plan-limit percentages aren't available to any
 * script (only Claude Code's built-in /usage command has them). Edit or hide
 * them via the config file.
 *
 * Optional config: ~/.claude/claudemeter.config.json
 *   {
 *     "barWidth": 6,
 *     "showContext": false,
 *     "weekly": [
 *       { "label": "all models", "pct": 24, "resets": "Tue 5:59 AM" },
 *       { "label": "fable",      "pct": 15, "resets": "Tue 5:59 AM" }
 *     ]
 *   }
 * Set "weekly": [] to hide the placeholder rows entirely.
 */
const { execSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

function readStdin() {
  try { return fs.readFileSync(0, "utf8"); } catch { return "{}"; }
}
const input = readStdin();

let cfg = {};
try {
  cfg = JSON.parse(
    fs.readFileSync(path.join(os.homedir(), ".claude", "claudemeter.config.json"), "utf8")
  );
} catch {}

const C = {
  reset: "\x1b[0m",
  dim: "\x1b[38;5;250m",   // light gray for the unfilled remainder
  green: "\x1b[38;5;42m",
  yellow: "\x1b[38;5;220m",
  red: "\x1b[38;5;203m",
};
const WIDTH = cfg.barWidth || 6;

function bar(pct, w = WIDTH) {
  pct = Math.max(0, Math.min(100, pct || 0));
  const f = Math.round((pct / 100) * w);
  const col = pct >= 80 ? C.red : pct >= 50 ? C.yellow : C.green;
  return col + "▰".repeat(f) + C.dim + "▰".repeat(w - f) + C.reset;
}
function fmtLeft(ms) {
  if (ms <= 0) return "0m";
  const h = Math.floor(ms / 3600000);
  const m = Math.round((ms % 3600000) / 60000);
  return (h ? h + "h " : "") + m + "m";
}

const rows = [];

// current session (live): elapsed fraction of the active 5-hour block + reset countdown
try {
  const b = JSON.parse(
    execSync("ccusage blocks --active --json 2>/dev/null", { encoding: "utf8" })
  ).blocks?.[0];
  if (b) {
    const s = new Date(b.startTime).getTime();
    const e = new Date(b.endTime).getTime();
    rows.push({
      label: "current session",
      pct: Math.round(((Date.now() - s) / (e - s)) * 100),
      reset: "resets in " + fmtLeft(e - Date.now()),
    });
  }
} catch {}

// context (live): parsed from ccusage's own status line (it reads the transcript)
// Opt-in — set "showContext": true in the config to display it.
if (cfg.showContext === true) {
  try {
    const base = execSync("ccusage statusline 2>/dev/null", { input, encoding: "utf8" }).trim();
    const m = base.match(/🧠[^(]*\((\d+)%\)/);
    if (m) rows.push({ label: "context", pct: parseInt(m[1], 10) });
  } catch {}
}

// Weekly plan buckets. THESE ARE STATIC PLACEHOLDERS, not live usage — real
// plan-limit percentages aren't exposed to any script (only Claude Code's
// built-in /usage command has them). Shown by default so the layout matches
// Claude's usage panel; override or disable them in the config file:
//   "weekly": [ { "label": "all models", "pct": 24, "resets": "Tue 5:59 AM" } ]
//   "weekly": []   // hides them entirely
const DEFAULT_WEEKLY = [
  { label: "all models", pct: 24, resets: "Tue 5:59 AM" },
  { label: "fable", pct: 15, resets: "Tue 5:59 AM" },
];
const weekly = Array.isArray(cfg.weekly) ? cfg.weekly : DEFAULT_WEEKLY;
for (const w of weekly)
  rows.push({ label: w.label, pct: w.pct, reset: w.resets ? "resets " + w.resets : "" });

if (!rows.length) {
  process.stdout.write("claudemeter: no data — is `ccusage` installed and Claude Code active?");
  process.exit(0);
}

// pad "<label>:" to a common width so every bar starts at the same column
const labelW = Math.max(...rows.map((r) => r.label.length)) + 1;
const lines = rows.map((r) => {
  const lbl = (r.label + ":").padEnd(labelW);
  const pct = String(r.pct).padStart(3);
  return `${lbl} ${bar(r.pct)} ${pct}%${r.reset ? "  [" + r.reset + "]" : ""}`;
});

process.stdout.write(lines.join("\n"));
