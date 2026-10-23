#!/usr/bin/env node
// Blocks a repeat of docs/system-improvements.md S1: applicant uploads and the live
// database were committed because pb_data was treated as shareable dev state.
// Anything under pb_data/ other than the storage placeholder is runtime data and must
// never be tracked.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const repoRoot = path.resolve(import.meta.dirname, '..');
const ALLOWED = new Set(['pb_data/storage/.gitkeep']);

const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: repoRoot, encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);

const offenders = tracked.filter((file) => file.startsWith('pb_data/') && !ALLOWED.has(file));

// Upload sidecars and PDFs leaked by filename before the directory policy existed, so
// they are checked repo-wide rather than only under pb_data/.
const strayUploads = tracked.filter(
  (file) => file.endsWith('.attrs') || /(^|\/)(data|auxiliary)\.db$/i.test(file),
);

const problems = [...new Set([...offenders, ...strayUploads])];

if (problems.length > 0) {
  console.error(
    'Runtime data is tracked in git. pb_data holds live applicant uploads and the database.\n' +
      'Untrack without deleting the files on disk, then re-run:\n' +
      '  git rm --cached -- <path>\n',
  );
  for (const file of problems) console.error(`  ${file}`);
  process.exit(1);
}

console.log(`pb_data containment OK - ${tracked.length} tracked files, no runtime data among them`);
