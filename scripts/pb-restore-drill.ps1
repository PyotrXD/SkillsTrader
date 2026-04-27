param(
  [Parameter(Mandatory = $true)]
  [string]$BackupZip,
  [string]$LogPath = "docs/operations/restore-drill-log.md"
)

$ErrorActionPreference = "Stop"

if (!(Test-Path -LiteralPath $BackupZip)) {
  throw "Backup zip not found: $BackupZip"
}

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("skillstrader-restore-drill-" + [guid]::NewGuid().ToString("N"))
$extractDir = Join-Path $tempRoot "extract"

New-Item -ItemType Directory -Force -Path $extractDir | Out-Null

$status = "PASS"
$notes = ""

try {
  Expand-Archive -LiteralPath $BackupZip -DestinationPath $extractDir -Force

  $candidateRoot = Join-Path $extractDir "pb_data"
  if (!(Test-Path -LiteralPath $candidateRoot)) {
    $candidateRoot = $extractDir
  }

  $dataDb = Join-Path $candidateRoot "data.db"
  $auxDb = Join-Path $candidateRoot "auxiliary.db"
  $storageDir = Join-Path $candidateRoot "storage"

  if (!(Test-Path -LiteralPath $dataDb)) { throw "Missing data.db in backup." }
  if (!(Test-Path -LiteralPath $auxDb)) { throw "Missing auxiliary.db in backup." }
  if (!(Test-Path -LiteralPath $storageDir)) { throw "Missing storage/ directory in backup." }

  $notes = "Validated backup archive structure and required files."
}
catch {
  $status = "FAIL"
  $notes = $_.Exception.Message
}
finally {
  if (Test-Path -LiteralPath $tempRoot) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force
  }
}

if (!(Test-Path -LiteralPath $LogPath)) {
  $header = @"
# Restore Drill Log

| Date (UTC+8) | Result | Backup | Notes |
|---|---|---|---|
"@
  Set-Content -Path $LogPath -Value $header -Encoding utf8
}

$row = "| $timestamp | $status | `$BackupZip` | $notes |"
Add-Content -Path $LogPath -Value $row -Encoding utf8

if ($status -eq "FAIL") {
  throw "Restore drill failed: $notes"
}

Write-Host "Restore drill completed successfully. Log updated at $LogPath"
