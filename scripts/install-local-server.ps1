param(
  [string]$PocketBaseUrl,
  [string]$EncryptionEnv = "PB_ENCRYPTION_KEY",
  [switch]$SkipBuild,
  [switch]$SetMachineEncryptionKey
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Invoke-CheckedCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath,
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments,
    [Parameter(Mandatory = $true)]
    [string]$FailureMessage
  )

  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw $FailureMessage
  }
}

function Get-CommandPath {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name
  )

  $cmd = Get-Command $Name -ErrorAction SilentlyContinue
  if ($null -eq $cmd) {
    return $null
  }

  return $cmd.Path
}

function Get-PrivateLanIpv4 {
  $addresses = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
      $_.IPAddress -ne "127.0.0.1" -and
      $_.IPAddress -notlike "169.254.*" -and
      $_.ValidLifetime -gt ([TimeSpan]::Zero)
    } |
    Sort-Object -Property SkipAsSource, InterfaceMetric

  foreach ($entry in $addresses) {
    if ($entry.IPAddress -match "^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)") {
      return $entry.IPAddress
    }
  }

  foreach ($entry in $addresses) {
    return $entry.IPAddress
  }

  return $null
}

function New-EncryptionKey32 {
  $bytes = New-Object byte[] 16
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $rng.GetBytes($bytes)
  }
  finally {
    $rng.Dispose()
  }
  return -join ($bytes | ForEach-Object { $_.ToString("x2") })
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir "..")
Set-Location $repoRoot

Write-Host "Repository root: $repoRoot"

$nodePath = Get-CommandPath -Name "node"
if ([string]::IsNullOrWhiteSpace($nodePath)) {
  throw "Node.js is required but not found in PATH. Install Node.js 20+ and rerun this script."
}

$npmPath = Get-CommandPath -Name "npm"
if ([string]::IsNullOrWhiteSpace($npmPath)) {
  throw "npm is required but not found in PATH. Reinstall Node.js 20+ and rerun this script."
}

$nodeVersionRaw = (& node --version).Trim()
if ($nodeVersionRaw -notmatch "^v(\d+)\.") {
  throw "Could not parse Node.js version: '$nodeVersionRaw'"
}

$nodeMajor = [int]$Matches[1]
if ($nodeMajor -lt 20) {
  throw "Node.js 20+ is required. Current version: $nodeVersionRaw"
}

if (!(Test-Path -LiteralPath ".\pocketbase.exe")) {
  throw "pocketbase.exe not found in repository root."
}

if (!(Test-Path -LiteralPath ".\skillstrader-frontend\package.json")) {
  throw "Frontend package.json not found at skillstrader-frontend\package.json."
}

if ([string]::IsNullOrWhiteSpace($PocketBaseUrl)) {
  $lanIp = Get-PrivateLanIpv4
  if ([string]::IsNullOrWhiteSpace($lanIp)) {
    $PocketBaseUrl = "http://127.0.0.1:8091"
  } else {
    $PocketBaseUrl = "http://$lanIp`:8091"
  }
}

$envFile = Join-Path $repoRoot "skillstrader-frontend\.env.production"
Set-Content -Path $envFile -Value "VITE_POCKETBASE_URL=$PocketBaseUrl" -Encoding ascii
Write-Host "Wrote frontend production env: $envFile"
Write-Host "VITE_POCKETBASE_URL=$PocketBaseUrl"

$existingKey =
  [Environment]::GetEnvironmentVariable($EncryptionEnv, "Process")
if ([string]::IsNullOrWhiteSpace($existingKey)) {
  $existingKey = [Environment]::GetEnvironmentVariable($EncryptionEnv, "User")
}
if ([string]::IsNullOrWhiteSpace($existingKey)) {
  $existingKey = [Environment]::GetEnvironmentVariable($EncryptionEnv, "Machine")
}

if ([string]::IsNullOrWhiteSpace($existingKey)) {
  $newKey = New-EncryptionKey32
  $scope = "User"
  if ($SetMachineEncryptionKey) {
    $scope = "Machine"
  }

  [Environment]::SetEnvironmentVariable($EncryptionEnv, $newKey, $scope)
  [Environment]::SetEnvironmentVariable($EncryptionEnv, $newKey, "Process")
  Write-Host "Created new $EncryptionEnv in $scope scope."
} elseif ($existingKey.Length -ne 32) {
  throw "$EncryptionEnv exists but is not 32 characters (current length: $($existingKey.Length)). Fix it and rerun."
} else {
  [Environment]::SetEnvironmentVariable($EncryptionEnv, $existingKey, "Process")
  Write-Host "Using existing $EncryptionEnv from environment."
}

Write-Host "Installing root dependencies..."
Invoke-CheckedCommand -FilePath "npm" -Arguments @("ci") -FailureMessage "Root npm install failed."

Write-Host "Installing frontend dependencies..."
Invoke-CheckedCommand -FilePath "npm" -Arguments @("--prefix", "skillstrader-frontend", "ci") -FailureMessage "Frontend npm install failed."

if (-not $SkipBuild) {
  Write-Host "Building frontend for production..."
  Invoke-CheckedCommand -FilePath "npm" -Arguments @("run", "build") -FailureMessage "Frontend production build failed."
}

Write-Host ""
Write-Host "Installation complete."
Write-Host "Next steps:"
Write-Host "1) Start server for LAN access:"
Write-Host "   powershell -ExecutionPolicy Bypass -File scripts/serve-production.ps1 -Http `"0.0.0.0:8091`""
Write-Host "2) Create admin (first deployment only):"
Write-Host "   .\pocketbase.exe superuser upsert admin@local.lan StrongPassword123! --dir pb_data"
Write-Host "3) Open from LAN client:"
Write-Host "   $PocketBaseUrl"
