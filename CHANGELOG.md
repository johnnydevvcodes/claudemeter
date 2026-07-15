# Changelog

All notable changes to **claudemeter** are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] — 2026-07-15

### Changed
- **Weekly rows now show REAL usage.** `all models` and `fable` are driven by
  live `ccusage` weekly token data instead of static placeholders, with a real
  countdown to the calendar-week rollover.

### Added
- Live weekly row config: `{ "label", "model", "budget?", "resets?" }`. `model`
  is `"all"` or a model-name substring; `budget` (tokens) sets the percentage
  ceiling. Without a budget, the row falls back to % of your busiest week.
- Static placeholder rows (`{ "label", "pct", "resets" }`) still supported for
  anyone who prefers a fixed value.

## [1.1.0] — 2026-07-15

### Changed
- Default layout now shows three rows out of the box: **current session** (live)
  plus **all models** and **fable** static placeholder buckets, matching Claude's
  usage panel. The placeholder rows are clearly documented as non-live and can be
  edited or hidden (`"weekly": []`) in the config.
- **context** bar is now opt-in (`"showContext": true`) instead of shown by default.

## [1.0.0] — 2026-07-15

First public release.

### Added
- Claude Code status line rendering usage as color-coded progress bars
  (🟢 <50% · 🟡 50–79% · 🔴 80%+) with a light-gray unfilled remainder.
- **Live current-session bar** — elapsed % of the active 5-hour block, with a
  reset countdown, sourced from `ccusage`.
- **Live context bar** — context-window fill % of the current conversation.
- **Optional weekly buckets** via `~/.claude/claudemeter.config.json`
  (`barWidth`, `showContext`, and hand-set `weekly` entries).
- One-line `curl | bash` **installer** that checks for Node.js, installs
  `ccusage` if missing, places the script, and merges `settings.json`
  (preserving existing keys and writing a `.bak` backup).
- **Uninstaller** that removes the script and the `statusLine` entry only when
  it still points at claudemeter.
- MIT license, example config, and documentation.

[1.2.0]: https://github.com/johnnydevvcodes/claudemeter/releases/tag/v1.2.0
[1.1.0]: https://github.com/johnnydevvcodes/claudemeter/releases/tag/v1.1.0
[1.0.0]: https://github.com/johnnydevvcodes/claudemeter/releases/tag/v1.0.0
