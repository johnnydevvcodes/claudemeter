# claudemeter

A tiny **Claude Code status line** that shows your usage as clean, color-coded progress bars — right in your terminal, on every prompt.

```
current session: ▰▰▰▰▰▰  78%  [resets in 1h 6m]
all models:      ▰▰▰▰▰▰  24%  [resets Tue 5:59 AM]
fable:           ▰▰▰▰▰▰  15%  [resets Tue 5:59 AM]
```

- 🟢 **green** under 50% · 🟡 **yellow** 50–79% · 🔴 **red** 80%+
- Runs **100% locally** — reads your `~/.claude` logs via [`ccusage`](https://github.com/ryoppippi/ccusage). **Sends nothing to any API and consumes zero tokens or plan quota.**

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/johnnydevvcodes/claudemeter/main/install.sh | bash
```

Then start a new Claude Code session (or reload). That's it.

The installer will:
1. Check for **Node.js** (required).
2. Install **ccusage** globally if it's missing.
3. Drop `claudemeter-statusline.js` into `~/.claude/`.
4. Add a `statusLine` entry to `~/.claude/settings.json` — **existing settings are preserved** and a `settings.json.bak` backup is written.

### Install from a local checkout

```bash
git clone https://github.com/johnnydevvcodes/claudemeter.git
cd claudemeter
./install.sh
```

## What the bars mean

| Bucket | Source | Live? |
|---|---|---|
| **current session** | Elapsed % of your active 5-hour block, with a reset countdown | ✅ live (via `ccusage`) |
| **context** | Context-window fill % of the current conversation | ✅ live |
| **weekly buckets** (`all models`, `fable`, …) | Values **you** put in the config file | ✍️ manual |

> **Why are weekly buckets manual?** Your real plan-limit percentages (the ones in Claude's `/usage` panel) live on Anthropic's servers and are **not exposed to any script** — only Claude Code's built-in `/usage` command can read them. So `claudemeter` shows the two things a local tool *can* know for real (session + context), and lets you optionally pin weekly reminders you update by hand.

## Configure (optional)

Create `~/.claude/claudemeter.config.json` (see [`claudemeter.config.example.json`](./claudemeter.config.example.json)):

```json
{
  "barWidth": 6,
  "showContext": true,
  "weekly": [
    { "label": "all models", "pct": 24, "resets": "Tue 5:59 AM" },
    { "label": "fable", "pct": 15, "resets": "Tue 5:59 AM" }
  ]
}
```

| Key | Default | Meaning |
|---|---|---|
| `barWidth` | `6` | Number of segments per bar |
| `showContext` | `true` | Show the context-window bar |
| `weekly` | `[]` | Static buckets: `label`, `pct` (0–100), optional `resets` text |

## How it works — and is it safe?

Short version: **yes, it's safe, and it costs you nothing.** `claudemeter` is a small, readable Node script that runs entirely on your machine.

- **No network, no API calls.** The status line shells out to [`ccusage`](https://github.com/ryoppippi/ccusage), which only *reads* the local log files Claude Code already writes to `~/.claude`. Nothing is uploaded anywhere.
- **Zero tokens, zero plan quota.** Because it never talks to a model, it can't consume tokens or eat into your usage limits. The status line text isn't part of the conversation sent to the model either — it's just UI.
- **The only cost is a few milliseconds of local CPU** each time the status line refreshes (roughly once per prompt), to spawn `node` + `ccusage`.
- **Your settings are preserved.** The installer merges a single `statusLine` key into `~/.claude/settings.json` and writes a `settings.json.bak` backup first. Uninstall removes it cleanly — and only if it still points at this tool.
- **Read before you pipe.** Running any `curl … | bash` installer means trusting the script. This one is short — [read `install.sh`](./install.sh) and [`statusline.js`](./statusline.js) first, or clone and run locally.

## Requirements

- [Claude Code](https://claude.com/claude-code)
- **Node.js** 18+
- **ccusage** (installed automatically) — or it falls back to `npx ccusage`

## Uninstall

```bash
curl -fsSL https://raw.githubusercontent.com/johnnydevvcodes/claudemeter/main/uninstall.sh | bash
```

Removes the script and the `statusLine` entry (only if it still points at this tool).

## License

[MIT](./LICENSE)
