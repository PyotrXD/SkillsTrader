$ErrorActionPreference = "Stop"

function Import-EnvFile {
  param([string]$Path)

  if (!(Test-Path -LiteralPath $Path)) {
    return
  }

  Get-Content -LiteralPath $Path | ForEach-Object {
    $line = $_.Trim()
    if ($line.Length -eq 0 -or $line.StartsWith('#')) {
      return
    }

    $parts = $line -split '=', 2
    if ($parts.Length -ne 2) {
      return
    }

    $name = $parts[0].Trim()
    $value = $parts[1].Trim()
    [System.Environment]::SetEnvironmentVariable($name, $value, "Process")
  }
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

Import-EnvFile -Path ".env"
Import-EnvFile -Path "skillstrader-frontend\\.env"

if ([string]::IsNullOrWhiteSpace($env:PB_ENCRYPTION_KEY) -or $env:PB_ENCRYPTION_KEY.Length -ne 32) {
  throw "PB_ENCRYPTION_KEY must be exactly 32 characters in .env"
}

$pbHttp = if ([string]::IsNullOrWhiteSpace($env:PB_HTTP)) {
  "0.0.0.0:8091"
} else {
  $env:PB_HTTP.Trim()
}

Write-Host "Starting PocketBase on $pbHttp"

& .\\pocketbase.exe serve `
  --http $pbHttp `
  --dir pb_data `
  --hooksDir pb_hooks `
  --publicDir skillstrader-frontend/dist `
  --encryptionEnv PB_ENCRYPTION_KEY
