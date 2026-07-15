# opencode-worktree

OpenCode plugin for git worktrees with terminal chooser.

Pick your terminal — Windows Terminal, pwsh, cmd, Terminal.app, iTerm2, gnome-terminal — or define custom templates via JSONC config.

## Features

- **Terminal picker** — choose which terminal opens per worktree
- **Custom templates** — define your own terminal launch commands with `{cwd}` and `{cmd}` placeholders
- **Cross-platform** — Windows, macOS, and Linux with sensible defaults
- **Minimalist** — JSON state, no SQLite, no session forking
- **Slash commands** — `/wt-create`, `/wt-delete`, `/wt-list` for natural interaction

## Requirements

- [Bun](https://bun.sh) (openCode's runtime)
- [openCode](https://opencode.ai) with `@opencode-ai/plugin` >= 1.16
- Git 2.5+

## Installation

### Option A — Clone to plugins directory (recommended)

```bash
git clone https://github.com/heberyesid/opencode-worktree.git ~/.config/opencode/plugins/worktree-pick
```

Then install the opencode plugin dependencies:

```bash
cd ~/.config/opencode
bun install
```

Restart opencode — the plugin loads automatically.


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
| `ws-dev` | Windows Terminal (profile "Dev") |
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

## License

MIT © 2026 HeberYesid

Originally inspired by [opencode-worktree-session](https://github.com/felixAnhalt/opencode-worktree-session) by Felix Anhalt.
