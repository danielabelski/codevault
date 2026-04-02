# CodeVault v1.0

**Universal lock control system for production-ready codebases.**

CodeVault is a generic, self-contained tool that brings three-layer lock control to any project. It lets you define which files/routes/APIs are locked (do not modify), under caution (ask first), or open (modify freely) — across UI, Logic, and Data layers.

## What It Does

CodeVault manages a `LOCK_CONFIG.json` file in your project that specifies:

- **UI Layer:** Visual layout, styling, CSS classes, component structure, HTML/JSX markup
- **Logic Layer:** Business rules, validation, calculations, workflows, state management
- **Data Layer:** Database queries, API calls, data schemas, request/response shapes

For each route, API endpoint, database table, and server action, you set the lock state:

- **🔒 Locked:** Do not modify. Refuse the change.
- **⚠️ Caution:** Ask first. Require explicit confirmation before editing.
- **✓ Open:** Proceed freely.

## Files Included

### `codevault.html`
The main single-page application. All-in-one: no installation needed. Drop it in your project.

**Features:**
- 5 view tabs: Overview, Lock Grid, Architecture (auto-generated from your data)
- Search and filter across all items
- Three-layer lock controls per item (UI, Logic, Data)
- File System Access API integration for auto-save/auto-refresh of `LOCK_CONFIG.json`
- Light/dark mode toggle
- Export/import lock configurations
- localStorage persistence of layout positions (for visualization views)
- Full localStorage-based layout memory for complex views

### `codevault-data.js`
Auto-generated configuration file that defines the structure of your codebase.

Contains:
- `routes`: Your application's pages/routes
- `apiRoutes`: API endpoints
- `tables`: Database tables
- `serverActions`: Server-side action files
- `projectName`: Your project name
- `framework`: Framework type (next.js, sveltekit, remix, generic)

### `setup.mjs`
Node.js script that scans your codebase and generates `codevault-data.js`.

**Supported frameworks:**
- Next.js 13+ (App Router)
- SvelteKit
- Remix
- Generic (manual configuration)

## Getting Started

### 1. Add Files to Your Project

Copy these three files to your project:
- `codevault.html`
- `codevault-data.js`
- `setup.mjs`

They should be in the same directory. Suggested location: project root or `/admin/tools/codevault/`.

### 2. Generate Your Configuration

```bash
# Auto-detect everything (recommended)
node setup.mjs

# Or override with manual flags
node setup.mjs --project-name "My Project" --framework "next.js"
```

The script auto-detects your project name from `package.json` and your framework from config files (`next.config.*`, `svelte.config.*`, `remix.config.*`, etc.). Use the flags only if auto-detection picks the wrong values.

**Options:**
- `--project-name "Name"` — Override detected project name
- `--framework "next.js"` — Override detected framework: next.js, sveltekit, remix, or generic

The script will:
- Scan your codebase for routes, API endpoints, tables, and server actions
- Generate `codevault-data.js` with auto-detected items
- Generate `LOCK_CONFIG.json` with everything locked by default
- Print a summary of what was found

### 3. Open CodeVault

Open `codevault.html` in Chrome, Edge, or any modern browser.

You'll see:
- A welcome screen if no data is loaded (run setup.mjs to fix)
- A complete lock management interface once data is loaded

### 4. Connect to LOCK_CONFIG.json (Optional)

Click the **"📁 Connect File"** button to connect to your `LOCK_CONFIG.json` file.

Once connected:
- Changes you make in CodeVault auto-save to the file (debounced by 300ms)
- External changes to the file auto-load into CodeVault (polled every 3 seconds)
- A toast notification confirms each save

Without connecting, you can still:
- Set locks in memory
- Export the configuration as JSON
- Import a previously exported JSON file

## How to Use

### Overview Tab
- See project statistics
- View lock status summary (Locked, Caution, Open counts)
- Display project info and connection status

### Lock Grid Tab
- Card-based view of all items
- Click any card to open the detail panel
- See lock status and group at a glance

### Architecture Tab
- Organized view of items grouped by category
- Click any item to open the detail panel
- Understand your system structure

### Detail Panel
- Set lock state for each layer (UI, Logic, Data)
- View item metadata (path, type, tables, functions)
- See relationships and dependencies

### Controls

**Top Toolbar:**
- **View tabs:** Switch between Overview, Lock Grid, Architecture
- **Connect File:** Enable auto-save to LOCK_CONFIG.json (File System Access API)
- **Disconnect:** Stop watching the file
- **Export JSON:** Download current locks as LOCK_CONFIG.json
- **Import JSON:** Load locks from a previously exported file
- **Theme toggle:** Light/Dark mode

**Sidebar:**
- **Search:** Find items by name, ID, or path
- **Node list:** All items in your project with lock status indicator

## Lock Configuration Format

Here's what your `LOCK_CONFIG.json` looks like:

```json
{
  "version": "1.0.0",
  "project": "My Project",
  "framework": "next.js",
  "description": "...",
  "_states": {
    "locked": "LOCKED — Do not modify...",
    "caution": "CAUTION — Ask first...",
    "open": "OPEN — Proceed freely..."
  },
  "_layers": {
    "ui": "Visual layout, styling...",
    "logic": "Business rules...",
    "data": "Database queries..."
  },
  "routes": {
    "dashboard": {
      "path": "(protected)/dashboard",
      "name": "Dashboard",
      "ui": "locked",
      "logic": "caution",
      "data": "open"
    }
  },
  "apiRoutes": { ... },
  "serverActions": { ... },
  "tables": { ... },
  "directoryRules": [
    {
      "pattern": "src/components/ui/**",
      "ui": "locked",
      "logic": "locked",
      "data": "locked",
      "note": "Shared UI component library"
    }
  ]
}
```

## Configuration Structure

### Routes (Pages)

```javascript
{
  id: "dashboard",                    // Unique identifier
  name: "Dashboard",                  // Display name
  path: "(protected)/dashboard",      // Route path
  group: "protected",                 // Group (auth, public, protected, admin, api)
  type: "page",                       // Type: "page"
  client: false,                      // Client-side rendering (true/false)
  tables: [...]                       // Tables this page reads/writes
}
```

### API Routes

```javascript
{
  id: "api-generate",
  name: "Generate Lesson",
  path: "api/ai/generate-lesson",
  group: "api",
  type: "api",
  tables: [...]
}
```

### Database Tables

```javascript
{
  id: "t-users",
  name: "users",
  domain: "Core",                     // Data domain (any label you choose)
  reads: 15,                          // Number of files that read this table
  writes: 5                           // Number of files that write to this table
}
```

### Server Actions

```javascript
{
  id: "sa-create",
  name: "create/actions.ts",
  path: "(protected)/create",
  lines: 6844,                        // Lines of code
  funcs: [
    "generateLesson",
    "generateUnit",
    "saveLessonDraft"
  ],
  tables: ["lessons", "courses", ...]
}
```

## Manual Configuration

You can manually edit `codevault-data.js` to add, remove, or modify items without running `setup.mjs`.

Add items to the appropriate array:

```javascript
window.CODEVAULT_DATA = {
  projectName: "My Project",
  framework: "next.js",

  routes: [
    {
      id: "my-page",
      name: "My Page",
      path: "/my-page",
      group: "protected",
      type: "page",
      client: false,
      tables: ["users"]
    }
  ],

  // ... other arrays
};
```

Then reload `codevault.html` in your browser.

## Features

### Dark/Light Mode
Toggle the theme in the top-right corner. Preference is stored in `localStorage`.

### Search & Filter
Type in the sidebar search box to filter items by name, ID, or path.

### File System Integration
- **Connect:** Browser asks for file permission once. After that, all changes auto-save.
- **Auto-save:** 300ms debounce prevents excessive writes during rapid changes.
- **Auto-refresh:** Polls the file every 3 seconds for external changes.
- **Connection status:** Indicator in the toolbar shows if you're connected.

### Export/Import
- **Export:** Download current lock state as `LOCK_CONFIG.json`
- **Import:** Load a previously exported JSON file to restore locks
- Useful for version control, backup, or sharing configurations

### Responsive Layout
- Works at all screen sizes
- Sidebar collapses on mobile for more space
- Optimized touch-friendly controls

## Browser Compatibility

### Required
- **Chrome 88+**
- **Edge 88+**

### Optional (File System Access)
File System Access API (auto-save) requires Chrome/Edge. Works without it if you use Export/Import instead.

### Not Supported
- Firefox (no File System Access API)
- Safari (no File System Access API)

## Workflow Example

### Scenario: Block a Critical Component

1. Open `codevault.html`
2. Search for "auth-signin" in the sidebar
3. Click the card to open the detail panel
4. Set all three layers to **🔒 Locked**
5. When someone tries to change it later, CodeVault shows:
   - "This route is LOCKED. Changes not allowed."
   - Suggests they unlock it via CodeVault first or get permission from you

### Scenario: Add a New Feature Page

1. Manually edit `codevault-data.js` and add a new route:
   ```javascript
   routes: [
     ...
     {
       id: "my-new-feature",
       name: "My Feature",
       path: "(protected)/my-feature",
       group: "protected",
       type: "page",
       client: false,
       tables: ["features"]
     }
   ]
   ```
2. Reload `codevault.html`
3. The new page appears in the list with default locks (all locked)
4. Adjust locks as needed

### Scenario: Production Release

1. Run `setup.mjs` to refresh the scan
2. Use CodeVault to review all locks
3. Export the configuration: `⬇️ Export JSON`
4. Commit `LOCK_CONFIG.json` to git as the source of truth
5. Team members import this file: `📤 Import JSON`

## AI Agent Integration

CodeVault includes built-in enforcement rules for AI coding agents (Claude Code, Cursor, Copilot, etc.).

### How It Works

1. `setup.mjs` generates `LOCK_CONFIG.json` with everything locked by default
2. `CLAUDE.md` tells AI agents to read `LOCK_CONFIG.json` before every edit
3. `CLAUDE_LOCK_RULES.md` defines the exact enforcement protocol

When an AI agent tries to modify a locked file, it will:
- **Locked:** Refuse the edit and tell you what's locked
- **Caution:** Show you the planned change and ask for confirmation
- **Open:** Proceed normally

### Setup for AI Agents

Add `CLAUDE.md` and `CLAUDE_LOCK_RULES.md` to your project root. The AI agent reads these automatically and enforces locks on every edit.

```bash
# Copy enforcement files to your project root
cp CLAUDE.md CLAUDE_LOCK_RULES.md /path/to/your/project/
```

## Architecture

### Single-File Design
`codevault.html` is self-contained:
- Includes React + ReactDOM from CDN
- Includes Babel for JSX
- Includes D3 for interactive architecture graph visualization
- All CSS is inline
- ~2,000+ lines of React code

### No Build Process
- Open in browser directly (no npm install, no webpack, no build step)
- Instant load
- Works offline after first load

### Modular Data
`codevault-data.js` is separate:
- Easy to regenerate with `setup.mjs`
- Can be version-controlled independently
- Can be shared between teams

### localStorage Persistence
- Layout positions for complex views (User Flow, Data Flow)
- Theme preference (dark/light)
- Connection state

## Troubleshooting

### "No Data Loaded" Screen

**Cause:** `codevault-data.js` not found or empty.

**Fix:**
1. Make sure `codevault-data.js` is in the same directory as `codevault.html`
2. Run `node setup.mjs` to generate it
3. Reload the browser

### File System Access API Error

**Cause:** Browser doesn't support it, or permission was denied.

**Fix:**
- Use Chrome or Edge (tested on 88+)
- If permission was denied, use **Export/Import** instead
- To reset permissions: Go to browser settings → Privacy → Site Settings → File System

### Changes Not Saving

**Cause:** Not connected to the file, or auto-save permission denied.

**Fix:**
1. Click **"📁 Connect File"** in the toolbar
2. Browser will ask for permission — grant it
3. Select your `LOCK_CONFIG.json` file
4. Should see a toast: "✓ Saved"

### Import Not Working

**Cause:** JSON format is invalid.

**Fix:**
1. Verify the JSON is valid (use https://jsonlint.com)
2. Check that all required fields are present
3. Reload the page and try again

## API Reference (for developers)

### window.CODEVAULT_DATA

The global data object loaded from `codevault-data.js`.

```javascript
window.CODEVAULT_DATA = {
  projectName: string,
  framework: string,
  routes: Route[],
  apiRoutes: ApiRoute[],
  tables: Table[],
  serverActions: ServerAction[]
}
```

### Route Object

```javascript
{
  id: string,                    // Unique identifier
  name: string,                  // Display name
  path: string,                  // Route path
  group: 'auth' | 'public' | 'protected' | 'admin' | 'api',
  type: 'page',
  client?: boolean,              // Client-side rendering
  dynamic?: boolean,             // Dynamic route [id]
  longRunning?: boolean,         // Long-running operation
  tables?: string[]              // Table references
}
```

### Table Object

```javascript
{
  id: string,                    // Unique identifier (typically "t-{tableName}")
  name: string,                  // Table name
  domain: string,                // Data domain
  reads: number,                 // Files reading this table
  writes: number                 // Files writing this table
}
```

### Lock State Object

```javascript
{
  ui: 'locked' | 'caution' | 'open',
  logic: 'locked' | 'caution' | 'open',
  data: 'locked' | 'caution' | 'open'
}
```

## Contributing & Extending

### Modify Colors

Edit the CSS custom properties in `codevault.html`:

```css
:root {
  --locked: #DC2626;      /* Red */
  --caution: #F59E0B;     /* Amber */
  --open: #16A34A;        /* Green */
  /* ... more colors ... */
}
```

### Add New Frameworks to setup.mjs

Edit the `getFrameworkConfig` function:

```javascript
'astro': {
  scanRoutes: true,
  routePattern: 'src/pages/**/*.astro',
  // ... rest of config
}
```

### Extend for CI/CD Integration

Build a wrapper that:
1. Runs `setup.mjs` on each commit
2. Exports `LOCK_CONFIG.json`
3. Checks locks during code review (AI agent can read the file)
4. Blocks PRs that violate locks

## License

CodeVault is provided as-is for managing production codebases. Use freely in your projects.

## Version

**CodeVault v1.0** — Released 2026

Universal, self-contained, framework-agnostic lock control for any project.
