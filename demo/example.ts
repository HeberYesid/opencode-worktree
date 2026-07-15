/**
 * Ejemplo de uso del plugin opencode-worktree
 * 
 * Este archivo muestra cómo usar las herramientas del plugin
 * de forma programática dentro de OpenCode.
 * 
 * NOTA: Estas funciones se ejecutan dentro del contexto de OpenCode,
 * no como scripts independientes.
 */

// Ejemplo 1: Crear un worktree usando el slash command
// /wt-create feature/login wt

// Ejemplo 2: Listar worktrees activos
// /wt-list

// Ejemplo 3: Eliminar un worktree
// /wt-delete Feature completada

// Ejemplo 4: Configuración personalizada
const configEjemplo = {
  defaultTerminal: "pwsh",
  worktreePath: "C:\\wt", // Ruta corta para Windows
  terminals: {
    wt: ["wt.exe", "-d", "{cwd}", "cmd", "/k", "{cmd}"],
    pwsh: ["pwsh.exe", "-NoExit", "-Command", "Set-Location \"{cwd}\"; {cmd}"],
    cmd: ["cmd.exe", "/c", "start", "", "cmd", "/k", "cd /d \"{cwd}\" && {cmd}"]
  }
}
