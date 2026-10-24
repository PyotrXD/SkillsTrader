#!/usr/bin/env node
// Rotates a local PocketBase superuser password and stores the new value ONLY in the
// git-ignored incident-private/ directory.
//
// Why a script rather than a typed command: the PocketBase CLI takes the new password as a
// positional argument, so running it from the shell would put the secret into this session's
// transcript and into shell history. The password is generated, applied and recorded here, and is
// never written to stdout.
//
// Rotation is verified by fingerprinting the stored bcrypt hash before and after. An unchanged
// fingerprint is a failure, not a success -- that is the only way to tell a real rotation from a
// command that quietly did nothing.
//
// The CLI reaches only _superusers. Regular `users` auth records are handled in the admin UI; see
// docs/operations/credential-rotation.md.
import { execFileSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { DatabaseSync } from 'node:sqlite';

const repoRoot = path.resolve(import.meta.dirname, '..');
const storePath = path.join(repoRoot, 'incident-private', 'credentials.local.md');
const binary = path.join(repoRoot, process.platform === 'win32' ? 'pocketbase.exe' : 'pocketbase');
const EMAIL = process.argv[2];

if (!EMAIL) {
  console.error('usage: node scripts/rotate-superuser.mjs <superuser-email>');
  process.exit(2);
}

if (!existsSync(binary)) {
  console.error(`PocketBase binary not found at ${binary}`);
  process.exit(2);
}

const dbPath = path.join(repoRoot, 'pb_data', 'data.db');

function hashFingerprint() {
  // readOnly so this never takes a lock against a running instance.
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const row = db.prepare('select password from _superusers where email = ?').get(EMAIL);
    if (!row?.password) return null;
    return createHash('sha256').update(row.password).digest('hex').slice(0, 12);
  } finally {
    db.close();
  }
}

const before = hashFingerprint();
if (before === null) {
  console.error(`RESULT: FAIL -- no _superusers row for ${EMAIL}; nothing was rotated.`);
  process.exit(1);
}

// 16 random bytes rendered as hex: uniform by construction, no modulo bias from mapping bytes
// onto a shorter alphabet, and no characters that need quoting. 128 bits of entropy.
const password = randomBytes(16).toString('hex');

// --automigrate=false is not optional. Every PocketBase CLI command bootstraps the app, and
// automigrate defaults to true, so without it a credential rotation silently applies any pending
// migration to the live database. That happened once: see docs/operations/credential-rotation.md.
execFileSync(binary, ['superuser', 'update', EMAIL, password, '--dir', 'pb_data', '--automigrate=false'], {
  cwd: repoRoot,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});

const after = hashFingerprint();
if (after === null || after === before) {
  console.error(
    `RESULT: FAIL -- the stored hash for ${EMAIL} did not change, so the password was NOT rotated.\n` +
      'Do not treat the credential as fresh. Check the CLI output above.',
  );
  process.exit(1);
}

mkdirSync(path.dirname(storePath), { recursive: true });
if (!existsSync(storePath)) {
  writeFileSync(
    storePath,
    '# Local credentials -- git-ignored, never commit\n\n' +
      'Written by `node scripts/rotate-superuser.mjs <email>`. Each entry records a sha256\n' +
      'fingerprint of the stored bcrypt hash before and after, so a no-op rotation cannot look\n' +
      'like a success. This directory is ignored by .gitignore; the repository is publicly\n' +
      'readable until docs/system-improvements.md S1 closes, so no credential belongs in a\n' +
      'tracked file or in `pb_data/`.\n\n',
  );
} else if (!readFileSync(storePath, 'utf8').includes('\n\n')) {
  appendFileSync(storePath, '\n');
}

appendFileSync(
  storePath,
  `## _superusers \`${EMAIL}\`\n\n` +
    `- rotated: ${new Date().toISOString()}\n` +
    `- password: ${password}\n` +
    `- stored-hash fingerprint: ${before} -> ${after}\n\n`,
);

// Deliberately no password here.
console.log(`RESULT: PASS -- rotated ${EMAIL}; stored hash fingerprint ${before} -> ${after}`);
console.log(`        credential saved to ${path.relative(repoRoot, storePath)} (git-ignored, not committed)`);
