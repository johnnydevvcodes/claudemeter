# Changelog

All notable changes to **claudemeter** are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[1.0.0]: https://github.com/johnnydevvcodes/claudemeter/releases/tag/v1.0.0
