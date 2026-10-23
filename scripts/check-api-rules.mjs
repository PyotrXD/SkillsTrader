#!/usr/bin/env node
// Asserts the effective PocketBase API rules for every governed collection, and proves the
// rollback path restores the recorded prior state instead of widening access.
//
// Why this exists (docs/system-improvements.md S3): API rules are the real authorization
// boundary in this system, and nothing verified them. A migration could quietly widen a delete
// and no test would notice. It also exists to disprove the easy mistake: an unauthenticated
// list call returns 200 with `items: []` both when a rule denies everything and when the table
// is simply empty, so a status code is not evidence. Reading `_collections` is.
//
// It never opens the live pb_data/. It replays the whole pb_migrations/ chain into a throwaway
// directory, asserts against that, and deletes it. That also means it needs no superuser and no
// running server, so it is safe to run at any time and safe to put in CI.
//
//   node scripts/check-api-rules.mjs            # assert up + rollback + re-apply
//   node scripts/check-api-rules.mjs --live     # also diff against the real pb_data/data.db
//
// Override the binary with POCKETBASE_BIN=/path/to/pocketbase.
import { DatabaseSync } from 'node:sqlite';
import { execFileSync } from 'node:child_process';
import { rmSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = path.resolve(import.meta.dirname, '..');
const RULES = ['listRule', 'viewRule', 'createRule', 'updateRule', 'deleteRule'];

const BINARY =
  process.env.POCKETBASE_BIN ||
  path.join(repoRoot, process.platform === 'win32' ? 'pocketbase.exe' : 'pocketbase');

if (!existsSync(BINARY)) {
  console.error(
    `PocketBase binary not found at ${BINARY}\n` +
      'Set POCKETBASE_BIN to a pocketbase executable, or restore ./pocketbase.exe.\n' +
      'This check refuses to skip silently: an unchecked authorization boundary is the finding.',
  );
  process.exit(2);
}

const READ =
  "@request.auth.id != '' && (@request.auth.role = 'administrator' || @request.auth.role = 'manager' || @request.auth.role = 'staff')";
const MANAGER =
  "@request.auth.id != '' && (@request.auth.role = 'administrator' || @request.auth.role = 'manager')";
const ADMIN = "@request.auth.id != '' && @request.auth.role = 'administrator'";
const BARE = "@request.auth.id != ''";
const SELF_OR_ADMIN = "@request.auth.id != '' && (@request.auth.role = 'administrator' || id = @request.auth.id)";

// What the rules MUST be after the full chain has been applied. Anything not listed here is
// not asserted, so this is a floor rather than a complete map.
const EXPECTED = {
  interviews: { listRule: READ, viewRule: READ, createRule: MANAGER, updateRule: MANAGER, deleteRule: MANAGER },
  placements: { listRule: READ, viewRule: READ, createRule: MANAGER, updateRule: MANAGER, deleteRule: MANAGER },
  job_orders: { listRule: READ, viewRule: READ, deleteRule: MANAGER },
  candidates_legacy: { listRule: READ, viewRule: READ, createRule: READ, updateRule: READ, deleteRule: ADMIN },
  employer: { deleteRule: MANAGER },
  positions: { deleteRule: MANAGER },
  // Hook-write-only. null is PocketBase's "no API access"; the old always-false expression is gone.
  audit_logs: { listRule: ADMIN, viewRule: ADMIN, createRule: null, updateRule: null, deleteRule: null },
  // Already hardened before this migration; asserted so a future migration cannot quietly widen them.
  candidates: { listRule: READ, viewRule: READ, deleteRule: ADMIN },
  documents: { listRule: READ, viewRule: READ, deleteRule: ADMIN },
  candidate_work_experiences: { listRule: READ, viewRule: READ, createRule: MANAGER, updateRule: MANAGER, deleteRule: MANAGER },
  candidate_educations: { listRule: READ, viewRule: READ, createRule: MANAGER, updateRule: MANAGER, deleteRule: MANAGER },
  users: { createRule: ADMIN, deleteRule: ADMIN },
};

// The state the migration under review recorded as "before", so a rollback can be proven not
// to open anything up. Only collections changed by 1793000000 are rolled back and checked.
const PRIOR = {
  interviews: { listRule: BARE, viewRule: BARE, createRule: BARE, updateRule: BARE, deleteRule: BARE },
  placements: { listRule: BARE, viewRule: BARE, createRule: BARE, updateRule: BARE, deleteRule: BARE },
  job_orders: { listRule: BARE, viewRule: BARE, createRule: BARE, updateRule: BARE, deleteRule: BARE },
  candidates_legacy: { listRule: BARE, viewRule: BARE, createRule: BARE, updateRule: BARE, deleteRule: BARE },
  employer: { listRule: READ, viewRule: READ, createRule: READ, updateRule: READ, deleteRule: READ },
  positions: { listRule: '', viewRule: '', createRule: BARE, updateRule: BARE, deleteRule: BARE },
  audit_logs: {
    listRule: ADMIN,
    viewRule: ADMIN,
    createRule: "@request.auth.id != '' && @request.auth.id = ''",
    updateRule: "@request.auth.id != '' && @request.auth.id = ''",
    deleteRule: "@request.auth.id != '' && @request.auth.id = ''",
  },
};

const throwaway = path.join(repoRoot, '.qwen', 'tmp', 'pbrules-check');
let failures = 0;

function runMigrate(args) {
  // `migrate down` asks "Do you really want to revert...? (y/N)" and there is no --force flag.
  // Feeding it a closed stdin does NOT error -- it reads EOF as "no", exits 0, and reverts
  // nothing. An access-control check that silently no-ops its rollback is worse than one that
  // fails, so confirmation is piped explicitly and the result is asserted either way.
  const needsConfirm = args[1] === 'down';
  return execFileSync(BINARY, [...args, '--dir', throwaway, '--migrationsDir', 'pb_migrations'], {
    cwd: repoRoot,
    encoding: 'utf8',
    input: needsConfirm ? 'y\n' : '',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

function readRules(dbPath) {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  const rows = db
    .prepare(`select name, ${RULES.join(', ')} from _collections`)
    .all();
  db.close();
  const out = {};
  for (const r of rows) out[r.name] = Object.fromEntries(RULES.map((k) => [k, r[k]]));
  return out;
}

function assertMap(label, actual, want) {
  if (!actual) {
    failures++;
    console.error(`  FAIL ${label}: collection missing`);
    return;
  }
  for (const [collection, rules] of Object.entries(want)) {
    for (const [rule, expected] of Object.entries(rules)) {
      const got = actual[collection]?.[rule];
      if (got !== expected) {
        failures++;
        console.error(
          `  FAIL ${label} ${collection}.${rule}\n     got:  ${JSON.stringify(got)}\n     want: ${JSON.stringify(expected)}`,
        );
      }
    }
  }
}

rmSync(throwaway, { recursive: true, force: true });

console.log('replaying pb_migrations/ into a throwaway directory...');
runMigrate(['migrate', 'up']);
const applied = readRules(path.join(throwaway, 'data.db'));
assertMap('up', applied, EXPECTED);
console.log(failures === 0 ? '  OK  applied rules match the expected tiers' : `  ${failures} mismatch(es) on apply`);

const beforeRollback = failures;
console.log('rolling back one migration and re-checking...');
runMigrate(['migrate', 'down', '1']);
assertMap('down', readRules(path.join(throwaway, 'data.db')), PRIOR);
console.log(
  failures === beforeRollback
    ? '  OK  rollback restores the recorded prior state exactly'
    : `  ${failures - beforeRollback} mismatch(es) on rollback`,
);

const beforeReapply = failures;
console.log('re-applying...');
runMigrate(['migrate', 'up']);
assertMap('re-apply', readRules(path.join(throwaway, 'data.db')), EXPECTED);
console.log(
  failures === beforeReapply ? '  OK  re-apply is idempotent' : `  ${failures - beforeReapply} mismatch(es) on re-apply`,
);

rmSync(throwaway, { recursive: true, force: true });

// --live compares the same expectations against the database the app is actually running
// against, so drift between "what migrations say" and "what the server enforces" is visible.
if (process.argv.includes('--live')) {
  const live = path.join(repoRoot, 'pb_data', 'data.db');
  if (!existsSync(live)) {
    console.log('\n--live requested but pb_data/data.db is absent; nothing to compare.');
  } else {
    console.log('\ncomparing against the live pb_data/data.db (read-only)...');
    const liveRules = readRules(live);
    const lags = [];
    for (const [collection, rules] of Object.entries(EXPECTED)) {
      for (const [rule, expected] of Object.entries(rules)) {
        if (liveRules[collection]?.[rule] !== expected) {
          lags.push(`${collection}.${rule}: live=${JSON.stringify(liveRules[collection]?.[rule])} expected=${JSON.stringify(expected)}`);
        }
      }
    }
    if (lags.length === 0) {
      console.log('  OK  live database already matches the migration chain');
    } else {
      console.log(`  ${lags.length} difference(s) — the live DB has not run the newest migrations yet:`);
      for (const l of lags) console.log(`   - ${l}`);
    }
  }
}

if (failures > 0) {
  console.error(`\nRESULT: FAIL (${failures} assertion(s))`);
  process.exit(1);
}
console.log('\nRESULT: PASS — API rules verified for apply, rollback and re-apply.');
