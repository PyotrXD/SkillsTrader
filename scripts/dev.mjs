import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
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

function normalizePort(value, fallback) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    return fallback;
  }

  return String(parsed);
}

function extractPortFromBindAddress(bindAddress, fallbackPort = '8091') {
  const value = bindAddress.trim();
  if (value.length === 0) return fallbackPort;

  if (/^\d+$/u.test(value)) {
    return normalizePort(value, fallbackPort);
  }

  const ipv6Match = value.match(/^\[[^\]]+\]:(\d+)$/u);
  if (ipv6Match?.[1]) {
    return normalizePort(ipv6Match[1], fallbackPort);
  }

  const lastColonIndex = value.lastIndexOf(':');
  if (lastColonIndex === -1 || lastColonIndex === value.length - 1) {
    return fallbackPort;
  }

  return normalizePort(value.slice(lastColonIndex + 1), fallbackPort);
}

function extractHostFromBindAddress(bindAddress) {
  const value = bindAddress.trim();
  if (value.length === 0) return '0.0.0.0';

  if (/^\d+$/u.test(value)) {
    return '0.0.0.0';
  }

  const ipv6Match = value.match(/^\[([^\]]+)\](?::\d+)?$/u);
  if (ipv6Match?.[1]) {
    return ipv6Match[1];
  }

  const lastColonIndex = value.lastIndexOf(':');
  if (lastColonIndex === -1) {
    return value;
  }

  return value.slice(0, lastColonIndex);
}

function allowsLanAccess(bindHost) {
  const normalizedHost = bindHost.trim().replace(/^\[|\]$/gu, '').toLowerCase();
  if (normalizedHost.length === 0) return true;

  if (normalizedHost === '0.0.0.0' || normalizedHost === '::') {
    return true;
  }

  return !(
    normalizedHost === '127.0.0.1' ||
    normalizedHost === 'localhost' ||
    normalizedHost === '::1'
  );
}

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;

  const fileContent = readFileSync(filePath, 'utf8');
  const lines = fileContent.split(/\r?\n/u);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const delimiterIndex = line.indexOf('=');
    if (delimiterIndex === -1) continue;

    const key = line.slice(0, delimiterIndex).trim();
    if (!key || process.env[key] !== undefined) continue;

    let value = line.slice(delimiterIndex + 1).trim();
    const hasDoubleQuotes = value.startsWith('"') && value.endsWith('"');
    const hasSingleQuotes = value.startsWith("'") && value.endsWith("'");
    if ((hasDoubleQuotes || hasSingleQuotes) && value.length >= 2) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function getLanIpv4Addresses() {
  const interfaces = networkInterfaces();
  const addresses = new Set();

  for (const records of Object.values(interfaces)) {
    if (!records) continue;
    for (const record of records) {
      if (record.family !== 'IPv4' || record.internal) continue;
      addresses.add(record.address);
    }
  }

  return Array.from(addresses);
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

function startProcess(command, args, name, options = {}) {
  if (isWindows && (command === 'npm' || command === 'npm.cmd')) {
    const cmdExe = process.env.ComSpec || 'cmd.exe';
    const commandLine = ['npm', ...args].map((argument) => quoteCmdArg(String(argument))).join(' ');
    return startProcess(cmdExe, ['/d', '/s', '/c', commandLine], name, options);
  }

  const child = spawn(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    detached: !isWindows,
    windowsHide: true,
    env: {
      ...process.env,
      ...(options.env ?? {}),
    },
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

loadEnvFile(path.join(repoRoot, '.env'));
loadEnvFile(path.join(repoRoot, 'skillstrader-frontend', '.env'));

const encryptionEnvVar = 'PB_ENCRYPTION_KEY';
const pocketBaseHttp = process.env.PB_HTTP?.trim() || '0.0.0.0:8091';
const pocketBasePort = extractPortFromBindAddress(pocketBaseHttp, '8091');
const pocketBaseHost = extractHostFromBindAddress(pocketBaseHttp);
const frontendHost = process.env.VITE_DEV_HOST?.trim() || '0.0.0.0';
const frontendPort = normalizePort(process.env.VITE_DEV_PORT ?? '5173', '5173');
const frontendEnv = {};

if (!process.env.VITE_POCKETBASE_URL && !process.env.VITE_POCKETBASE_PORT) {
  frontendEnv.VITE_POCKETBASE_PORT = pocketBasePort;
}

const pocketBaseArgs = [
  'serve',
  '--dir',
  'pb_data',
  '--hooksDir',
  'pb_hooks',
  '--http',
  pocketBaseHttp,
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

console.log(`[dev] PocketBase bind address: ${pocketBaseHttp}`);
console.log(`[dev] Frontend bind address: ${frontendHost}:${frontendPort}`);

const lanIpAddresses = getLanIpv4Addresses();
if (lanIpAddresses.length > 0 && allowsLanAccess(frontendHost)) {
  const frontendLanUrls = lanIpAddresses.map((ipAddress) => `http://${ipAddress}:${frontendPort}`).join(', ');
  console.log(`[dev] Frontend LAN URL(s): ${frontendLanUrls}`);
}

if (lanIpAddresses.length > 0 && allowsLanAccess(pocketBaseHost)) {
  const pocketBaseLanUrls = lanIpAddresses.map((ipAddress) => `http://${ipAddress}:${pocketBasePort}`).join(', ');
  console.log(`[dev] PocketBase LAN URL(s): ${pocketBaseLanUrls}`);
}

const pocketBase = startProcess(
  pocketBaseExe,
  pocketBaseArgs,
  'pocketbase',
);
const frontend = startProcess(
  'npm',
  [
    '--prefix',
    'skillstrader-frontend',
    'run',
    'dev',
    '--',
    '--host',
    frontendHost,
    '--port',
    frontendPort,
    '--strictPort',
  ],
  'frontend',
  {
    env: frontendEnv,
  },
);

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
