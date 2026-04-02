# CodeVault v1.0 — File Index

**Location:** Your project root or `/tools/codevault/`

All files needed to run CodeVault are in this directory.

## Quick Links

**Start here:**
1. Read [`QUICKSTART.md`](QUICKSTART.md) (5 minutes)
2. Run `node setup.mjs` to scan your project
3. Open `codevault.html` in Chrome/Edge

**Deep dive:**
- [`README.md`](README.md) — Full documentation
- [`MANIFEST.md`](MANIFEST.md) — Complete feature list

## Core Files

| File | Size | Purpose |
|------|------|---------|
| `codevault.html` | 38KB | Main UI (React app, no build needed) |
| `codevault-data.js` | 1.6KB | Data config (auto-generated) |
| `setup.mjs` | 6.7KB | Codebase scanner |

## Documentation

| File | Read Time | Purpose |
|------|-----------|---------|
| `QUICKSTART.md` | 5 min | Get started in 5 minutes |
| `README.md` | 20 min | Complete user guide |
| `MANIFEST.md` | 10 min | Feature inventory & testing notes |
| `INDEX.md` | 2 min | This file |

## Setup Files

| File | Purpose |
|------|---------|
| `package.json` | NPM metadata + convenient scripts |

## What It Does

CodeVault is a **lock control system** for your codebase. It helps you:

- Define which parts of your code are **locked** (do not modify)
- Mark others as **caution** (ask first)
- Leave the rest as **open** (modify freely)

Locks work across 3 layers:
- **UI:** Styling, layout, visual components
- **Logic:** Business rules, calculations, workflows
- **Data:** Database queries, API calls, schemas

## Installation

### 1. Copy Files
```bash
# In your project root
cp codevault.html codevault-data.js setup.mjs .
```

### 2. Generate Configuration
```bash
node setup.mjs --project-name "My Project" --framework "next.js"
```

### 3. Open CodeVault
```bash
# Open in browser
open codevault.html
# or
start codevault.html
```

## Usage

1. **Browse** your project structure in the sidebar
2. **Search** for items by name or path
3. **Select** an item to see full details
4. **Set locks** for each layer (UI, Logic, Data)
5. **Connect** to LOCK_CONFIG.json for auto-save
6. **Export/Import** configurations as needed

## Key Features

- ✅ No installation (open HTML in browser)
- ✅ No build step (React from CDN)
- ✅ Auto-scans Next.js, SvelteKit, Remix
- ✅ 3-layer lock control (UI, Logic, Data)
- ✅ 5 view tabs (Overview, Grid, Architecture)
- ✅ File System Access API (auto-save to disk)
- ✅ Export/import lock configurations
- ✅ Light/dark theme
- ✅ Mobile-responsive
- ✅ localStorage persistence

## Browser Support

- ✅ Chrome 88+
- ✅ Edge 88+
- ⚠️ Firefox (no File API, use Export/Import)
- ⚠️ Safari (no File API, use Export/Import)

## Framework Support

- ✅ Next.js 13+ (App Router)
- ✅ SvelteKit
- ✅ Remix
- ✅ Generic (manual config)

## Command Reference

```bash
# Generic setup (no auto-scanning)
node setup.mjs

# Next.js project
node setup.mjs --project-name "My App" --framework "next.js"

# SvelteKit project
node setup.mjs --project-name "My App" --framework "sveltekit"

# Remix project
node setup.mjs --project-name "My App" --framework "remix"

# With npm (if installed)
npm run setup:next
npm run setup:sveltekit
npm run setup:remix
```

## File Sizes

```
codevault.html      38 KB  (Single React app)
setup.mjs           6.7 KB (Codebase scanner)
codevault-data.js   1.6 KB (Data config)
README.md           14 KB  (Documentation)
MANIFEST.md         9 KB   (Feature list)
QUICKSTART.md       2.6 KB (Quick start)
package.json        1.1 KB (NPM metadata)
────────────────────────────
TOTAL               72.9 KB
```

All files together are **smaller than a single image** in most web projects.

## What's Inside codevault.html

A self-contained React application with:

- ~1000 lines of React/JSX code
- Complete CSS styling (no external stylesheets)
- React + ReactDOM from CDN (no build)
- Babel transpiler from CDN (runtime JSX compilation)
- D3 from CDN (reserved for visualization features)
- Full localStorage API integration
- File System Access API for auto-save

**No build process. No npm install. Just open in browser.**

## Troubleshooting

**Q: "No Data" screen when I open codevault.html**
A: Run `node setup.mjs` to generate codevault-data.js

**Q: File System Access API errors**
A: Only works in Chrome/Edge. Use Export/Import in other browsers.

**Q: I edited codevault-data.js manually**
A: Reload codevault.html in your browser to see changes.

**Q: How do I reset everything?**
A: Delete codevault-data.js and run setup.mjs again.

**Q: Can I use this in a team?**
A: Yes! Export configuration and share, or both connect to same LOCK_CONFIG.json via File API.

## See Also

- **QUICKSTART.md** — 5-minute quick start
- **README.md** — Full documentation
- **MANIFEST.md** — Complete features + testing notes

## Support

For issues or feature requests, refer to:
1. README.md Troubleshooting section
2. QUICKSTART.md Troubleshooting table
3. MANIFEST.md Known Limitations

---

**CodeVault v1.0** — Universal lock control for production codebases.

Ready to use. No setup required beyond `node setup.mjs`.

Last updated: 2026-04-01
