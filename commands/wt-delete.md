---
description: Borra el worktree de la sesión actual (o rama indicada). Commitea y remueve.
agent: build
---

Borra el worktree actual.

Instrucciones:
1. Si $ARGUMENTS no está vacío, úsalo como `reason` y, si parece un nombre de rama, como `branch`.
2. Si no hay argumentos, pide al usuario una breve razón.
3. Llama al tool `worktree_delete` con `reason` (y opcionalmente `branch`).
4. Retorna el resultado al usuario.
