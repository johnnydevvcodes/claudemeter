#!/usr/bin/env node
/**
 * claudemeter — a Claude Code status line with honest, local usage info.
 *
 * Default layout:
 *   • current session : how far into the active 5-hour block you are (+ reset countdown)  [LIVE, time-based]
 *   • all models      : your REAL combined weekly token usage (+ real plan reset)          [LIVE, real count]
 *   • fable           : your REAL weekly token usage for Fable models                      [LIVE, real count]
 *   • context         : context-window fill % — opt-in via "showContext": true             [LIVE]
 *
 * Everything runs locally via `ccusage` (reading ~/.claude logs) and Claude
 * Code's own cache (~/.claude.json). It sends nothing to any API and consumes
 * zero tokens / plan quota.
 *
 * HONESTY NOTE: your true plan-limit *percentages* (Claude's /usage panel) are
 * fetched live from Anthropic's servers and are never stored locally, so no
 * script can show them. claudemeter shows only what is verifiably on disk:
 * real token counts and the real weekly reset time (planLimitsEndDate).
 *
 * Optional config: ~/.claude/claudemeter.config.json
 *   {
 *     "barWidth": 6,
 *     "showContext": false,
 *     "weekly": [
 *       { "label": "all models", "model": "all",   "resets": "..." },
 *       { "label": "fable",      "model": "fable" }
 *     ]
 *   }
 * A weekly entry is either:
 *   • COUNT  — { label, model: "all" | "<model-substring>", resets?: text }  (real tokens)
 *   • STATIC — { label, pct, resets? }                                       (manual % bar)
 * Set "weekly": [] to hide the weekly rows entirely.
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
function fmtLong(ms) {
  if (ms <= 0) return "0h";
  const d = Math.floor(ms / 86400000);
  const h = Math.round((ms % 86400000) / 3600000);
  return (d ? d + "d " : "") + h + "h";
}
function fmtTokens(n) {
  n = n || 0;
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(n);
}

// Monday (local) of the week containing `date`, as YYYY-MM-DD — matches
// ccusage's week-start convention.
function mondayISO(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Real weekly reset time from Claude Code's own cache (~/.claude.json).
// Falls back to the calendar-week boundary if the cache is missing.
function weeklyResetMs() {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(os.homedir(), ".claude.json"), "utf8"));
    const iso = j?.cachedGrowthBookFeatures?.tengu_saffron_lattice?.planLimitsEndDate;
    let t = iso ? new Date(iso).getTime() : NaN;
    if (!isNaN(t)) {
      while (t < Date.now()) t += 7 * 86400000; // roll weekly if the cached date is stale
      return t;
    }
  } catch {}
  return new Date(mondayISO(new Date()) + "T00:00:00").getTime() + 7 * 86400000;
}

// Real weekly token usage from ccusage (cached; loaded lazily).
let _weekly;
function loadWeekly() {
  if (_weekly !== undefined) return _weekly;
  _weekly = null;
  try {
    const j = JSON.parse(execSync("ccusage weekly --breakdown --json 2>/dev/null", { encoding: "utf8" }));
    const weeks = j.weekly || [];
    const tok = (m) => m ? (m.inputTokens || 0) + (m.outputTokens || 0) + (m.cacheCreationTokens || 0) + (m.cacheReadTokens || 0) : 0;
    const last = weeks[weeks.length - 1];
    // Only count the latest entry if it's actually the current week.
    const cur = last && last.period === mondayISO(new Date()) ? last : null;
    _weekly = { cur, tok };
  } catch {}
  return _weekly;
}

// Real tokens used this week for a row. key "all" = combined, else model substring.
// Returns null when ccusage has no data (→ skip the row), 0 when the week is empty.
function weeklyTokens(key) {
  const w = loadWeekly();
  if (!w) return null;
  if (!w.cur) return 0;
  if (key === "all") return w.cur.totalTokens || 0;
  const mb = (w.cur.modelBreakdowns || []).find((m) => m.modelName.includes(key));
  return mb ? w.tok(mb) : 0;
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

// Weekly rows — real token counts by default, with the real plan reset time.
const DEFAULT_WEEKLY = [
  { label: "all models", model: "all" },
  { label: "fable", model: "fable" },
];
const weekly = Array.isArray(cfg.weekly) ? cfg.weekly : DEFAULT_WEEKLY;
const resetTxt = "resets in " + fmtLong(weeklyResetMs() - Date.now());
for (const w of weekly) {
  const reset = w.resets ? "resets " + w.resets : resetTxt;
  if (w.model) {
    const used = weeklyTokens(w.model);
    if (used === null) continue; // no ccusage data — skip rather than invent a number
    rows.push({ label: w.label, count: used, reset });
  } else {
    // manual static % bar (backward compatible)
    rows.push({ label: w.label, pct: w.pct, reset });
  }
}

if (!rows.length) {
  process.stdout.write("claudemeter: no data — is `ccusage` installed and Claude Code active?");
  process.exit(0);
}

// Align: pad labels to a common width; right-align token counts among themselves.
const labelW = Math.max(...rows.map((r) => r.label.length)) + 1;
const countW = Math.max(0, ...rows.filter((r) => r.count !== undefined).map((r) => fmtTokens(r.count).length));
const lines = rows.map((r) => {
  const lbl = (r.label + ":").padEnd(labelW);
  const tail = r.reset ? "  [" + r.reset + "]" : "";
  if (r.count !== undefined) {
    return `${lbl} ${fmtTokens(r.count).padStart(countW)} tokens${tail}`;
  }
  return `${lbl} ${bar(r.pct)} ${String(r.pct).padStart(3)}%${tail}`;
});

process.stdout.write(lines.join("\n"));
