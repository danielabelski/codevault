# CodeVault Quick Start (5 minutes)

## Step 1: Copy Files (1 min)

Copy these 3 files to your project root:
- `codevault.html`
- `codevault-data.js`
- `setup.mjs`

## Step 2: Generate Configuration (2 min)

```bash
# Auto-detects project name and framework
node setup.mjs
```

Output will show:
```
🔍 CodeVault Setup — Scanning codebase...

Project: my-app (auto-detected)
Framework: next.js (auto-detected)

✓ Found 42 routes
✓ Found 15 API routes
✓ Found 28 database tables
✓ Found 12 server actions

✅ Generated codevault-data.js
✅ Generated LOCK_CONFIG.json
```

It auto-detects your project name from `package.json` and framework from config files. Override with flags if needed: `node setup.mjs --project-name "My App" --framework "next.js"`

## Step 3: Open CodeVault (1 min)

1. Open `codevault.html` in Chrome/Edge
2. You'll see your project structure loaded
3. Browse the tabs: Overview, Lock Grid, Architecture

## Step 4: Manage Locks (1 min)

Find something you want to protect:
1. Search for it in the sidebar (e.g., "auth")
2. Click to open the detail panel
3. Set lock states:
   - **🔒 Locked** — Don't touch
   - **⚠️ Caution** — Ask first
   - **✓ Open** — Go ahead

## That's It!

Now you have:
- ✅ Lock management UI
- ✅ 3-layer controls (UI, Logic, Data)
- ✅ Project structure mapped
- ✅ Configuration ready to commit

## Next: Connect to File (Optional)

Want auto-save to `LOCK_CONFIG.json`?

1. Click **"📁 Connect File"** in the toolbar
2. Select your `LOCK_CONFIG.json` (it will be created)
3. Changes now auto-save every 300ms

## Useful Commands

```bash
# Re-scan your codebase (after adding new files)
node setup.mjs

# Show this help
cat QUICKSTART.md
```

## Common Workflows

### Protect Critical Code

```
Search: "auth-signin"
→ Click card
→ Set all layers to 🔒 Locked
→ Done! Now locked from accidental edits
```

### Add a New Page

1. Edit `codevault-data.js`, add new route
2. Reload browser
3. Set locks as needed

### Deploy with Confidence

1. Review all locks in CodeVault
2. Export: **⬇️ Export JSON**
3. Commit `LOCK_CONFIG.json` to git
4. Team members import: **📤 Import JSON**

## Supported Frameworks

- ✅ Next.js 13+ (App Router)
- ✅ SvelteKit
- ✅ Remix
- ✅ Generic (manual config)

Others: edit `codevault-data.js` manually after running setup.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "No Data" screen | Run `node setup.mjs` first |
| Can't connect file | Use Chrome/Edge, not Firefox/Safari |
| Want to reset | Delete `codevault-data.js`, run setup again |

## Need More Help?

Read `README.md` for full documentation, API reference, and advanced features.

---

**CodeVault v1.0** — Universal lock control for production codebases.
