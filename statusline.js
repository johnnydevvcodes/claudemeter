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
function fmtLong(ms) {
  if (ms <= 0) return "0h";
  const d = Math.floor(ms / 86400000);
  const h = Math.round((ms % 86400000) / 3600000);
  return (d ? d + "d " : "") + h + "h";
}

// Monday (local) of the week containing `date`, as a YYYY-MM-DD string —
// matches ccusage's week-start convention.
function mondayISO(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // shift back to Monday
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Real weekly usage from ccusage (cached; loaded lazily).
let _weekly;
function loadWeekly() {
  if (_weekly !== undefined) return _weekly;
  _weekly = null;
  try {
    const j = JSON.parse(execSync("ccusage weekly --breakdown --json 2>/dev/null", { encoding: "utf8" }));
    const weeks = j.weekly || [];
    const tok = (m) => m ? (m.inputTokens || 0) + (m.outputTokens || 0) + (m.cacheCreationTokens || 0) + (m.cacheReadTokens || 0) : 0;
    let peakAll = 0;
    const peakModel = {};
    for (const w of weeks) {
      peakAll = Math.max(peakAll, w.totalTokens || 0);
      for (const m of w.modelBreakdowns || [])
        peakModel[m.modelName] = Math.max(peakModel[m.modelName] || 0, tok(m));
    }
    // Only treat the latest entry as "this week" if its start matches the
    // actual current week — otherwise there's been no usage yet (→ 0%).
    const thisMonday = mondayISO(new Date());
    const last = weeks[weeks.length - 1];
    const cur = last && last.period === thisMonday ? last : null;
    const resetMs = new Date(thisMonday + "T00:00:00").getTime() + 7 * 86400000;
    _weekly = { cur, tok, peakAll, peakModel, resetMs };
  } catch {}
  return _weekly;
}

// Real used/peak tokens for a weekly row. key "all" = combined, else model-name substring.
// used is 0 when the current week has no usage yet.
function weeklyUsage(key) {
  const w = loadWeekly();
  if (!w) return null;
  if (key === "all") return { used: w.cur ? w.cur.totalTokens || 0 : 0, peak: w.peakAll };
  let peak = 0;
  for (const [name, p] of Object.entries(w.peakModel)) if (name.includes(key)) peak = Math.max(peak, p);
  const mb = w.cur ? (w.cur.modelBreakdowns || []).find((m) => m.modelName.includes(key)) : null;
  return { used: mb ? w.tok(mb) : 0, peak };
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

// Weekly rows. Two kinds of entry:
//   • LIVE  — { label, model: "all" | "<model-substring>", budget?: <tokens>, resets?: text }
//             pct = this week's real tokens / budget. budget defaults to your
//             busiest week on record (a real, self-referential ceiling). Set
//             "budget" to your actual weekly token allowance for a true limit %.
//   • STATIC — { label, pct, resets }  (a fixed placeholder you edit by hand)
// NOTE: real plan-limit percentages aren't exposed to any script (only Claude
// Code's /usage command has them), so LIVE rows are % of a token budget, not
// of your Anthropic plan cap. Set "weekly": [] to hide these rows.
const DEFAULT_WEEKLY = [
  { label: "all models", model: "all" },
  { label: "fable", model: "fable" },
];
// Smart default ceiling: without an explicit budget, use 1.5x your busiest
// week so a peak week reads ~67% (yellow, not a pinned red 100%) and
// lighter/fresh weeks scale below it. Set a real "budget" per row for a true
// limit gauge, or tune "budgetHeadroom" in the config.
const HEADROOM = cfg.budgetHeadroom || 1.5;
const weekly = Array.isArray(cfg.weekly) ? cfg.weekly : DEFAULT_WEEKLY;
for (const w of weekly) {
  if (w.model) {
    const u = weeklyUsage(w.model);
    if (!u) continue; // no ccusage data — skip rather than show a fake number
    const baseline = u.peak || u.used; // busiest week (or this week if it's the only data)
    const budget = w.budget || (baseline ? baseline * HEADROOM : 1);
    const pct = Math.min(100, Math.round((u.used / budget) * 100));
    let reset = w.resets ? "resets " + w.resets : "";
    const wk = loadWeekly();
    if (!w.resets && wk && wk.resetMs) reset = "resets in " + fmtLong(wk.resetMs - Date.now());
    rows.push({ label: w.label, pct, reset });
  } else {
    rows.push({ label: w.label, pct: w.pct, reset: w.resets ? "resets " + w.resets : "" });
  }
}

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
