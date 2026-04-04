import { cpSync, existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { chmodSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const frontendDist = path.join(repoRoot, 'skillstrader-frontend', 'dist');
const releaseRoot = path.join(repoRoot, 'release');
const releaseDist = path.join(releaseRoot, 'dist');
const stagingRoot = path.join(releaseRoot, '.staging');
const templateRoot = path.join(releaseRoot, 'templates');
const linuxBinFallback = path.join(releaseRoot, 'bin', 'pocketbase-linux-x64');

function run(command, args, options = {}) {
  const executable = process.platform === 'win32' && command === 'npm' ? 'npm.cmd' : command;

  const result = spawnSync(executable, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: false,
    ...options,
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${executable} ${args.join(' ')}`);
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    targets: ['win', 'linux'],
    build: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--build') {
      options.build = true;
      continue;
    }

    if (arg.startsWith('--targets=')) {
      const value = arg.split('=')[1] ?? '';
      options.targets = value
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);
      continue;
    }

    if (arg === '--target') {
      const next = args[i + 1];
      if (!next) {
        throw new Error('--target requires a value');
      }
      options.targets = [next.trim().toLowerCase()];
      i += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (options.targets.length === 0) {
    throw new Error('No targets specified. Use --target or --targets=win,linux');
  }

  for (const target of options.targets) {
    if (target !== 'win' && target !== 'linux') {
      throw new Error(`Unsupported target: ${target}`);
    }
  }

  return options;
}

function ensureFrontendBuilt() {
  if (!existsSync(frontendDist)) {
    throw new Error('Missing skillstrader-frontend/dist. Run `npm run build` first or pass --build.');
  }
}

function ensureLinuxBinary() {
  const linuxBinRoot = path.join(repoRoot, 'pocketbase');
  if (existsSync(linuxBinRoot)) {
    return linuxBinRoot;
  }

  if (existsSync(linuxBinFallback)) {
    return linuxBinFallback;
  }

  if (process.platform === 'win32') {
    const scriptPath = path.join(repoRoot, 'scripts', 'download-pocketbase-linux.ps1');
    console.log('[package] Linux PocketBase binary not found. Downloading via PowerShell helper...');
    run('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath]);
    if (existsSync(linuxBinFallback)) {
      return linuxBinFallback;
    }
  }

  throw new Error('Missing Linux PocketBase binary. Place it at release/bin/pocketbase-linux-x64 or repo root as ./pocketbase.');
}

function copyCommonBundleFiles(targetRoot) {
  const frontendTarget = path.join(targetRoot, 'skillstrader-frontend');
  mkdirSync(frontendTarget, { recursive: true });

  cpSync(path.join(repoRoot, 'pb_hooks'), path.join(targetRoot, 'pb_hooks'), { recursive: true });
  cpSync(path.join(repoRoot, 'pb_migrations'), path.join(targetRoot, 'pb_migrations'), { recursive: true });
  cpSync(frontendDist, path.join(frontendTarget, 'dist'), { recursive: true });
  cpSync(path.join(repoRoot, '.env.example'), path.join(targetRoot, '.env.example'));
  cpSync(path.join(repoRoot, 'skillstrader-frontend', '.env.example'), path.join(frontendTarget, '.env.example'));
  cpSync(path.join(repoRoot, 'scripts', 'pb-backup.ps1'), path.join(targetRoot, 'pb-backup.ps1'));
  cpSync(path.join(repoRoot, 'scripts', 'pb-restore.ps1'), path.join(targetRoot, 'pb-restore.ps1'));
  cpSync(path.join(releaseRoot, 'README-deploy.md'), path.join(targetRoot, 'README-deploy.md'));
}

function stageTarget(target) {
  const stageDir = path.join(stagingRoot, target);
  const bundleRoot = path.join(stageDir, 'skillstrader');

  rmSync(stageDir, { recursive: true, force: true });
  mkdirSync(bundleRoot, { recursive: true });

  copyCommonBundleFiles(bundleRoot);

  if (target === 'win') {
    const sourceExe = path.join(repoRoot, 'pocketbase.exe');
    if (!existsSync(sourceExe)) {
      throw new Error('Missing pocketbase.exe at repo root for Windows bundle.');
    }

    cpSync(sourceExe, path.join(bundleRoot, 'pocketbase.exe'));
    cpSync(path.join(templateRoot, 'windows', 'install.ps1'), path.join(bundleRoot, 'install.ps1'));
    cpSync(path.join(templateRoot, 'windows', 'start.ps1'), path.join(bundleRoot, 'start.ps1'));
  }

  if (target === 'linux') {
    const sourceLinuxBinary = ensureLinuxBinary();
    const linuxBinaryOut = path.join(bundleRoot, 'pocketbase');

    cpSync(sourceLinuxBinary, linuxBinaryOut);
    cpSync(path.join(templateRoot, 'linux', 'install.sh'), path.join(bundleRoot, 'install.sh'));
    cpSync(path.join(templateRoot, 'linux', 'start.sh'), path.join(bundleRoot, 'start.sh'));
    cpSync(path.join(templateRoot, 'linux', 'skillstrader.service'), path.join(bundleRoot, 'skillstrader.service'));

    chmodSync(linuxBinaryOut, 0o755);
    chmodSync(path.join(bundleRoot, 'install.sh'), 0o755);
    chmodSync(path.join(bundleRoot, 'start.sh'), 0o755);
  }

  return stageDir;
}

function createZip(sourceDir, destinationZip) {
  rmSync(destinationZip, { force: true });

  if (process.platform === 'win32') {
    const command = `Compress-Archive -Path '${sourceDir}\\*' -DestinationPath '${destinationZip}' -CompressionLevel Optimal`;
    run('powershell', ['-NoProfile', '-Command', command]);
    return;
  }

  if (process.platform === 'linux' || process.platform === 'darwin') {
    const folder = path.basename(sourceDir);
    const parent = path.dirname(sourceDir);
    run('zip', ['-r', destinationZip, folder], { cwd: parent });
    return;
  }

  throw new Error(`Unsupported OS for zip creation: ${process.platform}`);
}

function verifyDist(target, zipPath) {
  const stats = statSync(zipPath);
  if (!stats.isFile() || stats.size === 0) {
    throw new Error(`Failed to create ${target} bundle at ${zipPath}`);
  }
}

function main() {
  const options = parseArgs();

  if (options.build) {
    console.log('[package] Building frontend...');
    run('npm', ['run', 'build']);
  }

  ensureFrontendBuilt();

  mkdirSync(releaseDist, { recursive: true });
  mkdirSync(stagingRoot, { recursive: true });

  for (const target of options.targets) {
    console.log(`[package] Preparing ${target} bundle...`);
    const stageDir = stageTarget(target);
    const outputName = target === 'win' ? 'skillstrader-win-x64.zip' : 'skillstrader-linux-x64.zip';
    const outputPath = path.join(releaseDist, outputName);

    createZip(path.join(stageDir, 'skillstrader'), outputPath);
    verifyDist(target, outputPath);
    console.log(`[package] Created ${outputPath}`);
  }

  console.log('[package] Done.');
}

main();
