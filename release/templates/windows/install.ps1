param(
  [switch]$InitializeEnv
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

if (!(Test-Path -LiteralPath "pb_data")) {
  New-Item -ItemType Directory -Path "pb_data" | Out-Null
  Write-Host "Created pb_data directory"
}

if ($InitializeEnv -and !(Test-Path -LiteralPath ".env")) {
  Copy-Item -LiteralPath ".env.example" -Destination ".env"
  Write-Host "Created .env from .env.example"
}

Write-Host "Install complete. Next step: configure .env and run .\\start.ps1"
