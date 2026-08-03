#!/usr/bin/env node
/**
 * Fixes the framer-motion ESM extraction bug on Windows/Node 24.
 * The npm tarball for framer-motion@11 contains 374 files but npm only
 * extracts ~80-126 of them on this platform. This script patches the
 * package.json to force Vite to use the CJS bundle.
 *
 * This script is safe to run multiple times (idempotent).
 */
const fs = require('fs');
const path = require('path');

const pkgDir = path.join(__dirname, '..', 'node_modules', 'framer-motion');
const pkgJsonPath = path.join(pkgDir, 'package.json');

if (!fs.existsSync(pkgJsonPath)) {
  process.exit(0);
}

const raw = fs.readFileSync(pkgJsonPath, 'utf8');
const pkg = JSON.parse(raw);

// If already patched, skip
if (pkg._patched_cjs_only === true) {
  process.exit(0);
}

// Remove module and exports fields to force Vite/main to use CJS
delete pkg.module;
delete pkg.exports;

// Remove broken ESM directories
const esDir = path.join(pkgDir, 'dist', 'es');
if (fs.existsSync(esDir)) {
  fs.rmSync(esDir, { recursive: true, force: true });
}

// Also fix motion-dom and motion-utils
for (const dep of ['motion-dom', 'motion-utils']) {
  const depPkgPath = path.join(__dirname, '..', 'node_modules', dep, 'package.json');
  if (fs.existsSync(depPkgPath)) {
    const depRaw = fs.readFileSync(depPkgPath, 'utf8');
    const depPkg = JSON.parse(depRaw);
    if (depPkg.module || depPkg.exports) {
      delete depPkg.module;
      delete depPkg.exports;
      fs.writeFileSync(depPkgPath, JSON.stringify(depPkg, null, 2), 'utf8');
    }
    const depEsDir = path.join(path.dirname(depPkgPath), 'dist', 'es');
    if (fs.existsSync(depEsDir)) {
      fs.rmSync(depEsDir, { recursive: true, force: true });
    }
  }
}

pkg._patched_cjs_only = true;
fs.writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 4), 'utf8');
console.log('[postinstall] Patched framer-motion to use CJS entry');
