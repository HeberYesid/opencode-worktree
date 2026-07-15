---
description: Crea un git worktree en la rama indicada y abre el terminal elegido.
agent: build
---

Crea un worktree para la rama **$ARGUMENTS**.

Instrucciones:
1. Si $1 está vacío, pide al usuario el nombre de la rama.
2. Si $2 (segunda palabra) parece un nombre de terminal (wt, pwsh, cmd, wt-dev, terminal, iterm, gnome, etc.), pásalo como argumento `terminal` al tool `worktree_create`. Si no, omite `terminal` para usar el default de config.
3. Llama al tool `worktree_create` con `branch=$1` y opcionalmente `terminal=$2`.
4. Retorna el resultado al usuario.
