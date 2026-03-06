param(
  [string]$SourceDir = "pb_data",
  [string]$BackupDir = "backups"
)

$ErrorActionPreference = "Stop"

if (!(Test-Path -LiteralPath $SourceDir)) {
  throw "Source directory not found: $SourceDir"
}

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = Join-Path $BackupDir "pb_data-$timestamp.zip"

Write-Host "Backing up '$SourceDir' -> '$backupPath'"
Write-Host "For a consistent backup, stop PocketBase before running this script."

Compress-Archive -Path $SourceDir -DestinationPath $backupPath -CompressionLevel Optimal

Write-Host "Done."
