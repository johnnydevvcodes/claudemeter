# claudemeter

A tiny **Claude Code status line** that shows real usage info — right in your terminal, on every prompt.

```
current session: ▰▰▰▰▰▰  75%  [resets in 1h 16m]
all models:      194.6M tokens  [resets in 4d 21h]
fable:             6.5M tokens  [resets in 4d 21h]
```

- **current session** — a color-coded bar of how far into your active 5-hour block you are 🟢 <50% · 🟡 50–79% · 🔴 80%+
- **all models / fable** — your **real weekly token usage** with the **real plan reset** countdown
- Runs **100% locally** — reads your `~/.claude` logs via [`ccusage`](https://github.com/ryoppippi/ccusage) and Claude Code's own cache. **Sends nothing to any API and consumes zero tokens or plan quota.**

> **Only shows what's real.** Your true plan-limit *percentages* (Claude's `/usage` panel) are fetched live from Anthropic and never stored on disk, so no script can display them. claudemeter deliberately shows only verifiable local data: **real token counts** and the **real weekly reset time**.

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

## What the rows mean

The default layout shows three rows, **all driven by real, local data**:

| Row | Shows | Source |
|---|---|---|
| **current session** | A bar of how far into your active 5-hour block you are, + reset countdown | ✅ time-based (via `ccusage`) |
| **all models** | Your **real** combined weekly token count, + real reset countdown | ✅ `ccusage` + `planLimitsEndDate` |
| **fable** | Your **real** weekly token count for Fable models | ✅ `ccusage` + `planLimitsEndDate` |
| **context** *(opt-in)* | Context-window fill % of the current conversation | ✅ live |

**Why token counts and not a "% used"?** A percentage needs a ceiling, and your true plan limit isn't available to any script — it's fetched live by Claude's `/usage` and never written to disk. Rather than invent a fake denominator, the weekly rows show your **actual token usage** and the **real reset time** (`planLimitsEndDate` from Claude Code's cache). Honest by construction.

> **Note:** the `current session` bar measures **time elapsed** in the 5-hour window — not "usage consumed." It's an accurate clock, not a copy of the `/usage` panel's session percentage (which, again, isn't readable locally).

## Configure (optional)

Create `~/.claude/claudemeter.config.json` (see [`claudemeter.config.example.json`](./claudemeter.config.example.json)):

```json
{
  "barWidth": 6,
  "showContext": false,
  "weekly": [
    { "label": "all models", "model": "all" },
    { "label": "fable", "model": "fable" }
  ]
}
```

| Key | Default | Meaning |
|---|---|---|
| `barWidth` | `6` | Number of segments per bar |
| `showContext` | `false` | Show the live context-window bar (opt-in) |
| `weekly` | live `all models` + `fable` | Weekly rows (see below). Set to `[]` to hide them. |

**Weekly row entries** can be either:

| Style | Fields | Behavior |
|---|---|---|
| **Count** (default) | `label`, `model`, `resets?` | Real weekly token count for `model` — `"all"` or a model-name substring (e.g. `"fable"`, `"opus"`, `"sonnet"`). Reset defaults to the real `planLimitsEndDate`; `resets` overrides the label text. |
| **Static** | `label`, `pct`, `resets?` | A fixed manual `%` bar you edit by hand. |

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
