#!/usr/bin/env node
// Read-only pre-flight check of a POPULATED PocketBase database, run on the server before a pull.
//
// Why this exists. scripts/check-api-rules.mjs and scripts/export-schema-snapshot.mjs both replay
// pb_migrations/ into a throwaway directory and never open the real data.db. That proves what the
// chain does to an EMPTY database; it cannot prove what the chain does to the one on the live
// server, and it cannot see drift between that chain and that file. Three questions are only
// answerable against the real database, and they decide whether a deploy is safe:
//   1. which migrations this database has already recorded, so what is still pending;
//   2. whether every collection a pending migration touches exists here -- app
//      .findCollectionByNameOrId() THROWS when it does not, and since PocketBase automigrates on
//      `serve`, a throw means the service never starts and the site stays down;
//   3. whether the applicant files the incoming pull deletes are still referenced by real rows.
//
// It never starts PocketBase and never opens the live database for writing. It copies data.db plus
// its WAL sidecars into a temp directory and reads the COPY read-only, so a bug here cannot damage
// the live file, and the `--automigrate` trap in docs/operations/credential-rotation.md is
// unreachable because no pocketbase subcommand is ever invoked.
//
// Output is identifier-free by default: counts, collection names, migration filenames, and opaque
// labels (F1, F2, ...) for files under pb_data/. Pasting the whole block into a chat, a ticket or a
// commit is safe. `--show-names` prints real applicant filenames -- do not paste THAT output anywhere.
//
//   node scripts/check-live-db.mjs
//   node scripts/check-live-db.mjs --db /opt/skillstrader/pb_data
//   node scripts/check-live-db.mjs --base origin/ady/live --head origin/ady/development --show-names
//
// Run it from the repository root so pb_migrations/ resolves. On a server whose Node predates 22.5
// there is no node:sqlite: the script says so and prints the equivalent sqlite3 statements instead
// of silently skipping the checks. On Node 22.x and early 23 the module exists but is gated, so add
// the flag -- `node --experimental-sqlite scripts/check-live-db.mjs`. Node 24+ needs none.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, copyFileSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';

const argv = process.argv.slice(2);
const opt = (name) => {
  const index = argv.indexOf(`--${name}`);
  return index === -1 ? null : argv[index + 1];
};
const SHOW_NAMES = argv.includes('--show-names');

// Resolved against the working directory, not the script's own folder: on a server this file is
// often run from a temp path (`git show origin/ady/development:scripts/check-live-db.mjs > /tmp/…`)
// while the cwd is the repository root.
const repoRoot = path.resolve(process.cwd());
const dbDir = path.resolve(opt('db') || path.join(repoRoot, 'pb_data'));
const baseRef = opt('base') || 'origin/ady/live';
const headRef = opt('head') || 'origin/ady/development';

const findings = [];
const PASS = (m) => findings.push({ level: 'PASS', m });
const WARN = (m) => findings.push({ level: 'WARN', m });
const FAIL = (m) => findings.push({ level: 'FAIL', m });
const info = (m) => console.log(`    ${m}`);

const dbPath = path.join(dbDir, 'data.db');
const walPath = `${dbPath}-wal`;
const shmPath = `${dbPath}-shm`;

console.log('=== SkillsTrader live-database pre-flight (read-only) ===');
console.log(`node ${process.version}  ${process.platform}/${process.arch}`);
console.log(`repo root : ${repoRoot}`);
console.log(`db dir    : ${dbDir}`);
console.log(`names     : ${SHOW_NAMES ? 'REAL FILENAMES PRINTED -- do not paste this output' : 'masked (default)'}`);
console.log('');

if (!existsSync(dbPath)) {
  console.error(`No data.db at ${dbPath}\nPoint --db at the directory PocketBase was started with.`);
  process.exit(2);
}

const sidecar = (label, file) => {
  if (!existsSync(file)) return `${label}: absent`;
  const { size, mtime } = statSync(file);
  return `${label}: ${size} bytes, mtime ${mtime.toISOString()}`;
};
console.log(`    ${sidecar('data.db    ', dbPath)}`);
console.log(`    ${sidecar('data.db-wal', walPath)}`);
console.log(`    ${sidecar('data.db-shm', shmPath)}`);
// A non-empty WAL means writes have not been checkpointed. Taking all three files back to back is
// consistent enough for schema and reference counting, but it is NOT a backup and must not be
// treated as one.
if (existsSync(walPath) && statSync(walPath).size > 0) {
  WARN('the WAL is non-empty, so PocketBase is likely running. The three-file copy is fine for counts '
    + 'and references; stop the service first if you want a clean read.');
}

// A worktree check, not a curiosity: production keeps pb_data inside the git clone
// (docs/operations/production-runbook.md), which is exactly why `git clean -fdx` on that box would
// delete the live database and every applicant upload.
let worktree = null;
try {
  worktree = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: repoRoot, encoding: 'utf8' }).trim();
} catch {
  WARN('git is unavailable or this is not a repository, so the pending-deletion diff cannot be computed.');
}
if (worktree && path.resolve(dbDir).startsWith(path.resolve(worktree) + path.sep)) {
  WARN(`pb_data lives INSIDE the git worktree (${worktree}). Never run \`git clean -fdx\` here.`);
}

let DatabaseSync;
try {
  ({ DatabaseSync } = await import('node:sqlite'));
} catch {
  FAIL(`node:sqlite is unavailable on node ${process.version} (it needs 22.5+).`);
  console.log('\nThe same checks are answerable with the sqlite3 shell. From the repo root:\n');
  console.log(`  sqlite3 ${dbPath} ".tables"`);
  console.log(`  sqlite3 ${dbPath} "select * from _migrations order by 1;"`);
  console.log(`  sqlite3 ${dbPath} "select id, name, type from _collections order by name;"`);
  console.log('  # then, per collection that holds files:');
  console.log(`  sqlite3 ${dbPath} "select count(*) from documents where file = '<filename>';"`);
  console.log('\nPaste that output back and I will read it. Upgrading Node on that box is your call.');
  process.exit(1);
}

const tempDir = path.join(tmpdir(), `skillstrader-livecheck-${Date.now()}`);
mkdirSync(tempDir, { recursive: true });
let db;
try {
  for (const file of [dbPath, walPath, shmPath]) {
    if (existsSync(file)) copyFileSync(file, path.join(tempDir, path.basename(file)));
  }
  db = new DatabaseSync(path.join(tempDir, 'data.db'), { readOnly: true });
} catch (err) {
  console.error(`Could not open a read-only copy: ${err.message}`);
  rmSync(tempDir, { recursive: true, force: true });
  process.exit(2);
}
const all = (sql, ...params) => db.prepare(sql).all(...params);

console.log('\n--- migrations ---');
const migrationColumns = all("select name from pragma_table_info('_migrations')").map((r) => r.name);
const fileColumn = migrationColumns.find((c) => c === 'file' || c === 'name') || migrationColumns[0];
const applied = all(`select "${fileColumn}" as f from "_migrations" order by 1`)
  .map((row) => path.basename(String(row.f)));
const migrationsDir = path.join(repoRoot, 'pb_migrations');

// The chain is deliberately read from the TARGET REF, not the working tree. On the server this runs
// BEFORE the pull, so the working tree is still the old branch and the incoming migrations are not on
// disk yet. Reading disk there finds 34 applied files and reports "0 pending, a restart cannot change
// this schema" -- a silent green on the exact question being asked. The ref is what will be deployed,
// so the ref is what gets checked; only if git cannot supply it do we fall back to disk, and we say so.
const diskChain = existsSync(migrationsDir)
  ? readdirSync(migrationsDir).filter((f) => f.endsWith('.js')).sort()
  : [];
let chainSource = 'the working tree';
let chain = diskChain;
const refFiles = (() => {
  if (!worktree) return null;
  try {
    return execFileSync('git', ['ls-tree', '--name-only', '-r', headRef, '--', 'pb_migrations'],
      { cwd: repoRoot, encoding: 'utf8' })
      .split(/\r?\n/).filter((f) => f.endsWith('.js')).map((f) => path.posix.basename(f)).sort();
  } catch {
    return null;
  }
})();
if (refFiles?.length) {
  chain = refFiles;
  chainSource = headRef;
}
// A pending file that is not on disk is the normal pre-pull case, not an error: the server is still
// on the old branch. Read it from the ref being deployed, or the check crashes with ENOENT on the
// very files it exists to examine.
const readMigration = (file) => {
  const onDisk = path.join(migrationsDir, file);
  if (existsSync(onDisk)) return readFileSync(onDisk, 'utf8');
  try {
    return execFileSync('git', ['show', `${headRef}:pb_migrations/${file}`],
      { cwd: repoRoot, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  } catch {
    return '';
  }
};
if (refFiles?.length && diskChain.length && diskChain.length !== refFiles.length) {
  WARN(`chain read from ${headRef}: ${refFiles.length} files, while this checkout holds ${diskChain.length} `
    + `on disk. The ${refFiles.length - diskChain.length} incoming file(s) are read from the ref.`);
}

// `_migrations` also holds PocketBase's OWN internal bootstrap migrations -- `.go` files such as
// 1640988000_init.go and the v0.23_migrate series -- which are baked into the binary and were never
// in pb_migrations/. Comparing the full table against the directory reads 44 vs 37 and cries drift on
// a perfectly healthy database. Only `.js` entries belong to this chain, so only they are compared.
const appliedJs = applied.filter((f) => f.endsWith('.js'));
const internal = applied.filter((f) => !f.endsWith('.js'));

const pending = chain.filter((f) => !appliedJs.includes(f));
const orphans = appliedJs.filter((f) => !chain.includes(f));
info(`recorded in this database : ${applied.length} (${appliedJs.length} app .js, ${internal.length} PocketBase internal)`);
info(`in pb_migrations/ on disk : ${chain.length}`);
info(`PENDING app migrations (a restart applies these) : ${pending.length}`);
for (const f of pending) info(`  ${f}`);

if (!chain.length) {
  WARN('no pb_migrations/ found under the repo root -- run this from the repository root.');
}
if (orphans.length) {
  FAIL(`${orphans.length} app migration(s) are recorded here but absent from pb_migrations/ `
    + `(${orphans.join(', ')}). This database ran a chain this checkout does not have.`);
} else if (appliedJs.length && chain.length) {
  PASS(`every app migration recorded here exists on disk (${appliedJs.length}/${appliedJs.length}).`);
}
if (!appliedJs.length && chain.length) {
  FAIL('this database has never run an app migration while pb_migrations/ is populated: a restart '
    + `applies the whole chain (${chain.length} files) to live data in one go.`);
} else if (pending.length) {
  WARN(`${pending.length} migration(s) will apply automatically on the next \`pocketbase serve\`. `
    + 'That is the intended path, but it means the deploy and the schema are one step, not two.');
} else if (chain.length) {
  PASS('nothing pending: a restart cannot change this schema.');
}

console.log('\n--- pending migrations versus live collections ---');
const collections = all('select id, name, type, fields from _collections');
const byName = new Map(collections.map((c) => [c.name, c]));
const byId = new Map(collections.map((c) => [c.id, c]));

// migrate(up, down): only the UP half runs at deploy time. Scanning both halves false-alarms on a
// create-migration, because the down half looks up the collections the up half is about to make --
// on a live database those do not exist yet and are not supposed to.
const upHalf = (source) => {
  const start = source.indexOf('migrate(');
  if (start === -1) return source;
  const from = source.indexOf('(app) =>', start);
  const boundary = source.indexOf('}, (app)', from === -1 ? start : from);
  return boundary === -1 ? source.slice(from === -1 ? start : from) : source.slice(from === -1 ? start : from, boundary);
};

if (!pending.length) {
  PASS('nothing pending, so no migration can throw on a missing collection here.');
}
// Migrations run in filename order, so a collection created by an earlier pending file exists for the
// later ones. Track that, or 1792700000 (which only sets rules on the two new tables) reads as broken.
const willExist = new Set(byName.keys());
for (const file of pending) {
  const source = readMigration(file);
  // An unreadable source is not a clean result: without the text, nothing about its collections can
  // be asserted, so saying PASS here would be the silent green this whole branch exists to prevent.
  if (!source) {
    FAIL(`${file} is pending but its source could not be read from the working tree or from ${headRef}. `
      + 'Its collection lookups are UNVERIFIED.');
    continue;
  }
  const up = upHalf(source);
  const created = [...up.matchAll(/new Collection\(\s*\{[\s\S]{0,400}?\bname:\s*["'`]([\w-]+)["'`]/g)]
    .map((m) => m[1]);
  const literalNames = [...up.matchAll(/findCollectionByNameOrId\(\s*["'`]([^"'`]+)["'`]\s*\)/g)]
    .map((m) => m[1]);
  // A name reached through a loop variable is invisible to the scan above -- and 1792700000 is written
  // that way, so without this a missing table reads as "nothing referenced, all clear". Harvest the
  // array the loop iterates, but only when that variable is actually the lookup argument.
  const loopNames = [];
  for (const [, varName, arrayBody] of up.matchAll(/for\s*\(\s*(?:const|let)\s+(\w+)\s+of\s+\[([^\]]*)\]/g)) {
    if (!new RegExp(`findCollectionByNameOrId\\(\\s*${varName}\\s*\\)`).test(up)) continue;
    for (const [, quoted] of arrayBody.matchAll(/["'`]([\w-]+)["'`]/g)) loopNames.push(quoted);
  }
  const referenced = [...literalNames, ...loopNames];
  const ids = [...new Set(referenced.filter((n) => n.startsWith('pbc_')))];
  const names = [...new Set(referenced.filter((n) => !n.startsWith('pbc_')))];
  const missingNames = names.filter((n) => !willExist.has(n));
  const missingIds = ids.filter((id) => !byId.has(id));

  if (missingNames.length || missingIds.length) {
    FAIL(`${file} would throw on this database.`
      + (missingNames.length ? ` no collection named: ${missingNames.join(', ')}.` : '')
      + (missingIds.length ? ` no collection with id: ${missingIds.join(', ')}.` : '')
      + ' PocketBase automigrates on serve, so a throw means the service does not start.');
  } else {
    PASS(`${file}: ${names.length ? `all of ${names.join(', ')} exist` : 'no named collections'}; `
      + `${ids.length ? `${ids.length} hardcoded id(s) checked below` : 'no hardcoded ids'}.`);
  }
  if (created.length) {
    for (const name of created) willExist.add(name);
    info(`  (creates ${created.join(', ')}, so later pending files may reference them)`);
  }
  // A lookup driven by a variable cannot be enumerated by a literal scan. Say so instead of
  // implying coverage that is not there -- scripts/check-api-rules.mjs replays this same chain into a
  // throwaway directory and is the check that proves a data-driven chain applies cleanly.
  if (/findCollectionByNameOrId\(\s*[^"'`)\s]/.test(up)) {
    WARN(`${file} looks collections up by variable, so the names it needs are not all enumerable `
      + 'here. Run `node --experimental-sqlite scripts/check-api-rules.mjs` to prove the chain applies.');
  }

  // A hardcoded pbc_ id is only as good as what it resolves to ON THIS DATABASE. If the live file
  // binds that id to a different collection, the migration SUCCEEDS and points the new relation at
  // the wrong table -- worse than a missing collection, because nothing throws to tell you.
  for (const [, constName, id] of up.matchAll(/const\s+([A-Z][A-Z0-9_]*ID)\s*=\s*["'`](pbc_[0-9]+)["'`]/g)) {
    const hit = byId.get(id);
    const guessed = constName.replace(/_?ID$/, '').replace(/^NEW_/, '').toLowerCase().replace(/_/g, '');
    if (!hit) {
      FAIL(`${constName} = ${id} does not exist in this database.`);
    } else if (hit.name.toLowerCase().replace(/_/g, '') === guessed) {
      PASS(`${constName} (${id}) resolves to "${hit.name}", matching the migration's intent.`);
    } else {
      // Heuristic only: `legacy_candidates` versus a real collection named `candidates_legacy` is a
      // false alarm, so this reports both values and asks for eyes rather than deciding.
      WARN(`${constName} = ${id} resolves to "${hit.name}" here. The constant reads like it wants `
        + `"${guessed}". Verify by eye before trusting the relation target.`);
    }
  }
}

console.log('\n--- files the incoming pull would delete ---');
let deletions = [];
if (worktree) {
  try {
    deletions = execFileSync(
      'git', ['diff', '--diff-filter=D', '--name-only', `${baseRef}..${headRef}`, '--', 'pb_data'],
      { cwd: repoRoot, encoding: 'utf8' },
    ).split(/\r?\n/).filter((f) => f && !f.endsWith('.attrs'));
  } catch (err) {
    WARN(`cannot diff ${baseRef}..${headRef} (${String(err.message).trim().split('\n')[0]}). `
      + 'Fetch first: `git fetch origin ady/live ady/development`.');
  }
}
if (!deletions.length && !worktree) {
  info('skipped -- no git information available.');
} else if (!deletions.length) {
  PASS('the incoming range deletes nothing under pb_data/.');
}

let referencedTotal = 0;
deletions.forEach((relPath, index) => {
  const label = `F${index + 1}`;
  const parts = relPath.split(/[\\/]/);
  const collectionId = parts.find((p) => p.startsWith('pbc_'));
  const filename = parts[parts.length - 1];
  const collection = collectionId ? byId.get(collectionId) : undefined;
  const presentOnDisk = existsSync(path.join(repoRoot, relPath));

  if (!collection) {
    FAIL(`${label} belongs to collection id ${collectionId || '(unparsed)'}, which is not in this `
      + 'database. Its storage directory is orphaned or from another environment.');
    return;
  }
  // maxSelect decides how the value is STORED: one file is the bare filename, many is a JSON array
  // like ["a.pdf","b.pdf"]. Matching only with `=` would report 0 references for a multi-file field
  // and then declare the deletion safe -- the false-negative direction, which is the dangerous one.
  // So multi-select fields use a substring match: it can over-report a hit (a filename that is a
  // prefix of another), and over-reporting fails safe by raising FAIL instead of a clean PASS.
  const fileFields = JSON.parse(collection.fields)
    .filter((f) => f.type === 'file')
    .map((f) => ({ name: f.name, single: f.maxSelect === 1 }));
  let count = 0;
  let counted = false;
  for (const field of fileFields) {
    try {
      count += field.single
        ? all(`select count(*) as n from "${collection.name}" where "${field.name}" = ?`, filename)[0].n
        : all(`select count(*) as n from "${collection.name}" where instr("${field.name}", ?) > 0`, filename)[0].n;
      counted = true;
    } catch {
      break;
    }
  }
  if (!counted) {
    WARN(`${label}: could not query ${collection.name} (type ${collection.type}) for file references. `
      + 'Treat as UNVERIFIED, not as clean.');
    return;
  }
  referencedTotal += count;
  info(`${label}  collection=${collection.name}  rows referencing=${count}  `
    + `present on disk now=${presentOnDisk ? 'yes' : 'no'}${SHOW_NAMES ? `  file=${filename}` : ''}`);
  if (count > 0) {
    FAIL(`${label} is referenced by ${count} row(s) of ${collection.name}. Deleting it leaves those `
      + 'rows naming a file that is gone, so their downloads break. Restore with '
      + `\`git checkout ${baseRef} -- pb_data/storage/\`.`);
  }
});
if (deletions.length && referencedTotal === 0) {
  PASS(`${deletions.length} file(s) removed by the pull, none referenced by any row.`);
}

console.log('\n--- rows per collection (counts only) ---');
for (const collection of collections) {
  if (collection.name.startsWith('_')) continue;
  try {
    info(`${collection.name.padEnd(30)} ${all(`select count(*) as n from "${collection.name}"`)[0].n}`);
  } catch {
    info(`${collection.name.padEnd(30)} (not directly queryable: type ${collection.type})`);
  }
}

console.log('\n--- rollback readiness ---');
const backupsDir = path.join(repoRoot, 'backups');
if (!existsSync(backupsDir)) {
  FAIL('backups/ does not exist, so there is no snapshot to fall back to if the pull or the '
    + 'automigrate goes wrong. Take one first, then prove it restores: a zip that merely contains '
    + 'data.db is not evidence it is usable (see docs/operations/restore-drill-log.md).');
} else {
  const zips = readdirSync(backupsDir).filter((f) => f.endsWith('.zip'));
  if (!zips.length) {
    FAIL('backups/ exists but holds no archive.');
  } else {
    const newest = zips
      .map((f) => ({ f, mtime: statSync(path.join(backupsDir, f)).mtime }))
      .sort((a, b) => b.mtime - a.mtime)[0];
    WARN(`newest archive is dated ${newest.mtime.toISOString().slice(0, 10)}. Age only: `
      + 'scripts/pb-restore-drill.ps1 asserts filenames inside the zip, so a PASS there does not '
      + 'prove the snapshot restores.');
  }
}

db.close();
rmSync(tempDir, { recursive: true, force: true });

console.log('\n=== summary ===');
const counts = { PASS: 0, WARN: 0, FAIL: 0 };
for (const f of findings) counts[f.level] += 1;
for (const f of findings) console.log(`${f.level}  ${f.m}`);
console.log(`\n${counts.PASS} pass, ${counts.WARN} warn, ${counts.FAIL} fail.`);
console.log('Read-only throughout: this opened a throwaway COPY and wrote nothing to pb_data/.');
process.exit(counts.FAIL ? 1 : 0);
