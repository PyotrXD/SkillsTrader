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
