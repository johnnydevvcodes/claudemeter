# Releases

Copy-paste release notes for each tag, for use in **GitHub → Releases → Draft new release**.
Versioning is `v1.0.0+<build>` (semver base `1.0.0`, build number increments per release).
See [`CHANGELOG.md`](./CHANGELOG.md) for the concise change log.

---

## v1.0.0+6 — Real token counts + real reset date  ⭐ latest

The weekly rows are now **honest by construction**.

```
current session: ▰▰▰▰▰▰  75%  [resets in 1h 16m]
all models:      194.6M tokens  [resets in 4d 21h]
fable:             6.5M tokens  [resets in 4d 21h]
```

**Changed (breaking)**
- Weekly rows show **real token counts** instead of a percentage — no invented denominator, so a 30×-different usage no longer reads at the same %.
- Weekly reset uses the **real plan reset time** (`planLimitsEndDate` from Claude Code's cache), rolling forward weekly if stale.
- Removed the `budget` / `budgetHeadroom` machinery.

**Why?** Your true plan-limit *percentages* (Claude's `/usage` panel) are fetched live and never stored on disk, so no script can show them. claudemeter now shows only verifiable local data: real token counts + the real reset time.

**Still supported:** static manual `%` rows, custom `model` substrings (`opus`, `sonnet`, …), and `"weekly": []` to hide the rows.

**Install / update**
```bash
curl -fsSL https://raw.githubusercontent.com/johnnydevvcodes/claudemeter/main/install.sh | bash
```

**Full changelog:** https://github.com/johnnydevvcodes/claudemeter/compare/v1.0.0%2B5...v1.0.0%2B6

---

## v1.0.0+5 — Smart default budget

**Added**
- Weekly percentage ceiling defaulted to 1.5× your busiest week, so a peak week read ~67% (yellow) instead of a pinned red 100%.

_Note: the budget-based % was removed in +6 in favor of real token counts._

**Full changelog:** https://github.com/johnnydevvcodes/claudemeter/compare/v1.0.0%2B4...v1.0.0%2B5

---

## v1.0.0+4 — 0% when no usage this week

**Fixed**
- Weekly rows correctly read empty when the current calendar week has no usage yet (previously a prior week's numbers could leak in).

**Full changelog:** https://github.com/johnnydevvcodes/claudemeter/compare/v1.0.0%2B3...v1.0.0%2B4

---

## v1.0.0+3 — Real weekly usage

Weekly rows became data-driven instead of placeholders.

**Added**
- `all models` / `fable` driven by real `ccusage` weekly data
- Live weekly config `{ label, model, budget?, resets? }`

_Note: this build showed a budget-based %, later replaced by real token counts in +6._

**Full changelog:** https://github.com/johnnydevvcodes/claudemeter/compare/v1.0.0%2B2...v1.0.0%2B3

---

## v1.0.0+2 — Three-row layout

Default layout now matches Claude's usage panel out of the box.

**Changed**
- Default shows three rows: `current session` + `all models` + `fable`
- `context` bar is now opt-in via `"showContext": true`

_Note: weekly rows were static placeholders in this build (superseded by +3)._

**Full changelog:** https://github.com/johnnydevvcodes/claudemeter/compare/v1.0.0%2B1...v1.0.0%2B2

---

## v1.0.0+1 — First public release

🎉 **claudemeter** — a Claude Code status line that shows your usage as clean, color-coded bars in your terminal.

**Highlights**
- 🟢🟡🔴 Color-coded current-session bar (elapsed in your active 5-hour block, with a reset countdown)
- Live context-window bar
- Optional weekly buckets via config
- **100% local** — reads `~/.claude` logs via [`ccusage`](https://github.com/ryoppippi/ccusage). Zero tokens, zero plan quota.
- One-line installer (Node check, auto-installs `ccusage`, merges `settings.json` with a backup) + uninstaller

**Install**
```bash
curl -fsSL https://raw.githubusercontent.com/johnnydevvcodes/claudemeter/main/install.sh | bash
```
