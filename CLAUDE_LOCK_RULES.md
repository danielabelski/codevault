# FILE LOCK ENFORCEMENT — MANDATORY READ BEFORE ANY CODE CHANGE

**Before modifying ANY file in this codebase, you MUST read `LOCK_CONFIG.json` in the repo root and check the lock state of the target file.** This is non-negotiable and applies to every Claude session (Cowork and Claude Code alike).

## How It Works

`LOCK_CONFIG.json` maps every route, server action, API endpoint, database table, and directory pattern to a three-layer lock state:

- **UI layer** — Controls visual elements: styling, CSS/Tailwind classes, component JSX structure, layout, HTML markup, spacing, colors, icons
- **Logic layer** — Controls business rules: validation, calculations, state management, event handlers, workflows, conditionals, algorithms
- **Data layer** — Controls data operations: database queries, API request/response shapes, data transformations

Each layer has one of three states:

| State | What You Do |
|-------|-------------|
| **locked** | **DO NOT MODIFY.** Refuse the change. Tell the user what's locked and why. Suggest they unlock it via the CodeVault UI first. |
| **caution** | **ASK FIRST.** Show the user exactly what you plan to change, explain which locked layer it touches, and wait for explicit "yes, proceed" before editing. |
| **open** | **PROCEED NORMALLY.** You can modify this layer freely. |

## Enforcement Rules (Strictly Followed)

1. **Before every file edit**, resolve the file path against `LOCK_CONFIG.json`:
   - Check `routes`, `serverActions`, `apiRoutes` by matching the file path
   - Check `tables` if modifying any database query (the table name in `.from('table_name')`, model references, etc.)
   - Check `directoryRules` for glob pattern matches
2. **Determine which layer your change affects:**
   - Changing a className, Tailwind class, JSX layout, or CSS → **UI layer**
   - Changing an if/else, validation, calculation, handler, or workflow → **Logic layer**
   - Changing a database query, adding/removing columns, modifying API shapes → **Data layer**
3. **If ANY affected layer is `locked`:** Refuse. Do not make the change. Explain clearly.
4. **If ANY affected layer is `caution`:** Describe the exact change and ask for confirmation.
5. **If ALL affected layers are `open`:** Proceed normally.
6. **When a single edit spans multiple layers** (e.g., adding a new form field touches UI + Logic + Data), ALL three layers must be open or caution. One locked layer blocks the entire edit.
7. **New files** in a locked directory (matched by `directoryRules` glob patterns) are also blocked.
8. **After the user unlocks something**, re-read `LOCK_CONFIG.json` to pick up the change.

## Quick Examples

```
User says: "Fix the spacing on the Dashboard cards"
→ Check routes for dashboard → UI layer → if locked, REFUSE.

User says: "Change how grades are calculated"
→ Check serverActions for grades → Logic layer → if locked, REFUSE.

User says: "Add a new column to the users table"
→ Check tables for users → Data layer → if locked, REFUSE.
```

## Managing Locks

Lock states can be changed via:
1. **CodeVault UI** — Open `codevault.html`, connect to `LOCK_CONFIG.json`, toggle locks visually
2. **Direct edit** — Edit `LOCK_CONFIG.json` manually
3. **Re-scan** — Run `node setup.mjs` to regenerate from the current codebase (resets all to locked)
