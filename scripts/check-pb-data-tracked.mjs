#!/usr/bin/env node
// Blocks a repeat of docs/system-improvements.md S1: applicant uploads and the live database were
// committed because pb_data was treated as shareable dev state.
//
// Two things are enforced, because both are now present on disk:
//   1. no runtime data under pb_data/ beyond the storage placeholder;
//   2. no credential material anywhere in the index. incident-private/ is gitignored, but an
//      ignore rule only protects against an accidental `git add`, never against `git add -f` --
//      and scripts/rotate-superuser.mjs deliberately writes real passwords into that directory.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const repoRoot = path.resolve(import.meta.dirname, '..');
const ALLOWED = new Set(['pb_data/storage/.gitkeep']);

const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: repoRoot, encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);

const problems = new Set();

for (const file of tracked) {
  // Runtime data: the database, WAL/journal sidecars, upload sidecars, and anything else that
  // landed under pb_data/. Upload sidecars and PDFs leaked by filename before the directory policy
  // existed, so they are checked repo-wide rather than only under pb_data/.
  if (file.startsWith('pb_data/') && !ALLOWED.has(file)) problems.add(file);
  if (file.endsWith('.attrs') || /(^|\/)(data|auxiliary)\.db$/i.test(file)) problems.add(file);

  // Credentials: the local store, and any .env that is not the committed example.
  if (file.startsWith('incident-private/')) problems.add(file);
  if (/(^|\/)\.env(\.|$)/i.test(file) && !file.endsWith('.env.example')) problems.add(file);
  if (/(^|\/)[^/]*\.(pem|p12|pfx|key)$/i.test(file)) problems.add(file);
  // Deliberately not a broad "filename contains password" heuristic: it would fail on the very
  // scripts that rotate credentials (scripts/rotate-user-password.mjs) and on docs, and a guard
  // that cries wolf gets disabled rather than fixed.
  if (/(^|\/)(credentials|secrets)\.local\./i.test(file)) problems.add(file);
}

const list = [...problems].sort();

if (list.length > 0) {
  console.error(
    'Runtime data or credentials are tracked in git.\n' +
      'pb_data holds live applicant uploads and the database; incident-private/ holds real passwords.\n' +
      'Untrack without deleting the files on disk, then re-run:\n' +
      '  git rm --cached -- <path>\n',
  );
  for (const file of list) console.error(`  ${file}`);
  process.exit(1);
}

console.log(`containment OK - ${tracked.length} tracked files, no runtime data and no credentials`);
