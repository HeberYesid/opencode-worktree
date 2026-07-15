# Demo: opencode-worktree Plugin

Esta demo muestra cómo usar el plugin `opencode-worktree` para crear git worktrees aislados.

## Ejemplos de uso

### 1. Crear un worktree

```bash
# Usando el slash command
/wt-create feature/auth

# Especificando terminal
/wt-create feature/auth pwsh

# Con rama base específica
/wt-create feature/auth main
```

### 2. Listar worktrees activos

```bash
/wt-list
```

Salida esperada:
```
| branch | path | terminal | createdAt |
|---|---|---|---|
| feature/auth | ~/opencode-worktrees/abc123/feature/auth | wt | 2026-07-15T12:00:00Z |
```

### 3. Eliminar un worktree

```bash
# Eliminar worktree actual
/wt-delete Feature completada

# Eliminar worktree específico
/wt-delete feature/auth Feature cancelada
```

## Configuración

El plugin crea automáticamente `.opencode/worktree-pick.jsonc`:

```jsonc
{
  "defaultTerminal": "wt",
  "worktreePath": null,
  "terminals": {
    "wt": ["wt.exe", "-d", "{cwd}", "cmd", "/k", "{cmd}"],
    "pwsh": ["pwsh.exe", "-NoExit", "-Command", "Set-Location \"{cwd}\"; {cmd}"]
  }
}
```

## Flujo de trabajo

1. **Crear**: `git worktree add` + abrir terminal en el worktree
2. **Trabajar**: Desarrollo aislado sin afectar el directorio principal
3. **Limpiar**: Snapshot automático + eliminación del worktree

## Requisitos

- Bun (runtime de OpenCode)
- Git 2.5+
- OpenCode con `@opencode-ai/plugin` >= 1.16
