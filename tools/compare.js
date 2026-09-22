#!/usr/bin/env node
// Side-by-side preview of the last committed version and the working copy.
//   new (this folder, including uncommitted changes)                     → http://localhost:8000
//   old (HEAD, checked out as a git worktree in ../connected-webpage-old) → http://localhost:8001
// Usage: npm run compare   (Ctrl+C stops both)

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const serve = require('./serve.js');

const ROOT = path.resolve(__dirname, '..');
const OLD = path.resolve(ROOT, '..', 'connected-webpage-old');

if (!fs.existsSync(OLD)) {
    execSync(`git worktree add --detach "${OLD}" HEAD`, { cwd: ROOT, stdio: 'inherit' });
} else {
    // Keep the old copy pinned to this folder's latest commit.
    const head = execSync('git rev-parse HEAD', { cwd: ROOT }).toString().trim();
    execSync(`git checkout --detach --quiet ${head}`, { cwd: OLD, stdio: 'inherit' });
}

serve(ROOT, 8000, 'New version (working copy)');
serve(OLD, 8001, 'Old version (last commit) ');
console.log('Press Ctrl+C to stop.');
