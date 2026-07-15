# Demo: opencode-worktree Plugin
# Este script muestra cómo usar los slash commands del plugin

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Demo: opencode-worktree Plugin" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Crear un worktree:" -ForegroundColor Yellow
Write-Host "   /wt-create feature/auth wt"
Write-Host ""

Write-Host "2. Listar worktrees activos:" -ForegroundColor Yellow
Write-Host "   /wt-list"
Write-Host ""

Write-Host "3. Eliminar un worktree:" -ForegroundColor Yellow
Write-Host "   /wt-delete Feature completada"
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Configuracion: .opencode/worktree-pick.jsonc" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Ejemplo de configuracion:" -ForegroundColor Green
$config = @"
{
  "defaultTerminal": "wt",
  "worktreePath": null,
  "terminals": {
    "wt": ["wt.exe", "-d", "{cwd}", "cmd", "/k", "{cmd}"],
    "pwsh": ["pwsh.exe", "-NoExit", "-Command", "Set-Location `"{cwd}`"; {cmd}"]
  }
}
"@

Write-Host $config
Write-Host ""

Read-Host "Presiona Enter para continuar"
