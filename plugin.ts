/**
 * OpenCode Worktree Plugin
 *
 * Creates isolated git worktrees for AI development sessions
 * with flexible terminal chooser — Windows Terminal, pwsh, cmd,
 * Terminal.app, gnome-terminal, or custom templates.
 *
 * Compatible with opencode vanilla (no session fork, no SQLite).
 * State in JSON. Minimalist. Cross-platform.
 *
 * Inspired by opencode-worktree-session by Felix Anhalt
 * https://github.com/felixAnhalt/opencode-worktree-session
 * License: MIT
 */

import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import { type Plugin, tool } from "@opencode-ai/plugin"
import { z } from "zod"

// =============================================================================
// PLATFORM
// =============================================================================

const OS: "win32" | "darwin" | "linux" = process.platform as never
const IS_WINDOWS = OS === "win32"

// =============================================================================
// PATHS
// =============================================================================

/** Shorter base path on Windows to avoid MAX_PATH issues */
const DEFAULT_WORKTREE_BASE = IS_WINDOWS
	? path.join(os.homedir(), "opencode-worktrees")
	: path.join(os.homedir(), ".local", "share", "opencode", "worktree")

const STATE_DIR = path.join(os.homedir(), ".local", "share", "opencode", "worktree-pick")

// =============================================================================
// TERMINAL TEMPLATES
// =============================================================================

function getDefaultTerminals(): Record<string, string[]> {
	if (IS_WINDOWS) {
		return {
			wt: ["wt.exe", "-d", "{cwd}", "cmd", "/k", "{cmd}"],
			pwsh: ["pwsh.exe", "-NoExit", "-Command", 'Set-Location "{cwd}"; {cmd}'],
			cmd: ["cmd.exe", "/c", "start", "", "cmd", "/k", 'cd /d "{cwd}" && {cmd}'],
		}
	}
	if (OS === "darwin") {
		return {
			terminal: [
				"osascript",
				"-e",
				'tell application "Terminal" to do script "cd \'{cwd}\' && {cmd}"',
			],
			iterm: [
				"osascript",
				"-e",
				'tell application "iTerm" to tell current window to create tab with default profile command "cd \'{cwd}\' && {cmd}"',
			],
		}
	}
	// linux
	return {
		gnome: ["gnome-terminal", "--", "bash", "-c", "cd '{cwd}' && {cmd}; exec bash"],
	}
}

// =============================================================================
// VALIDATION
// =============================================================================

function isValidBranchName(name: string): boolean {
	for (let i = 0; i < name.length; i++) {
		const code = name.charCodeAt(i)
		if (code <= 0x1f || code === 0x7f) return false
	}
	if (/[~^:?*[\]\\;&|`$()]/.test(name)) return false
	return true
}

const branchNameSchema = z
	.string()
	.min(1, "Branch name cannot be empty")
	.refine((n) => !n.startsWith("-"), { message: "Cannot start with '-'" })
	.refine((n) => !n.startsWith("/") && !n.endsWith("/"), { message: "Cannot start/end with '/'" })
	.refine((n) => !n.includes("//"), { message: "Cannot contain '//'" })
	.refine((n) => !n.includes("@{"), { message: "Cannot contain '@{'" })
	.refine((n) => !n.includes(".."), { message: "Cannot contain '..'" })
	.refine((n) => !/[\x00-\x1f\x7f ~^:?*[\]\\]/.test(n), { message: "Invalid characters" })
	.max(255, "Too long")
	.refine((n) => isValidBranchName(n), "Invalid git ref chars")
	.refine((n) => !n.startsWith(".") && !n.endsWith("."), "Cannot start/end with dot")
	.refine((n) => !n.endsWith(".lock"), "Cannot end with .lock")

// =============================================================================
// CONFIG
// =============================================================================

const terminalsSchema = z.record(z.string(), z.array(z.string()))

const worktreePickConfigSchema = z.object({
	defaultTerminal: z.string().optional(),
	worktreePath: z.string().nullable().default(null),
	terminals: terminalsSchema.default(() => getDefaultTerminals()),
})

type WorktreePickConfig = z.infer<typeof worktreePickConfigSchema>

function resolveHomePath(p: string): string {
	if (p === "~" || p.startsWith("~/") || p.startsWith("~\\")) {
		return path.join(os.homedir(), p.slice(1))
	}
	return p
}

function configComment(): string {
	const examples = IS_WINDOWS
		? [
				`    "wt":     ["wt.exe",   "-d",  "{cwd}", "cmd", "/k", "{cmd}"],`,
				`    "wt-dev": ["wt.exe",   "-p",  "Dev", "-d", "{cwd}", "cmd", "/k", "{cmd}"],`,
				`    "pwsh":   ["pwsh.exe", "-NoExit", "-Command", "Set-Location \\"{cwd}\\"; {cmd}"],`,
				`    "cmd":    ["cmd.exe",  "/c", "start", "", "cmd", "/k", "cd /d \\"{cwd}\\" && {cmd}"]`,
			]
		: OS === "darwin"
			? [
					`    "terminal": ["osascript", "-e", "tell application \\"Terminal\\" to do script \\"cd '{cwd}' && {cmd}\\""],`,
					`    "iterm":    ["osascript", "-e", "tell application \\"iTerm\\" to tell current window to create tab with default profile command \\"cd '{cwd}' && {cmd}\\""]`,
				]
			: [
					`    "gnome":  ["gnome-terminal", "--", "bash", "-c", "cd '{cwd}' && {cmd}; exec bash"],`,
					`    "konsole": ["konsole", "-e", "bash", "-c", "cd '{cwd}' && {cmd}; exec bash"]`,
				]

	return examples.map((l) => `  // ${l}`).join("\n")
}

async function loadConfig(projectDir: string): Promise<WorktreePickConfig> {
	const configPath = path.join(projectDir, ".opencode", "worktree-pick.jsonc")

	try {
		const file = Bun.file(configPath)
		if (!(await file.exists())) {
			const terminalKey = IS_WINDOWS ? "wt" : OS === "darwin" ? "terminal" : "gnome"
			const defaultConfig = `{
  // Worktree Pick plugin config
  // Default terminal: set to any key from "terminals" below
  "defaultTerminal": "${terminalKey}",

  // Base path for worktrees (null = platform default)
  // Windows: ~/opencode-worktrees
  // macOS/Linux: ~/.local/share/opencode/worktree
  "worktreePath": null,

  // Terminal templates. {cwd} = worktree path, {cmd} = initial command.
  // Customize or add your own:
  "terminals": {
${configComment()}
  }
}
`
			await fs.mkdir(path.join(projectDir, ".opencode"), { recursive: true })
			await Bun.write(configPath, defaultConfig)
			return worktreePickConfigSchema.parse({})
		}

		const content = await file.text()
		const cleaned = content.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
		const parsed = JSON.parse(cleaned)
		return worktreePickConfigSchema.parse(parsed)
	} catch {
		return worktreePickConfigSchema.parse({})
	}
}

// =============================================================================
// STATE
// =============================================================================

interface WorktreeEntry {
	branch: string
	path: string
	terminal: string
	createdAt: string
	sessionId: string | null
}

async function getProjectId(projectRoot: string): Promise<string> {
	try {
		const proc = Bun.spawn(["git", "-C", projectRoot, "rev-list", "--max-parents=0", "HEAD"], {
			stdout: "pipe",
			stderr: "pipe",
		})
		const [stdout, , exitCode] = await Promise.all([
			new Response(proc.stdout).text(),
			new Response(proc.stderr).text(),
			proc.exited,
		])
		if (exitCode === 0) {
			const sha = stdout.trim().split("\n")[0]
			if (sha && /^[0-9a-f]{40}$/.test(sha)) return sha.slice(0, IS_WINDOWS ? 8 : 16)
		}
	} catch {}
	return (await Bun.hash(projectRoot)).toString(16).slice(0, IS_WINDOWS ? 8 : 16)
}

async function getStatePath(projectRoot: string): Promise<string> {
	const projectId = await getProjectId(projectRoot)
	await fs.mkdir(STATE_DIR, { recursive: true })
	return path.join(STATE_DIR, `${projectId}.json`)
}

async function readState(projectRoot: string): Promise<WorktreeEntry[]> {
	const statePath = await getStatePath(projectRoot)
	try {
		const content = await Bun.file(statePath).text()
		const parsed = JSON.parse(content)
		return Array.isArray(parsed) ? parsed : []
	} catch {
		return []
	}
}

async function writeState(projectRoot: string, entries: WorktreeEntry[]): Promise<void> {
	const statePath = await getStatePath(projectRoot)
	await Bun.write(statePath, JSON.stringify(entries, null, 2))
}

// =============================================================================
// GIT
// =============================================================================

async function git(args: string[], cwd: string): Promise<{ ok: true; stdout: string } | { ok: false; error: string }> {
	try {
		const proc = Bun.spawn(["git", "-C", cwd, ...args], { stdout: "pipe", stderr: "pipe" })
		const [stdout, stderr, exitCode] = await Promise.all([
			new Response(proc.stdout).text(),
			new Response(proc.stderr).text(),
			proc.exited,
		])
		if (exitCode !== 0) {
			return { ok: false, error: stderr.trim() || `git ${args[0]} failed` }
		}
		return { ok: true, stdout: stdout.trim() }
	} catch (error) {
		return { ok: false, error: error instanceof Error ? error.message : String(error) }
	}
}

async function branchExists(cwd: string, branch: string): Promise<boolean> {
	const r = await git(["rev-parse", "--verify", branch], cwd)
	return r.ok
}

async function createWorktree(
	repoRoot: string,
	branch: string,
	baseBranch: string | undefined,
	basePath: string | null,
): Promise<{ ok: true; worktreePath: string } | { ok: false; error: string }> {
	const projectId = await getProjectId(repoRoot)
	const root = basePath ?? DEFAULT_WORKTREE_BASE
	const worktreePath = path.join(root, projectId, branch)

	try {
		await fs.mkdir(path.dirname(worktreePath), { recursive: true })
	} catch {}

	const exists = await branchExists(repoRoot, branch)
	const result = exists
		? await git(["worktree", "add", worktreePath, branch], repoRoot)
		: await git(["worktree", "add", "-b", branch, worktreePath, baseBranch ?? "HEAD"], repoRoot)

	if (!result.ok) return { ok: false, error: result.error }
	return { ok: true, worktreePath }
}

async function removeWorktree(repoRoot: string, worktreePath: string): Promise<{ ok: true } | { ok: false; error: string }> {
	const r = await git(["worktree", "remove", "--force", worktreePath], repoRoot)
	if (r.ok) return { ok: true }

	// On Windows, "Filename too long" can happen. Fall back to prune + manual delete.
	if (IS_WINDOWS && r.error.toLowerCase().includes("filename too long")) {
		try {
			await fs.rm(worktreePath, { recursive: true, force: true })
			await git(["worktree", "prune"], repoRoot)
			return { ok: true }
		} catch (e) {
			return { ok: false, error: `Path too long. Run: git worktree prune && Remove-Item -Recurse -Force "${worktreePath}"` }
		}
	}
	return { ok: false, error: r.error }
}

async function listWorktrees(repoRoot: string): Promise<{ branch: string; path: string; head: string }[]> {
	const r = await git(["worktree", "list", "--porcelain"], repoRoot)
	if (!r.ok) return []
	const blocks = r.stdout.split("\n\n")
	const out: { branch: string; path: string; head: string }[] = []
	for (const block of blocks) {
		const lines = block.trim().split("\n").filter(Boolean)
		if (lines.length === 0) continue
		let wtPath = ""
		let head = ""
		let branch = ""
		for (const line of lines) {
			if (line.startsWith("worktree ")) wtPath = line.slice("worktree ".length)
			else if (line.startsWith("HEAD ")) head = line.slice("HEAD ".length)
			else if (line.startsWith("branch ")) branch = line.slice("branch ".length)
		}
		if (wtPath) out.push({ branch: branch || path.basename(wtPath), path: wtPath, head })
	}
	return out
}

// =============================================================================
// ESCAPING
// =============================================================================

function escapeBatch(s: string): string {
	return s.replace(/"/g, '""').replace(/&/g, "^&").replace(/[<>]/g, (m) => (m === "<" ? "^<" : "^>"))
}

function escapeSh(s: string): string {
	return s.replace(/'/g, "'\\''")
}

function escapeForTemplate(value: string): string {
	return IS_WINDOWS ? escapeBatch(value) : escapeSh(value)
}

// =============================================================================
// TERMINAL LAUNCHER
// =============================================================================

interface LaunchResult {
	success: boolean
	error?: string
}

async function launchTerminal(
	terminalName: string,
	cwd: string,
	argv: string[] | undefined,
	config: WorktreePickConfig,
): Promise<LaunchResult> {
	const template = config.terminals[terminalName]
	if (!template) {
		const available = Object.keys(config.terminals).join(", ")
		return { success: false, error: `Terminal "${terminalName}" not found. Available: ${available}` }
	}

	const escapedCwd = cwd
	const cmd = argv && argv.length > 0 ? argv.map((a) => escapeForTemplate(a)).join(" ") : ""

	const resolved = template.map((part) => part.replace("{cwd}", escapedCwd).replace("{cmd}", cmd))

	const exe = resolved[0]
	if (!exe) return { success: false, error: "Empty terminal template" }

	try {
		const proc = Bun.spawn(resolved, { detached: true, stdio: ["ignore", "ignore", "ignore"] })
		proc.unref()
		return { success: true }
	} catch (error) {
		return { success: false, error: error instanceof Error ? error.message : String(error) }
	}
}

// =============================================================================
// PLUGIN
// =============================================================================

function platformAwareDefaultTerminal(): string {
	if (IS_WINDOWS) return "wt"
	if (OS === "darwin") return "terminal"
	return "gnome"
}

const WorktreePlugin: Plugin = async (ctx) => {
	const { directory, client } = ctx

	const log = {
		info: (msg: string) => client.app.log({ body: { service: "worktree-pick", level: "info", message: msg } }).catch(() => {}),
		warn: (msg: string) => client.app.log({ body: { service: "worktree-pick", level: "warn", message: msg } }).catch(() => {}),
		error: (msg: string) => client.app.log({ body: { service: "worktree-pick", level: "error", message: msg } }).catch(() => {}),
	}

	return {
		tool: {
			worktree_create: tool({
				description:
					"Create a new git worktree for isolated development and open a chosen terminal in it. " +
					"A new opencode instance will start in the worktree.",
				args: {
					branch: tool.schema.string().describe("Branch name for the worktree (e.g. 'feature/dark-mode')"),
					baseBranch: tool.schema.string().optional().describe("Base branch to create from (defaults to HEAD)"),
					terminal: tool.schema
						.string()
						.optional()
						.describe(`Terminal launcher name from config. Defaults to "${platformAwareDefaultTerminal()}".`),
				},
				async execute(args, toolCtx) {
					const branchResult = branchNameSchema.safeParse(args.branch)
					if (!branchResult.success) {
						return `❌ Invalid branch name: ${branchResult.error.issues[0]?.message}`
					}
					if (args.baseBranch) {
						const baseResult = branchNameSchema.safeParse(args.baseBranch)
						if (!baseResult.success) return `❌ Invalid base branch: ${baseResult.error.issues[0]?.message}`
					}

					const config = await loadConfig(directory)
					const terminal = args.terminal ?? config.defaultTerminal ?? platformAwareDefaultTerminal()

					const created = await createWorktree(directory, args.branch, args.baseBranch, config.worktreePath ? resolveHomePath(config.worktreePath) : null)
					if (!created.ok) {
						return `❌ Failed to create worktree: ${created.error}`
					}

					const launch = await launchTerminal(terminal, created.worktreePath, ["opencode"], config)
					if (!launch.success) {
						return `⚠️ Worktree created at ${created.worktreePath} but terminal "${terminal}" failed: ${launch.error}`
					}

					const entries = await readState(directory)
					entries.push({
						branch: args.branch,
						path: created.worktreePath,
						terminal,
						createdAt: new Date().toISOString(),
						sessionId: toolCtx.sessionID ?? null,
					})
					await writeState(directory, entries)

					log.info(`Worktree created: ${created.worktreePath} (terminal: ${terminal})`)
					return `✅ Worktree created at ${created.worktreePath}\nTerminal "${terminal}" opened with opencode.`
				},
			}),

			worktree_delete: tool({
				description:
					"Delete the worktree associated with this session. Commits pending changes before removal.",
				args: {
					reason: tool.schema.string().describe("Brief explanation of why you are calling this tool"),
					branch: tool.schema.string().optional().describe("Branch name to delete (if not the current session's)"),
				},
				async execute(args, toolCtx) {
					const entries = await readState(directory)
					let entry: WorktreeEntry | undefined
					if (args.branch) {
						entry = entries.find((e) => e.branch === args.branch)
					} else {
						entry = entries.find((e) => e.sessionId === toolCtx.sessionID) ?? entries[entries.length - 1]
					}
					if (!entry) {
						return `❌ No worktree found for ${args.branch ? `branch "${args.branch}"` : "this session"}`
					}

					const addR = await git(["add", "-A"], entry.path)
					if (!addR.ok) log.warn(`git add failed: ${addR.error}`)
					const commitR = await git(["commit", "-m", "chore(worktree): session snapshot", "--allow-empty"], entry.path)
					if (!commitR.ok) log.warn(`git commit failed: ${commitR.error}`)

					const rmR = await removeWorktree(directory, entry.path)
					if (!rmR.ok) {
						return `❌ Failed to remove worktree: ${rmR.error}`
					}

					const next = entries.filter((e) => e.branch !== entry!.branch)
					await writeState(directory, next)

					const delBranch = await git(["branch", "-d", entry.branch], directory)
					let branchMsg = ""
					if (!delBranch.ok) {
						branchMsg = `\n⚠️ Branch "${entry.branch}" could not be deleted (may be unmerged). Remove with: git branch -D ${entry.branch}`
					}

					log.info(`Worktree deleted: ${entry.path}`)
					return `✅ Worktree "${entry.branch}" deleted.\nReason: ${args.reason}${branchMsg}`
				},
			}),

			worktree_list: tool({
				description: "List all active git worktrees for this project, including terminal used and creation time.",
				args: {},
				async execute() {
					const entries = await readState(directory)
					const gitList = await listWorktrees(directory)

					const byPath = new Map(entries.map((e) => [e.path, e]))
					const rows: string[] = []
					rows.push("| branch | path | terminal | createdAt |")
					rows.push("|---|---|---|---|")
					for (const wt of gitList) {
						const meta = byPath.get(wt.path)
						rows.push(`| ${wt.branch} | ${wt.path} | ${meta?.terminal ?? "-"} | ${meta?.createdAt ?? "unknown"} |`)
					}
					if (rows.length === 2) rows.push("| _(none)_ | | | |")

					return rows.join("\n")
				},
			}),
		},
	}
}

export { WorktreePlugin }
export default WorktreePlugin
