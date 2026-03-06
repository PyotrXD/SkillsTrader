param(
  [Parameter(Mandatory = $true)]
  [string]$BackupZip,
  [string]$DestDir = "pb_data"
)

$ErrorActionPreference = "Stop"

if (!(Test-Path -LiteralPath $BackupZip)) {
  throw "Backup zip not found: $BackupZip"
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) "skillstrader-pb-restore-$timestamp"
$contentDir = Join-Path $tempDir "content"

New-Item -ItemType Directory -Force -Path $tempDir | Out-Null
New-Item -ItemType Directory -Force -Path $contentDir | Out-Null

Write-Host "Restoring '$BackupZip' -> '$DestDir'"
Write-Host "Stop PocketBase before restoring."

Expand-Archive -LiteralPath $BackupZip -DestinationPath $contentDir -Force

$restoredSource = Join-Path $contentDir "pb_data"
if (!(Test-Path -LiteralPath $restoredSource)) {
  $restoredSource = $contentDir
}

if (Test-Path -LiteralPath $DestDir) {
  $backupOld = "$DestDir.bak-$timestamp"
  Move-Item -LiteralPath $DestDir -Destination $backupOld -Force
  Write-Host "Existing '$DestDir' moved to '$backupOld'"
}

Move-Item -LiteralPath $restoredSource -Destination $DestDir -Force

Remove-Item -LiteralPath $tempDir -Recurse -Force

Write-Host "Done."
