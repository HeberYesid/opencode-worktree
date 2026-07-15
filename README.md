# opencode-worktree

opencode plugin for git worktrees with terminal chooser.

Pick your terminal — Windows Terminal, pwsh, cmd, Terminal.app, iTerm2, gnome-terminal — or define custom templates via JSONC config.

## Features

- **Terminal picker** — choose which terminal opens per worktree
- **Custom templates** — define your own terminal launch commands with `{cwd}` and `{cmd}` placeholders
- **Cross-platform** — Windows, macOS, and Linux with sensible defaults
- **Minimalist** — JSON state, no SQLite, no session forking
- **Slash commands** — `/wt-create`, `/wt-delete`, `/wt-list` for natural interaction

## Requirements

- [Bun](https://bun.sh) (opencode's runtime)
- [opencode](https://opencode.ai) v0.x or later
- Git 2.5+

## Installation

### Option A — Via opencode.json (recommended)

Add this line to your `opencode.json` or `.opencode/opencode.jsonc`:

```json
{
  "plugin": ["opencode-worktree@git+https://github.com/heberyesid/opencode-worktree.git"]
}
```

Restart opencode. It clones the repo, installs dependencies, and loads the plugin automatically.

### Option B — Local clone (for development)

```bash
git clone https://github.com/heberyesid/opencode-worktree.git ~/.config/opencode/plugins/worktree-pick
cd ~/.config/opencode/plugins/worktree-pick && bun install
```

Then add the absolute path to your `opencode.json` or `.opencode/opencode.jsonc`:

```json
{
  "plugin": ["/Users/yourname/.config/opencode/plugins/worktree-pick/plugin.ts"]
}
```

Replace `/Users/yourname/...` with your actual home path. Restart opencode.


## Configuration

On first use, the plugin creates `.opencode/worktree-pick.jsonc` in your project root:

```jsonc
{
  // Default terminal (key from "terminals" below)
  "defaultTerminal": "wt",

  // Base path for worktrees (null = platform default)
  // Windows default: ~/opencode-worktrees
  // macOS/Linux default: ~/.local/share/opencode/worktree
  "worktreePath": null,

  // Terminal templates. {cwd} = worktree path, {cmd} = initial command.
  "terminals": {
    "wt":     ["wt.exe",   "-d",  "{cwd}", "cmd", "/k", "{cmd}"],
    "wt-dev": ["wt.exe",   "-p",  "Dev", "-d", "{cwd}", "cmd", "/k", "{cmd}"],
    "pwsh":   ["pwsh.exe", "-NoExit", "-Command", "Set-Location \"{cwd}\"; {cmd}"],
    "cmd":    ["cmd.exe",  "/c", "start", "", "cmd", "/k", "cd /d \"{cwd}\" && {cmd}"]
  }
}
```

### Terminal templates

Each template is an array of argv parts. The plugin replaces:

| Placeholder | Replaced with |
|---|---|
| `{cwd}` | Absolute path to the worktree |
| `{cmd}` | Command to run (default: `opencode`) |

**Windows defaults:**

| Key | Terminal |
|---|---|
| `wt` | Windows Terminal (default tab) |
| `wt-dev` | Windows Terminal (profile "Dev") |
| `pwsh` | PowerShell 7 |
| `cmd` | Command Prompt |

**macOS defaults:**

| Key | Terminal |
|---|---|
| `terminal` | Terminal.app |
| `iterm` | iTerm2 |

**Linux defaults:**

| Key | Terminal |
|---|---|
| `gnome` | GNOME Terminal |

Add your own entries — any executable will work (Alacritty, Kitty, tmux, VS Code terminal, etc.).

### Shorter paths on Windows

Windows has a 260-character path limit (MAX_PATH). The plugin uses a shorter base path (`~/opencode-worktrees`) and truncated project hashes on Windows. If you still hit the limit, set a very short `worktreePath`:

```jsonc
{ "worktreePath": "C:\\wt" }
```

## Slash Commands

### `/wt-create`

Creates a worktree and opens a terminal.

```
/wt-create feature/auth wt
```

First arg = branch name, second arg = terminal (optional, defaults to config).

### `/wt-delete`

Deletes a worktree, commits pending changes, and cleans up the branch.

```
/wt-delete done with this feature
```

The reason is required. If the reason looks like a branch name, it targets that branch instead of the current session.

### `/wt-list`

Lists all active worktrees for the current project.

```
/wt-list
```

Outputs a markdown table with branch, path, terminal, and creation date.

## How it works

1. `worktree_create` runs `git worktree add` and spawns the chosen terminal at the worktree path with `opencode` as the initial command.
2. Session state is stored as JSON in `~/.local/share/opencode/worktree-pick/<project-id>.json`.
3. `worktree_delete` snapshots uncommitted changes (`git add -A` + commit), removes the worktree, and deletes the branch.
4. `worktree_list` reads both `git worktree list --porcelain` and the JSON state to show metadata.

## Troubleshooting

### "Filename too long" on Windows

The plugin catches this error and falls back to `fs.rm` + `git worktree prune`. If it still fails, run manually:

```powershell
Remove-Item -Recurse -Force "C:\Users\...\worktree-path"
git worktree prune
```

Set a shorter `worktreePath` in config to prevent this.

### Terminal doesn't open

1. Verify the terminal executable is in your PATH (`wt.exe`, `pwsh.exe`, `osascript`, `gnome-terminal`).
2. Check the template in `.opencode/worktree-pick.jsonc`.
3. Try the template args manually in a terminal to debug.

### Command not running in terminal

The `{cmd}` placeholder is replaced with `opencode` by default. If your terminal template passes the command incorrectly, customize the template.

For macOS, Terminal.app uses AppleScript:
```jsonc
"terminal": ["osascript", "-e", "tell application \"Terminal\" to do script \"cd '{cwd}' && {cmd}\""]
```

For Linux, GNOME Terminal uses `bash -c`:
```jsonc
"gnome": ["gnome-terminal", "--", "bash", "-c", "cd '{cwd}' && {cmd}; exec bash"]
```

## FAQ

### How is this different from using plain `git worktree`?

Plain `git worktree` requires manual setup: create the branch, add the worktree, open a terminal, navigate to it, start opencode. This plugin automates all of that in one command. It also tracks session metadata (terminal, creation date, project ID) and offers a delete command that auto-commits pending changes and cleans up branches.

### Does it work with opencode Desktop?

Yes. Worktrees created via the plugin are standard git worktrees and work fine in Desktop. The terminal spawning is CLI-only, so you won't get the automatic terminal window in Desktop, but the worktrees themselves are fully compatible.

### Can I have multiple worktrees at once?

Yes. Each gets its own terminal with its own opencode session. Fully independent.

### What happens if I delete a worktree with uncommitted changes?

`/wt-delete` runs `git add -A` and commits a snapshot before removing the worktree. Nothing is lost.

### How do I change the terminal that opens?

Edit `.opencode/worktree-pick.jsonc` in your project root. Set a different `defaultTerminal` key or tweak the argv template for your terminal under the `terminals` section.

### Can I add custom terminals not in the defaults?

Yes. Any executable will work. Add a new entry under `terminals` in the config — Alacritty, Kitty, tmux, VS Code's `code` CLI, etc.

### Why does the plugin store state as JSON instead of SQLite?

Minimalism. The state is small — a few KiB per project. JSON is human-readable, trivially debuggable, and has zero runtime dependencies. No reason to pull in SQLite for that.

### "Filename too long" on Windows, what do I do?

The plugin catches this and auto-recovers with `fs.rm` + `git worktree prune`. If it persists, set a shorter `worktreePath` in config (e.g. `"C:\\wt"`). See the [Shorter paths on Windows](#shorter-paths-on-windows) section.

## Comparison with kdcokenny/opencode-worktree

Both plugins solve the same problem — automated git worktree management for opencode — but take different design approaches:

| Aspect | heberyesid/opencode-worktree | kdcokenny/opencode-worktree |
|---|---|---|
| **Installation** | Plugin reference in `opencode.json` | OCX registry (`ocx add` from `registry.kdco.dev`) |
| **Configuration** | `.opencode/worktree-pick.jsonc` — just terminals + path | `.opencode/worktree.jsonc` — sync, hooks, and terminal detection |
| **File sync** | None (bare worktrees) | `copyFiles`, `symlinkDirs` to bootstrap worktrees with `.env`, `node_modules`, etc. |
| **Lifecycle hooks** | None | `postCreate` / `preDelete` (e.g., `pnpm install`, `docker compose down`) |
| **Terminal config** | User-defined argv templates per terminal | Auto-detection with fallback chain (tmux > cmux > env vars > system default) |
| **Terminal support** | Templates for wt, pwsh, cmd, terminal, iterm, gnome — extendable | Ghostty, iTerm2, Kitty, WezTerm, Alacritty, Warp, Terminal.app, GNOME, Konsole, XFCE4, Foot, xterm, tmux, cmux |
| **State storage** | JSON file per project | JSONC (part of OCX ecosystem) |
| **User interface** | Slash commands (`/wt-create`, `/wt-delete`, `/wt-list`) | Tool calls (`worktree_create`, `worktree_delete`) |
| **Base path** | Configurable; Windows defaults to `~/opencode-worktrees` | Fixed at `~/.local/share/opencode/worktree/` |
| **Windows MAX_PATH** | Built-in mitigation (shorter paths, truncated hashes) | Not explicitly addressed |
| **Ecosystem** | Standalone plugin | Part of KDCO registry suite (workspace, background agents, notifications) |
| **Design philosophy** | Minimalist, manual control, simple JSON state | Feature-rich, auto-detection, hooks and sync for complex workflows |

**Choose this repo if:** you want a lightweight, no-dependency plugin with slash commands and manual control over terminal config. Good for Windows users who need MAX_PATH handling.

**Choose kdcokenny's if:** you want auto-detection of your terminal, lifecycle hooks, file sync for complex projects, or are already using the KDCO ecosystem (cmux, workspace agents, etc.).

## License

MIT © 2026 HeberYesid

Originally inspired by [opencode-worktree-session](https://github.com/felixAnhalt/opencode-worktree-session) by Felix Anhalt.
