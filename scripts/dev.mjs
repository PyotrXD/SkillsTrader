import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const isWindows = process.platform === 'win32';
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

function quoteCmdArg(value) {
  if (!value) return '""';
  if (!/[\s"]/u.test(value)) return value;
  return `"${value.replaceAll('"', '\\"')}"`;
}

function killProcessTree(child) {
  if (!child?.pid) return;

  if (isWindows) {
    spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    return;
  }

  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    try {
      child.kill('SIGTERM');
    } catch {
      // ignore
    }
  }
}

function startProcess(command, args, name) {
  if (isWindows && (command === 'npm' || command === 'npm.cmd')) {
    const cmdExe = process.env.ComSpec || 'cmd.exe';
    const commandLine = ['npm', ...args].map(quoteCmdArg).join(' ');
    return startProcess(cmdExe, ['/d', '/s', '/c', commandLine], name);
  }

  const child = spawn(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    detached: !isWindows,
    windowsHide: true,
  });

  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    const reason = signal ? `signal ${signal}` : `code ${code ?? 0}`;
    console.log(`\n[dev] ${name} exited (${reason}); shutting down...`);
    shutdown(code ?? 0);
  });

  return child;
}

function ensureFrontendDependencies() {
  const npmArgs = ['--prefix', 'skillstrader-frontend', 'ls', '--depth=0'];
  const check = isWindows
    ? spawnSync(
        process.env.ComSpec || 'cmd.exe',
        ['/d', '/s', '/c', ['npm', ...npmArgs].map(quoteCmdArg).join(' ')],
        {
          cwd: repoRoot,
          stdio: 'ignore',
          windowsHide: true,
        },
      )
    : spawnSync('npm', npmArgs, {
        cwd: repoRoot,
        stdio: 'ignore',
        windowsHide: true,
      });

  if (check.status === 0) {
    return;
  }

  console.error('[dev] Frontend dependencies are missing or out of sync.');
  console.error('[dev] Run one of the following, then retry:');
  console.error('[dev]   npm run setup');
  console.error('[dev]   npm run setup:frontend');
  process.exit(check.status ?? 1);
}

const pocketBaseExe = isWindows
  ? path.join(repoRoot, 'pocketbase.exe')
  : path.join(repoRoot, 'pocketbase');

const encryptionEnvVar = 'PB_ENCRYPTION_KEY';
const pocketBaseArgs = [
  'serve',
  '--dir',
  'pb_data',
  '--hooksDir',
  'pb_hooks',
  '--http',
  '127.0.0.1:8091',
];

const encryptionKey = process.env[encryptionEnvVar];
if (encryptionKey) {
  if (encryptionKey.length === 32) {
    pocketBaseArgs.push('--encryptionEnv', encryptionEnvVar);
  } else {
    console.warn(
      `[dev] ${encryptionEnvVar} is set but not 32 characters (${encryptionKey.length}); skipping --encryptionEnv`,
    );
  }
}

ensureFrontendDependencies();

const pocketBase = startProcess(
  pocketBaseExe,
  pocketBaseArgs,
  'pocketbase',
);
const frontend = startProcess('npm', ['--prefix', 'skillstrader-frontend', 'run', 'dev'], 'frontend');

let shuttingDown = false;
function shutdown(exitCode) {
  if (shuttingDown) return;
  shuttingDown = true;
  killProcessTree(frontend);
  killProcessTree(pocketBase);
  process.exit(exitCode);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
