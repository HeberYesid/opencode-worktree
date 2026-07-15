@echo off
REM Demo: opencode-worktree Plugin
REM Este script muestra cómo usar los slash commands del plugin

echo ========================================
echo Demo: opencode-worktree Plugin
echo ========================================
echo.

echo 1. Crear un worktree:
echo    /wt-create feature/auth wt
echo.

echo 2. Listar worktrees activos:
echo    /wt-list
echo.

echo 3. Eliminar un worktree:
echo    /wt-delete Feature completada
echo.

echo ========================================
echo Configuracion: .opencode/worktree-pick.jsonc
echo ========================================
echo.
echo Ejemplo de configuracion:
echo {
echo   "defaultTerminal": "wt",
echo   "worktreePath": null,
echo   "terminals": {
echo     "wt": ["wt.exe", "-d", "{cwd}", "cmd", "/k", "{cmd}"],
echo     "pwsh": ["pwsh.exe", "-NoExit", "-Command", "Set-Location \"{cwd}\"; {cmd}"]
echo   }
echo }
echo.

pause
