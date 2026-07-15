# Demo en acción: opencode-worktree

## Escenario: Desarrollo de una nueva feature

### Paso 1: Crear worktree para la feature

```bash
/wt-create feature/user-auth pwsh
```

**Resultado:**
```
✅ Worktree created at C:\Users\HeberYesid\opencode-worktrees\abc12345\feature\user-auth
Terminal "pwsh" opened with opencode.
```

### Paso 2: Verificar el worktree

```bash
/wt-list
```

**Resultado:**
```
| branch | path | terminal | createdAt |
|---|---|---|---|
| feature/user-auth | C:\Users\HeberYesid\opencode-worktrees\abc12345\feature\user-auth | pwsh | 2026-07-15T12:30:00Z |
```

### Paso 3: Desarrollar en el worktree

El terminal se abre automáticamente en el worktree con `opencode` listo para usar.

### Paso 4: Limpiar cuando termine

```bash
/wt-delete Feature completada y probada
```

**Resultado:**
```
✅ Worktree "feature/user-auth" deleted.
Reason: Feature completada y probada
```

## Ventajas

- **Aislamiento**: Cada feature tiene su propio directorio
- **Flexibilidad**: Elige tu terminal favorito
- **Automatización**: Snapshot automático antes de eliminar
- **Cross-platform**: Funciona en Windows, macOS y Linux
