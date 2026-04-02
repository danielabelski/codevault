#!/usr/bin/env node

/**
 * CodeVault Setup Script
 *
 * Scans your codebase and generates codevault-data.js
 * Run this from the same directory as codevault.html
 *
 * Usage:
 *   node setup.mjs [--project-name "My Project"] [--framework "next.js"]
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

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--project-name' && args[i + 1]) {
    projectName = args[i + 1];
    i++;
  }
  if (args[i] === '--framework' && args[i + 1]) {
    framework = args[i + 1];
    i++;
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

// Also generate LOCK_CONFIG.json for Claude enforcement
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
serverActions.forEach(sa => { lockConfig.serverActions[sa.id] = { path: sa.path, name: sa.name, platform: sa.platform || 'backend', ui: 'locked', logic: 'locked', data: 'locked' }; });

const lockPath = path.join(process.cwd(), 'LOCK_CONFIG.json');
fs.writeFileSync(lockPath, JSON.stringify(lockConfig, null, 2), 'utf-8');
console.log(`> Generated ${lockPath}`);

console.log(`\nNext steps:`);
console.log(`  1. Open codevault.html in Chrome/Edge`);
console.log(`  2. Click "Connect File" and select LOCK_CONFIG.json`);
console.log(`  3. Toggle locks — changes auto-save`);
console.log(`  4. Copy CLAUDE_LOCK_RULES.md into your CLAUDE.md\n`);

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
