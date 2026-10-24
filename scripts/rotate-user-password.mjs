#!/usr/bin/env node
// Rotates a regular `users` auth record's password through the admin API, using a short-lived
// superuser token read from the local credential store. Records the new password in the same
// git-ignored store and verifies it by logging in as that user.
//
// Why this exists: `pocketbase superuser update` only reaches _superusers. The app login uses the
// `users` collection (Login.tsx tries users before _superusers), so a leaked users hash is exactly
// as live as a leaked superuser hash. Writing a bcrypt string straight into the database would be
// worse than the problem, so this goes through PocketBase's own API, which hashes and validates.
//
// `passwordConfirm` is required alongside `password`; a PATCH with only `password` returns 400 and
// changes nothing. On failure the sanitized API error body is printed so the cause is visible rather
// than guessed at -- field names only, never the secret.
//
// No password and no token is ever printed. Serve runs with --automigrate=false: a credential
// rotation must never apply pending migrations to the live database as a side effect.
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = path.resolve(import.meta.dirname, '..');
const binary = path.join(repoRoot, process.platform === 'win32' ? 'pocketbase.exe' : 'pocketbase');
const storePath = path.join(repoRoot, 'incident-private', 'credentials.local.md');
const SUPERUSER = process.argv[2];
const TARGET_EMAIL = process.argv[3];
const PORT = process.argv[4] || '8094';

if (!SUPERUSER || !TARGET_EMAIL) {
  console.error('usage: node scripts/rotate-user-password.mjs <superuser-email> <target-users-email> [port]');
  process.exit(2);
}
if (!existsSync(storePath)) {
  console.error('no local credential store; run scripts/rotate-superuser.mjs first');
  process.exit(2);
}

function latestSecret(email) {
  const blocks = readFileSync(storePath, 'utf8').split(/^## /m).filter((b) => b.includes(`\`${email}\``));
  if (blocks.length === 0) return null;
  const m = blocks[blocks.length - 1].match(/^- password: (\S+)$/m);
  return m ? m[1] : null;
}

const superPassword = latestSecret(SUPERUSER);
if (!superPassword) {
  console.error(`no stored password for superuser ${SUPERUSER}`);
  process.exit(1);
}

const child = spawn(binary, ['serve', '--dir', 'pb_data', '--http', `127.0.0.1:${PORT}`, '--automigrate=false'], {
  cwd: repoRoot,
  stdio: 'ignore',
  windowsHide: true,
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const base = `http://127.0.0.1:${PORT}`;

async function waitUp() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`${base}/api/health`);
      if (res.ok) return true;
    } catch {
      /* not listening yet */
    }
    await sleep(250);
  }
  return false;
}

function safeError(secret, text) {
  // Never surface the secret even if the API echoes a field back.
  return (text || '').replaceAll(secret, '[redacted]').slice(0, 400);
}

let exitCode = 1;
try {
  if (!(await waitUp())) {
    console.error('PocketBase did not come up; nothing was changed');
  } else {
    const auth = await fetch(`${base}/api/collections/_superusers/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: SUPERUSER, password: superPassword }),
    });
    if (auth.status !== 200) {
      console.error(`superuser auth returned HTTP ${auth.status}; nothing was changed`);
    } else {
      const token = (await auth.json()).token;
      const list = await fetch(`${base}/api/collections/users/records?filter=(email='${TARGET_EMAIL}')`, {
        headers: { Authorization: token },
      });
      const found = list.ok ? (await list.json()).items ?? [] : [];
      if (found.length !== 1) {
        console.error(
          `expected exactly one users row for ${TARGET_EMAIL}, got ${found.length}` +
            (list.ok ? '' : ` (list returned HTTP ${list.status})`) + '; nothing was changed',
        );
      } else {
        const recordId = found[0].id;
        // 128 bits, hex alphabet: uniform, and no character needs quoting.
        const newPassword = randomBytes(16).toString('hex');
        const patch = await fetch(`${base}/api/collections/users/records/${recordId}`, {
          method: 'PATCH',
          headers: { Authorization: token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: newPassword, passwordConfirm: newPassword }),
        });
        // Verify independently: a fresh token for the target user proves the new password works.
        const relogin = await fetch(`${base}/api/collections/users/auth-with-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identity: TARGET_EMAIL, password: newPassword }),
        });
        if (patch.status === 200 && relogin.status === 200) {
          appendFileSync(
            storePath,
            `## users \`${TARGET_EMAIL}\` (id \`${recordId}\`)\n\n` +
              `- rotated: ${new Date().toISOString()}\n` +
              `- password: ${newPassword}\n` +
              `- app login verified: authenticated against the users collection with the new password\n\n`,
          );
          console.log(
            `RESULT: PASS -- rotated users/${recordId}; app login verified; ` +
              'new password stored in git-ignored incident-private/credentials.local.md',
          );
          exitCode = 0;
        } else {
          const body = await patch.text().catch(() => '');
          console.error(
            `RESULT: FAIL -- PATCH ${patch.status}, relogin ${relogin.status}. ` +
              'The password was NOT rotated; treat the stored credential as unchanged.\n' +
              `  API error: ${safeError(newPassword, body)}`,
          );
        }
      }
    }
  }
} finally {
  child.kill();
  await sleep(400);
  if (!child.killed) child.kill('SIGKILL');
}
process.exit(exitCode);
