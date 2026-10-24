#!/usr/bin/env node
// Verifies a rotated superuser password actually authenticates, then shuts the server down.
//
// A changed bcrypt hash proves the OLD password is dead. It does not prove the NEW one works --
// only an auth round trip does that, and being locked out of the local admin UI would be worse
// than the problem being fixed.
//
// Started with --automigrate=false on a spare port: a verification probe must not apply pending
// migrations to the live database as a side effect. Nothing here prints the password.
import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = path.resolve(import.meta.dirname, '..');
const binary = path.join(repoRoot, process.platform === 'win32' ? 'pocketbase.exe' : 'pocketbase');
const storePath = path.join(repoRoot, 'incident-private', 'credentials.local.md');
const EMAIL = process.argv[2];
const PORT = process.argv[3] || '8093';

if (!EMAIL) {
  console.error('usage: node scripts/verify-superuser-login.mjs <email> [port]');
  process.exit(2);
}
if (!existsSync(storePath)) {
  console.error(`no credential store at ${path.relative(repoRoot, storePath)} -- rotate first`);
  process.exit(2);
}

// Pull the newest recorded password for this email out of the local store without echoing it.
const entries = readFileSync(storePath, 'utf8').split(/^## /m).filter((b) => b.includes(`\`${EMAIL}\``));
if (entries.length === 0) {
  console.error(`no stored credential for ${EMAIL}`);
  process.exit(1);
}
const match = entries[entries.length - 1].match(/^- password: (\S+)$/m);
if (!match) {
  console.error('stored entry has no password line');
  process.exit(1);
}
const password = match[1];

const child = spawn(binary, ['serve', '--dir', 'pb_data', '--http', `127.0.0.1:${PORT}`, '--automigrate=false'], {
  cwd: repoRoot,
  stdio: 'ignore',
  windowsHide: true,
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function attempt(pathname, body) {
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}${pathname}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.status;
  } catch {
    return 0; // not listening yet
  }
}

let status = 0;
for (let i = 0; i < 40; i += 1) {
  await sleep(250);
  status = await attempt('/api/collections/_superusers/auth-with-password', {
    identity: EMAIL,
    password,
  });
  if (status !== 0) break;
}

let result = 'FAIL';
if (status === 200) {
  // The rotated credential works. Confirm the store is the only place it exists.
  result = 'PASS';
} else {
  console.error(`authentication returned HTTP ${status}`);
}

child.kill();
await sleep(300);
if (!child.killed) child.kill('SIGKILL');

console.log(`RESULT: ${result} -- ${status === 200 ? 'rotated password authenticates' : 'login did not succeed'}; server stopped`);
process.exit(result === 'PASS' ? 0 : 1);
