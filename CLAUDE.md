# CodeVault — AI Agent Setup & Enforcement

## QUICK SETUP (Run this automatically on first use)

If `LOCK_CONFIG.json` does NOT exist in this project's root, run the CodeVault scanner to generate it:

```bash
cd <project-root>
node <path-to-codevault>/setup.mjs --project-name "Project Name" --framework "next.js"
```

**Framework options:** `next.js`, `sveltekit`, `remix`, `generic`

This scans the codebase and generates two files:
- `codevault-data.js` — Visual dashboard data (for the CodeVault UI)
- `LOCK_CONFIG.json` — Lock enforcement config (for AI agents like you)

If `LOCK_CONFIG.json` already exists, skip the scan and proceed to enforcement below.

## AUTO-SETUP INSTRUCTIONS FOR AI AGENTS

When a user points you at a codebase that contains CodeVault files (`codevault.html`, `setup.mjs`), do the following automatically:

1. **Detect the framework** by checking for:
   - `next.config.*` → `next.js`
   - `svelte.config.*` → `sveltekit`
   - `remix.config.*` → `remix`
   - Otherwise → `generic`

2. **Detect the project name** from `package.json` → `name` field

3. **Run the scanner:**
   ```bash
   node setup.mjs --project-name "<detected-name>" --framework "<detected-framework>"
   ```

4. **Confirm output** — Tell the user what was found (X routes, X APIs, X tables, X server actions) and that `LOCK_CONFIG.json` was generated with everything locked by default.

5. **Instruct the user** to open `codevault.html` in their browser to visually manage locks.

## FILE LOCK ENFORCEMENT — MANDATORY

Once `LOCK_CONFIG.json` exists, follow the rules in `CLAUDE_LOCK_RULES.md` exactly. The short version:

- **Before editing ANY file**, check `LOCK_CONFIG.json` for the target file's lock state
- Three layers: **UI** (visual), **Logic** (business rules), **Data** (database)
- Three states: **locked** (refuse), **caution** (ask first), **open** (proceed)
- If ANY affected layer is locked, refuse the edit entirely
- After the user unlocks something via the CodeVault UI, re-read `LOCK_CONFIG.json`

## WHAT IS CODEVAULT?

CodeVault is a single-file HTML dashboard that gives developers visual, three-layer lock control over their codebase. It prevents AI agents from accidentally modifying protected code by generating a `LOCK_CONFIG.json` that agents read before making changes.

**Key features:**
- Lock grid with per-file, per-layer toggles
- Architecture graph (interactive D3 visualization)
- Data flow view (routes → functions → tables)
- Audit log of all lock/unlock actions
- Export to `LOCK_CONFIG.json` for CI/CD and AI enforcement
- File System Access API for auto-save to disk
