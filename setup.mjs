#!/usr/bin/env node

/**
 * CodeVault Setup Script
 *
 * Scans your codebase and generates codevault-data.js
 * Run this from the same directory as codevault.html
 *
 * Usage:
 *   node setup.mjs [--project-name "My Project"] [--framework "next.js"]
 *   node setup.mjs --sync    (re-scan and merge new entries into existing LOCK_CONFIG.json)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { globSync } from 'glob';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cwd = process.cwd();

// Auto-detect project name from package.json
function detectProjectName() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf-8'));
    return pkg.name || 'My Project';
  } catch(e) {
    return 'My Project';
  }
}

// Auto-detect framework from config files
function detectFramework() {
  const checks = [
    { files: ['next.config.js', 'next.config.mjs', 'next.config.ts'], fw: 'next.js' },
    { files: ['svelte.config.js', 'svelte.config.ts'], fw: 'sveltekit' },
    { files: ['remix.config.js', 'remix.config.ts'], fw: 'remix' },
    { files: ['nuxt.config.js', 'nuxt.config.ts'], fw: 'nuxt' },
    { files: ['vite.config.js', 'vite.config.ts'], fw: 'react' },
  ];
  for (const check of checks) {
    for (const file of check.files) {
      if (fs.existsSync(path.join(cwd, file))) return check.fw;
    }
  }
  // Check package.json dependencies as fallback
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf-8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps.next) return 'next.js';
    if (deps.svelte || deps['@sveltejs/kit']) return 'sveltekit';
    if (deps['@remix-run/react']) return 'remix';
    if (deps.nuxt) return 'nuxt';
    if (deps.express) return 'express';
    if (deps.react) return 'react';
  } catch(e) {}
  return 'generic';
}

// Parse CLI arguments (flags override auto-detect)
const args = process.argv.slice(2);
let projectName = null;
let framework = null;

let syncMode = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--project-name' && args[i + 1]) {
    projectName = args[i + 1];
    i++;
  }
  if (args[i] === '--framework' && args[i + 1]) {
    framework = args[i + 1];
    i++;
  }
  if (args[i] === '--sync') {
    syncMode = true;
  }
}

// Auto-detect if not provided
if (!projectName) projectName = detectProjectName();
if (!framework) framework = detectFramework();

// Auto-detect mobile platform strategy
function detectMobilePlatform() {
  // Check for Capacitor (WebView wrapper)
  const capacitorConfigs = ['capacitor.config.ts', 'capacitor.config.js', 'capacitor.config.json'];
  for (const cfg of capacitorConfigs) {
    if (fs.existsSync(path.join(cwd, cfg))) return 'capacitor';
  }
  // Check for React Native / Expo
  if (fs.existsSync(path.join(cwd, 'app.json'))) {
    try {
      const appJson = JSON.parse(fs.readFileSync(path.join(cwd, 'app.json'), 'utf-8'));
      if (appJson.expo) return 'expo';
    } catch(e) {}
  }
  if (fs.existsSync(path.join(cwd, 'react-native.config.js'))) return 'react-native';
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf-8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps['react-native']) return 'react-native';
    if (deps.expo) return 'expo';
    if (deps['@capacitor/core']) return 'capacitor';
  } catch(e) {}
  // Check for native directories without config
  const hasIos = fs.existsSync(path.join(cwd, 'ios'));
  const hasAndroid = fs.existsSync(path.join(cwd, 'android'));
  if (hasIos || hasAndroid) return 'native-unknown';
  return 'web-only';
}

// Detect platform for a given route/file based on path patterns and content
function detectRoutePlatform(filePath, routePath, mobileStrategy) {
  // API routes are always backend
  if (routePath.startsWith('api/') || routePath.startsWith('api\\')) return 'backend';

  // For Capacitor apps: all web routes serve both desktop and mobile via responsive CSS
  // Native shell configs are detected separately
  if (mobileStrategy === 'capacitor') return 'web';

  // For React Native / Expo: check if file is under platform-specific directories
  const normalized = filePath.replace(/\\/g, '/').toLowerCase();
  if (normalized.includes('/ios/') || normalized.includes('.ios.')) return 'ios';
  if (normalized.includes('/android/') || normalized.includes('.android.')) return 'android';
  if (normalized.includes('/native/') || normalized.includes('/mobile/')) return 'shared'; // cross-platform mobile

  return 'web';
}

// Scan for native platform entries (Capacitor ios/ and android/ shells, RN native modules)
function scanNativePlatforms() {
  const entries = [];
  const hasIos = fs.existsSync(path.join(cwd, 'ios'));
  const hasAndroid = fs.existsSync(path.join(cwd, 'android'));

  if (hasIos) {
    entries.push({
      id: 'native-ios',
      name: 'iOS Native Shell',
      path: 'ios/',
      group: 'native',
      type: 'config',
      platform: 'ios',
      client: false,
      tables: []
    });
  }

  if (hasAndroid) {
    entries.push({
      id: 'native-android',
      name: 'Android Native Shell',
      path: 'android/',
      group: 'native',
      type: 'config',
      platform: 'android',
      client: false,
      tables: []
    });
  }

  return entries;
}

const mobileStrategy = detectMobilePlatform();

console.log('[CodeVault] Scanning codebase...\n');
console.log(`Project: ${projectName}` + (args.includes('--project-name') ? '' : ' (auto-detected)'));
console.log(`Framework: ${framework}` + (args.includes('--framework') ? '' : ' (auto-detected)'));
console.log(`Mobile: ${mobileStrategy}` + ' (auto-detected)');
console.log();

// Configuration based on framework
const config = getFrameworkConfig(framework);

// Scan the codebase
let routes = [];
let apiRoutes = [];
let tables = [];
let serverActions = [];

if (config.scanRoutes) {
  routes = scanRoutes(config);
  console.log(`  + Found ${routes.length} routes`);
}

if (config.scanApiRoutes) {
  apiRoutes = scanApiRoutes(config);
  console.log(`  + Found ${apiRoutes.length} API routes`);
}

if (config.scanTables) {
  tables = scanTables(config);
  console.log(`  + Found ${tables.length} database tables`);
}

if (config.scanServerActions) {
  serverActions = scanServerActions(config);
  console.log(`  + Found ${serverActions.length} server actions`);
}

// Scan native platform entries (Capacitor ios/android shells, etc.)
const nativePlatforms = scanNativePlatforms();
if (nativePlatforms.length > 0) {
  routes = routes.concat(nativePlatforms);
  console.log(`  + Found ${nativePlatforms.length} native platform shells`);
}

// Scan critical library files for individual lock control
const criticalLibs = scanCriticalLibraries();
if (criticalLibs.length > 0) {
  serverActions = serverActions.concat(criticalLibs);
  console.log(`  + Found ${criticalLibs.length} critical library files`);
}

// Generate output
const output = `/**
 * CodeVault Data Configuration
 * Generated by setup.mjs on ${new Date().toISOString()}
 *
 * Edit this file to manually add/remove/update items,
 * or run setup.mjs again to re-scan.
 */

window.CODEVAULT_DATA = ${JSON.stringify({
  projectName,
  framework,
  routes,
  apiRoutes,
  tables,
  serverActions
}, null, 2)};
`;

// Write to codevault-data.js
const outputPath = path.join(__dirname, 'codevault-data.js');
fs.writeFileSync(outputPath, output, 'utf-8');
console.log(`\n> Generated ${outputPath}`);

// Also generate or sync LOCK_CONFIG.json for Claude enforcement
const lockPath = path.join(process.cwd(), 'LOCK_CONFIG.json');

if (syncMode) {
  // ═══════════════════════════════════════════
  // SYNC MODE: Merge new entries into existing LOCK_CONFIG.json
  // Preserves existing lock states, adds new entries as locked, removes stale entries
  // ═══════════════════════════════════════════
  let existing = null;
  try {
    existing = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
  } catch(e) {
    console.log('\n[!] No existing LOCK_CONFIG.json found. Running full setup instead.\n');
  }

  if (existing) {
    const allScannedRoutes = new Set(routes.map(r => r.id));
    const allScannedApis = new Set(apiRoutes.map(a => a.id));
    const allScannedTables = new Set(tables.map(t => t.id));
    const allScannedActions = new Set(serverActions.map(sa => sa.id));

    let added = 0;
    let removed = 0;
    let preserved = 0;

    // Add new routes not in existing config
    routes.forEach(r => {
      if (!existing.routes[r.id]) {
        existing.routes[r.id] = { path: r.path, name: r.name, platform: r.platform || 'web', ui: 'locked', logic: 'locked', data: 'locked' };
        added++;
        console.log(`  + NEW route: ${r.name} (${r.id})`);
      } else {
        preserved++;
      }
    });

    // Add new API routes
    apiRoutes.forEach(a => {
      if (!existing.apiRoutes[a.id]) {
        existing.apiRoutes[a.id] = { path: a.path, name: a.name, platform: a.platform || 'backend', ui: 'locked', logic: 'locked', data: 'locked' };
        added++;
        console.log(`  + NEW API route: ${a.name} (${a.id})`);
      } else {
        preserved++;
      }
    });

    // Add new tables
    tables.forEach(t => {
      if (!existing.tables[t.id]) {
        existing.tables[t.id] = { path: '', name: t.name, platform: t.platform || 'shared', ui: 'locked', logic: 'locked', data: 'locked' };
        added++;
        console.log(`  + NEW table: ${t.name} (${t.id})`);
      } else {
        preserved++;
      }
    });

    // Add new server actions / library files
    serverActions.forEach(sa => {
      if (!existing.serverActions[sa.id]) {
        existing.serverActions[sa.id] = { path: sa.path, name: sa.name, platform: sa.platform || 'backend', ui: 'locked', logic: 'locked', data: 'locked' };
        if (sa.funcs) existing.serverActions[sa.id].funcs = sa.funcs;
        if (sa.group) existing.serverActions[sa.id].group = sa.group;
        added++;
        console.log(`  + NEW server action: ${sa.name} (${sa.id})`);
      } else {
        preserved++;
      }
    });

    // Detect stale entries (in config but not in scan)
    const staleRoutes = Object.keys(existing.routes || {}).filter(id => !allScannedRoutes.has(id));
    const staleApis = Object.keys(existing.apiRoutes || {}).filter(id => !allScannedApis.has(id));
    const staleTables = Object.keys(existing.tables || {}).filter(id => !allScannedTables.has(id));
    const staleActions = Object.keys(existing.serverActions || {}).filter(id => !allScannedActions.has(id));
    const totalStale = staleRoutes.length + staleApis.length + staleTables.length + staleActions.length;

    if (totalStale > 0) {
      console.log(`\n  [!] ${totalStale} stale entries detected (files no longer exist in codebase):`);
      staleRoutes.forEach(id => console.log(`    - route: ${id}`));
      staleApis.forEach(id => console.log(`    - api: ${id}`));
      staleTables.forEach(id => console.log(`    - table: ${id}`));
      staleActions.forEach(id => console.log(`    - action: ${id}`));
      console.log(`    → Stale entries are preserved (not auto-deleted). Remove manually if desired.`);
    }

    // Log sync event in _auditLog
    if (!existing._auditLog) existing._auditLog = [];
    if (added > 0) {
      existing._auditLog.push({
        timestamp: new Date().toISOString(),
        entry: 'system.sync',
        layers: ['ui', 'logic', 'data'],
        previousState: { ui: 'untracked', logic: 'untracked', data: 'untracked' },
        newState: { ui: 'locked', logic: 'locked', data: 'locked' },
        reason: `Sync detected ${added} new entries. ${totalStale} stale entries preserved.`,
        approvedBy: 'system',
        session: 'setup-sync'
      });
    }

    existing._updated = new Date().toISOString();

    fs.writeFileSync(lockPath, JSON.stringify(existing, null, 2), 'utf-8');
    console.log(`\n> Synced ${lockPath}`);
    console.log(`  ${added} new entries added (locked by default)`);
    console.log(`  ${preserved} existing entries preserved (lock states unchanged)`);
    if (totalStale > 0) console.log(`  ${totalStale} stale entries preserved (review manually)`);
  } else {
    // Fallback to full generation if no existing file
    writeFreshLockConfig();
  }
} else {
  // ═══════════════════════════════════════════
  // FRESH MODE: Generate new LOCK_CONFIG.json from scratch
  // ═══════════════════════════════════════════
  writeFreshLockConfig();
}

function writeFreshLockConfig() {
  const lockConfig = {
    _version: '1.1',
    _description: 'CodeVault Lock Configuration. Controls which files AI agents can modify. Read by CLAUDE.md enforcement rules.',
    _generated: new Date().toISOString(),
    _framework: framework,
    _mobileStrategy: mobileStrategy,
    _platforms: {
      web: 'Web application (React, Next.js, Vue, HTML/CSS, browser JS/TS)',
      ios: 'Native iOS (Swift, SwiftUI, UIKit, or Capacitor iOS shell)',
      android: 'Native Android (Kotlin, Jetpack Compose, or Capacitor Android shell)',
      backend: 'Server-side (APIs, server actions, databases, middleware)',
      shared: 'Cross-platform (utilities, types, configs, database tables)'
    },
    _states: {
      locked: 'DO NOT MODIFY — Protected from all AI changes.',
      caution: 'ASK FIRST — Require explicit user confirmation before any change.',
      open: 'EDITABLE — AI can modify freely.'
    },
    _layers: {
      ui: 'Visual layout, styling, CSS classes, component structure',
      logic: 'Business rules, validation, calculations, workflows, state management',
      data: 'Database queries, API calls, data transformations'
    },
    routes: {},
    serverActions: {},
    tables: {},
    apiRoutes: {},
    _auditLog: [],
    directoryRules: [
      { pattern: 'src/components/ui/**', ui: 'locked', logic: 'locked', data: 'locked', note: 'Shared UI components' },
      { pattern: 'src/lib/**', ui: 'locked', logic: 'locked', data: 'locked', note: 'Core library code' },
      { pattern: '*.config.*', ui: 'locked', logic: 'locked', data: 'locked', note: 'Config files' },
      { pattern: '.env*', ui: 'locked', logic: 'locked', data: 'locked', note: 'Environment variables' }
    ]
  };

  routes.forEach(r => { lockConfig.routes[r.id] = { path: r.path, name: r.name, platform: r.platform || 'web', ui: 'locked', logic: 'locked', data: 'locked' }; });
  apiRoutes.forEach(a => { lockConfig.apiRoutes[a.id] = { path: a.path, name: a.name, platform: a.platform || 'backend', ui: 'locked', logic: 'locked', data: 'locked' }; });
  tables.forEach(t => { lockConfig.tables[t.id] = { path: '', name: t.name, platform: t.platform || 'shared', ui: 'locked', logic: 'locked', data: 'locked' }; });
  serverActions.forEach(sa => {
    const entry = { path: sa.path, name: sa.name, platform: sa.platform || 'backend', ui: 'locked', logic: 'locked', data: 'locked' };
    if (sa.funcs) entry.funcs = sa.funcs;
    if (sa.group) entry.group = sa.group;
    lockConfig.serverActions[sa.id] = entry;
  });

  fs.writeFileSync(lockPath, JSON.stringify(lockConfig, null, 2), 'utf-8');
  console.log(`> Generated ${lockPath}`);
}

if (!syncMode) {
  console.log(`\nNext steps:`);
  console.log(`  1. Open codevault.html in Chrome/Edge`);
  console.log(`  2. Click "Connect File" and select LOCK_CONFIG.json`);
  console.log(`  3. Toggle locks — changes auto-save`);
  console.log(`  4. Agent lock rules auto-generated — see below\n`);
} else {
  console.log(`\nSync complete. Refresh the CodeVault dashboard to see new entries.\n`);
}

// ════════════════════════════════════════════
// UNIVERSAL AI AGENT LOCK RULES GENERATOR
// ════════════════════════════════════════════
// Generates instruction files for every major AI coding agent
// so they all respect LOCK_CONFIG.json — not just Claude.

generateAgentLockRules();

function generateAgentLockRules() {
  const totalEntries = routes.length + apiRoutes.length + tables.length + serverActions.length;

  // The core lock enforcement protocol — shared across all agents
  const lockProtocol = `## CodeVault File Lock System

This project uses CodeVault to control which files AI agents can modify. Before editing ANY file, you MUST check LOCK_CONFIG.json in the project root.

### How It Works

LOCK_CONFIG.json maps every route, server action, API endpoint, and database table to a three-layer lock state:

- **UI layer** — Styling, CSS, component JSX structure, layout, HTML markup
- **Logic layer** — Business rules, validation, calculations, state management
- **Data layer** — Database queries, API calls, data transformations

Each layer has one of three states:

| State | What You Do |
|-------|-------------|
| **locked** | DO NOT MODIFY. Refuse the change. Tell the user what is locked. |
| **caution** | ASK FIRST. Show the user what you plan to change and wait for explicit approval. |
| **open** | PROCEED NORMALLY. You can modify this layer freely. |

### Enforcement Rules

1. Before every file edit, resolve the file path against LOCK_CONFIG.json:
   - Check \`routes\`, \`serverActions\`, \`apiRoutes\` by matching the file path
   - Check \`tables\` if modifying any database query
   - Check \`directoryRules\` for glob pattern matches
2. Determine which layer your change affects:
   - Changing className, CSS, layout, JSX → **UI layer**
   - Changing if/else, validation, handlers → **Logic layer**
   - Changing database queries, API calls → **Data layer**
3. If ANY affected layer is \`locked\`: REFUSE. Do not make the change.
4. If ANY affected layer is \`caution\`: Describe the change and ask for confirmation.
5. If ALL affected layers are \`open\`: Proceed normally.
6. When an edit spans multiple layers, ALL must be open or caution.

### Untracked Files

If a file is NOT in LOCK_CONFIG.json, do NOT silently proceed. Instead:
1. Add it to LOCK_CONFIG.json under the appropriate section (routes, serverActions, tables, apiRoutes)
2. Set all layers to \`locked\` by default
3. Then follow the normal lock check flow

### Pending Unlock Requests

When creating a plan that requires modifying locked files, write a \`_pendingUnlocks\` array to LOCK_CONFIG.json:
\`\`\`json
"_pendingUnlocks": [
  {
    "entry": "serverActions.sa-auth",
    "layers": ["logic", "data"],
    "reason": "Plan: Add OAuth2 support",
    "agent": "your-agent-name",
    "timestamp": "${new Date().toISOString()}"
  }
]
\`\`\`
The CodeVault dashboard will highlight these files for the user to unlock.

### Current Stats

This project has **${totalEntries} protected entries** across ${routes.length} routes, ${apiRoutes.length} API routes, ${tables.length} tables, and ${serverActions.length} server actions.
`;

  // Agent-specific wrappers
  const agents = {
    // Claude Code / Cowork
    'CLAUDE_LOCK_RULES.md': {
      content: `# CodeVault Lock Rules for Claude\n\n${lockProtocol}\n### Claude-Specific\n\n- Log all modifications to the \`_auditLog\` array in LOCK_CONFIG.json\n- Use the unlock-before-modify protocol: check → ask → log → unlock → modify → re-lock → log\n- Write pending unlock requests during plan mode\n`,
      desc: 'Claude Code / Cowork'
    },

    // Cursor
    '.cursor/rules/codevault.mdc': {
      content: `---\ndescription: CodeVault file lock enforcement rules\nglobs: **/*\nalwaysApply: true\n---\n\n${lockProtocol}`,
      desc: 'Cursor'
    },

    // Windsurf
    '.windsurfrules': {
      content: `${lockProtocol}`,
      desc: 'Windsurf'
    },

    // GitHub Copilot
    '.github/copilot-instructions.md': {
      content: `# Copilot Instructions — CodeVault Lock Enforcement\n\n${lockProtocol}`,
      desc: 'GitHub Copilot'
    },

    // Aider
    '.aider/conventions.md': {
      content: `# Aider Conventions — CodeVault Lock Enforcement\n\n${lockProtocol}`,
      desc: 'Aider'
    },

    // OpenAI Codex
    'AGENTS.md': {
      content: `# CodeVault Lock Enforcement\n\n${lockProtocol}\n### Codex-Specific\n\n- Before modifying any file, read LOCK_CONFIG.json and check the lock state\n- If a file is locked, do NOT modify it — explain what is locked and why\n- If a file is not in LOCK_CONFIG.json, add it as locked before proceeding\n- Write pending unlock requests to \`_pendingUnlocks\` in LOCK_CONFIG.json when creating plans\n- Log all modifications to the \`_auditLog\` array in LOCK_CONFIG.json\n`,
      desc: 'OpenAI Codex'
    },

    // Cline (VS Code extension)
    '.clinerules': {
      content: `${lockProtocol}`,
      desc: 'Cline'
    },

    // Amazon Q Developer
    '.amazonq/rules.md': {
      content: `# Amazon Q Developer — CodeVault Lock Enforcement\n\n${lockProtocol}`,
      desc: 'Amazon Q Developer'
    },

    // Generic / catch-all
    'AGENT_LOCK_RULES.md': {
      content: `# CodeVault Lock Rules (Universal)\n\nThis file contains lock enforcement rules for any AI coding agent.\nCopy the relevant sections into your agent's instruction file.\n\n${lockProtocol}`,
      desc: 'Generic (any agent)'
    }
  };

  console.log('\n[CodeVault] Generating AI agent lock rules...');
  let generated = 0;

  for (const [filePath, agent] of Object.entries(agents)) {
    const fullPath = path.join(cwd, filePath);
    const dir = path.dirname(fullPath);

    // Create directories if needed
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Only write if file doesn't exist or is a CodeVault-generated file
    const exists = fs.existsSync(fullPath);
    if (exists) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      // Skip if it exists and wasn't generated by CodeVault (don't overwrite user content)
      if (!content.includes('CodeVault') && !content.includes('LOCK_CONFIG')) {
        console.log(`  ~ Skipped ${filePath} (exists, not CodeVault-generated)`);
        continue;
      }
    }

    fs.writeFileSync(fullPath, agent.content, 'utf-8');
    console.log(`  + ${filePath} (${agent.desc})`);
    generated++;
  }

  console.log(`  ${generated} agent instruction files generated.`);
  console.log(`  Supported agents: Claude, Cursor, Windsurf, GitHub Copilot, OpenAI Codex, Aider, Cline, Amazon Q, Generic`);
}

// ════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════

function getFrameworkConfig(fw) {
  const configs = {
    'next.js': {
      scanRoutes: true,
      routePattern: 'app/**/page.{ts,tsx}',
      apiPattern: 'app/api/**/route.{ts,tsx}',
      scanApiRoutes: true,
      scanTables: true,
      tablePattern: 'supabase/schema.sql',
      scanServerActions: true,
      serverActionPattern: 'app/**/actions.{ts,tsx}',
    },
    'sveltekit': {
      scanRoutes: true,
      routePattern: 'src/routes/**/+page.svelte',
      apiPattern: 'src/routes/api/**/+server.{ts,js}',
      scanApiRoutes: true,
      scanTables: true,
      tablePattern: 'schema.sql',
      scanServerActions: false,
      serverActionPattern: 'src/lib/server/**/*.{ts,js}',
    },
    'remix': {
      scanRoutes: true,
      routePattern: 'app/routes/**/*.{ts,tsx}',
      apiPattern: 'app/routes/**/*.{ts,tsx}',
      scanApiRoutes: true,
      scanTables: true,
      tablePattern: 'prisma/schema.prisma',
      scanServerActions: true,
      serverActionPattern: 'app/routes/**/*.server.{ts,tsx}',
    },
    'generic': {
      scanRoutes: false,
      scanApiRoutes: false,
      scanTables: false,
      scanServerActions: false,
    }
  };
  return configs[fw] || configs.generic;
}

function scanRoutes(config) {
  const routes = [];
  const routeFiles = globSync(config.routePattern || 'app/**/page.tsx', {
    cwd: process.cwd(),
    ignore: ['node_modules/**']
  });

  routeFiles.forEach((file, i) => {
    const pathParts = file.replace(/\\/g, '/').split('/');
    const pageName = pathParts[pathParts.length - 2] || 'Home';
    const routePath = pathParts
      .slice(pathParts.indexOf('app') + 1, -1)
      .join('/') || '/';

    routes.push({
      id: `route-${i}`,
      name: pageName.charAt(0).toUpperCase() + pageName.slice(1),
      path: routePath,
      platform: detectRoutePlatform(file, routePath, mobileStrategy),
      group: 'protected',
      type: 'page',
      client: false,
      tables: []
    });
  });

  return routes;
}

function scanApiRoutes(config) {
  const routes = [];
  const apiFiles = globSync(config.apiPattern || 'app/api/**/route.tsx', {
    cwd: process.cwd(),
    ignore: ['node_modules/**']
  });

  apiFiles.forEach((file, i) => {
    const pathParts = file.replace(/\\/g, '/').split('/');
    const apiName = pathParts[pathParts.length - 2] || 'API';
    const apiPath = pathParts
      .slice(pathParts.indexOf('api') + 1, -1)
      .join('/') || 'api';

    routes.push({
      id: `api-${i}`,
      name: apiName.charAt(0).toUpperCase() + apiName.slice(1),
      path: apiPath,
      platform: 'backend',
      group: 'api',
      type: 'api',
      tables: []
    });
  });

  return routes;
}

function scanTables(config) {
  const tables = [];

  // Try to find schema files
  const schemaFiles = globSync(config.tablePattern || 'schema.sql', {
    cwd: process.cwd(),
    ignore: ['node_modules/**']
  });

  if (schemaFiles.length === 0) {
    return []; // No schema found
  }

  schemaFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');

    // Simple regex to find CREATE TABLE statements
    const tableMatches = content.matchAll(/CREATE TABLE\s+(?:public\.)?(\w+)/gi);
    for (const match of tableMatches) {
      const tableName = match[1].toLowerCase();
      tables.push({
        id: `t-${tableName}`,
        name: tableName,
        platform: 'shared',
        domain: 'Core',
        reads: 0,
        writes: 0
      });
    }
  });

  return tables;
}

/**
 * Scan critical library directories for individual file-level lock control.
 * Auto-detects common patterns across any codebase:
 * - Security / auth / encryption / crypto
 * - Payment / billing / stripe
 * - AI / ML / LLM integrations
 * - Compliance / consent / privacy
 * - Database / ORM / migrations
 * - Middleware / interceptors
 * - Logging / monitoring / analytics
 * - Notification / email / SMS services
 * - Type definitions / schemas
 * - Custom hooks (React)
 * - Admin / permission / RBAC
 * - Referral / growth systems
 */
function scanCriticalLibraries() {
  const entries = [];
  const seen = new Set();

  // Critical directory patterns to scan — these match common naming conventions
  // across React, Next.js, SvelteKit, Remix, Express, and generic Node.js projects
  const criticalPatterns = [
    // Security & Auth
    { glob: 'src/lib/security/**/*.{ts,tsx,js,jsx}', group: 'security', platform: 'shared', label: 'Security' },
    { glob: 'src/lib/auth/**/*.{ts,tsx,js,jsx}', group: 'security', platform: 'shared', label: 'Auth' },
    { glob: 'lib/security/**/*.{ts,tsx,js,jsx}', group: 'security', platform: 'shared', label: 'Security' },
    { glob: 'lib/auth/**/*.{ts,tsx,js,jsx}', group: 'security', platform: 'shared', label: 'Auth' },
    { glob: 'utils/security/**/*.{ts,tsx,js,jsx}', group: 'security', platform: 'shared', label: 'Security' },
    { glob: 'utils/auth/**/*.{ts,tsx,js,jsx}', group: 'security', platform: 'shared', label: 'Auth' },
    // Encryption & Crypto
    { glob: 'src/lib/encryption/**/*.{ts,tsx,js,jsx}', group: 'encryption', platform: 'shared', label: 'Encryption' },
    { glob: 'src/lib/crypto/**/*.{ts,tsx,js,jsx}', group: 'encryption', platform: 'shared', label: 'Crypto' },
    { glob: 'lib/encryption/**/*.{ts,tsx,js,jsx}', group: 'encryption', platform: 'shared', label: 'Encryption' },
    { glob: 'lib/crypto/**/*.{ts,tsx,js,jsx}', group: 'encryption', platform: 'shared', label: 'Crypto' },
    // Payments & Billing
    { glob: 'src/lib/stripe/**/*.{ts,tsx,js,jsx}', group: 'stripe', platform: 'backend', label: 'Stripe' },
    { glob: 'src/lib/payments/**/*.{ts,tsx,js,jsx}', group: 'payments', platform: 'backend', label: 'Payments' },
    { glob: 'src/lib/billing/**/*.{ts,tsx,js,jsx}', group: 'payments', platform: 'backend', label: 'Billing' },
    { glob: 'lib/stripe/**/*.{ts,tsx,js,jsx}', group: 'stripe', platform: 'backend', label: 'Stripe' },
    { glob: 'lib/payments/**/*.{ts,tsx,js,jsx}', group: 'payments', platform: 'backend', label: 'Payments' },
    // AI & ML
    { glob: 'src/lib/ai/**/*.{ts,tsx,js,jsx}', group: 'ai', platform: 'shared', label: 'AI' },
    { glob: 'src/lib/ml/**/*.{ts,tsx,js,jsx}', group: 'ai', platform: 'shared', label: 'ML' },
    { glob: 'src/lib/llm/**/*.{ts,tsx,js,jsx}', group: 'ai', platform: 'shared', label: 'LLM' },
    { glob: 'lib/ai/**/*.{ts,tsx,js,jsx}', group: 'ai', platform: 'shared', label: 'AI' },
    // Compliance & Consent
    { glob: 'src/lib/compliance/**/*.{ts,tsx,js,jsx}', group: 'compliance', platform: 'shared', label: 'Compliance' },
    { glob: 'src/lib/consent/**/*.{ts,tsx,js,jsx}', group: 'consent', platform: 'shared', label: 'Consent' },
    { glob: 'src/lib/privacy/**/*.{ts,tsx,js,jsx}', group: 'consent', platform: 'shared', label: 'Privacy' },
    { glob: 'lib/compliance/**/*.{ts,tsx,js,jsx}', group: 'compliance', platform: 'shared', label: 'Compliance' },
    // Tiers & Feature Flags
    { glob: 'src/lib/tiers/**/*.{ts,tsx,js,jsx}', group: 'tiers', platform: 'shared', label: 'Tiers' },
    { glob: 'src/lib/feature-flags/**/*.{ts,tsx,js,jsx}', group: 'tiers', platform: 'shared', label: 'Feature Flags' },
    { glob: 'src/lib/subscriptions/**/*.{ts,tsx,js,jsx}', group: 'tiers', platform: 'shared', label: 'Subscriptions' },
    // Middleware
    { glob: 'src/middleware/**/*.{ts,tsx,js,jsx}', group: 'middleware', platform: 'backend', label: 'Middleware' },
    { glob: 'middleware/**/*.{ts,tsx,js,jsx}', group: 'middleware', platform: 'backend', label: 'Middleware' },
    { glob: 'src/lib/middleware/**/*.{ts,tsx,js,jsx}', group: 'middleware', platform: 'backend', label: 'Middleware' },
    // Notifications & Email
    { glob: 'src/lib/notifications/**/*.{ts,tsx,js,jsx}', group: 'notifications', platform: 'shared', label: 'Notifications' },
    { glob: 'src/lib/email/**/*.{ts,tsx,js,jsx}', group: 'notifications', platform: 'backend', label: 'Email' },
    { glob: 'src/lib/sms/**/*.{ts,tsx,js,jsx}', group: 'notifications', platform: 'backend', label: 'SMS' },
    { glob: 'lib/notifications/**/*.{ts,tsx,js,jsx}', group: 'notifications', platform: 'shared', label: 'Notifications' },
    // Logging & Monitoring
    { glob: 'src/lib/logging/**/*.{ts,tsx,js,jsx}', group: 'logging', platform: 'shared', label: 'Logging' },
    { glob: 'src/lib/monitoring/**/*.{ts,tsx,js,jsx}', group: 'logging', platform: 'shared', label: 'Monitoring' },
    { glob: 'src/lib/analytics/**/*.{ts,tsx,js,jsx}', group: 'logging', platform: 'shared', label: 'Analytics' },
    { glob: 'lib/logging/**/*.{ts,tsx,js,jsx}', group: 'logging', platform: 'shared', label: 'Logging' },
    // Referrals & Growth
    { glob: 'src/lib/referrals/**/*.{ts,tsx,js,jsx}', group: 'referrals', platform: 'shared', label: 'Referrals' },
    { glob: 'src/lib/growth/**/*.{ts,tsx,js,jsx}', group: 'referrals', platform: 'shared', label: 'Growth' },
    // Admin Library
    { glob: 'src/lib/admin/**/*.{ts,tsx,js,jsx}', group: 'admin-lib', platform: 'backend', label: 'Admin Library' },
    { glob: 'lib/admin/**/*.{ts,tsx,js,jsx}', group: 'admin-lib', platform: 'backend', label: 'Admin Library' },
    // Type Definitions
    { glob: 'src/types/**/*.{ts,tsx}', group: 'types', platform: 'shared', label: 'Types' },
    { glob: 'types/**/*.{ts,tsx}', group: 'types', platform: 'shared', label: 'Types' },
    // React Hooks
    { glob: 'src/hooks/**/*.{ts,tsx,js,jsx}', group: 'hooks', platform: 'shared', label: 'Hooks' },
    { glob: 'hooks/**/*.{ts,tsx,js,jsx}', group: 'hooks', platform: 'shared', label: 'Hooks' },
    // Database / ORM / Migrations
    { glob: 'src/lib/db/**/*.{ts,tsx,js,jsx}', group: 'database', platform: 'backend', label: 'Database' },
    { glob: 'src/lib/database/**/*.{ts,tsx,js,jsx}', group: 'database', platform: 'backend', label: 'Database' },
    { glob: 'src/lib/supabase/**/*.{ts,tsx,js,jsx}', group: 'database', platform: 'backend', label: 'Supabase' },
    { glob: 'lib/db/**/*.{ts,tsx,js,jsx}', group: 'database', platform: 'backend', label: 'Database' },
    { glob: 'prisma/**/*.{ts,js}', group: 'database', platform: 'backend', label: 'Prisma' },
    { glob: 'drizzle/**/*.{ts,js}', group: 'database', platform: 'backend', label: 'Drizzle' },
    // Shared UI Components
    { glob: 'src/components/ui/**/*.{ts,tsx,js,jsx}', group: 'ui-components', platform: 'web', label: 'UI Components' },
    { glob: 'components/ui/**/*.{ts,tsx,js,jsx}', group: 'ui-components', platform: 'web', label: 'UI Components' },
  ];

  for (const pattern of criticalPatterns) {
    const files = globSync(pattern.glob, {
      cwd: process.cwd(),
      ignore: ['node_modules/**', '.next/**', 'dist/**', 'build/**', '*.test.*', '*.spec.*', '__tests__/**']
    });

    for (const file of files) {
      const normalized = file.replace(/\\/g, '/');
      if (seen.has(normalized)) continue;
      seen.add(normalized);

      // Generate a human-readable name from the filename
      const basename = path.basename(normalized, path.extname(normalized));
      const name = basename
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());

      // Generate a stable ID from the path
      const id = 'lib-' + normalized
        .replace(/^src\//, '')
        .replace(/\.(ts|tsx|js|jsx)$/, '')
        .replace(/\//g, '-')
        .replace(/[^a-z0-9-]/gi, '-')
        .toLowerCase();

      entries.push({
        id,
        name,
        path: normalized,
        group: pattern.group,
        platform: pattern.platform,
        funcs: ['*'],
      });
    }
  }

  return entries;
}

function scanServerActions(config) {
  const actions = [];
  const actionFiles = globSync(config.serverActionPattern || 'app/**/actions.ts', {
    cwd: process.cwd(),
    ignore: ['node_modules/**']
  });

  actionFiles.forEach((file, i) => {
    const pathParts = file.replace(/\\/g, '/').split('/');
    const fileName = pathParts[pathParts.length - 1];
    const folderName = pathParts[pathParts.length - 2];

    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n').length;

    // Simple regex to find exported functions
    const funcMatches = content.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g);
    const funcs = [];
    for (const match of funcMatches) {
      funcs.push(match[1]);
    }

    if (funcs.length > 0) {
      actions.push({
        id: `sa-${i}`,
        name: fileName,
        path: `${folderName}`,
        platform: 'backend',
        lines,
        funcs,
        tables: []
      });
    }
  });

  return actions;
}
