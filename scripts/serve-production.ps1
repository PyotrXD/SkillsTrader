param(
  [string]$Http = "127.0.0.1:8091",
  [string]$DataDir = "pb_data",
  [string]$HooksDir = "pb_hooks",
  [string]$PublicDir = "skillstrader-frontend/dist",
  [string]$EncryptionEnv = "PB_ENCRYPTION_KEY"
)

$ErrorActionPreference = "Stop"

function Get-LanIPv4Addresses {
  $ipAddresses = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
      $_.IPAddress -ne "127.0.0.1" -and
      $_.IPAddress -notlike "169.254.*" -and
      $_.ValidLifetime -gt ([TimeSpan]::Zero)
    } |
    Select-Object -ExpandProperty IPAddress -Unique

  return @($ipAddresses)
}

$key = [Environment]::GetEnvironmentVariable($EncryptionEnv, "Process")
if ([string]::IsNullOrWhiteSpace($key)) {
  $key = [Environment]::GetEnvironmentVariable($EncryptionEnv, "User")
}
if ([string]::IsNullOrWhiteSpace($key)) {
  $key = [Environment]::GetEnvironmentVariable($EncryptionEnv, "Machine")
}
if ([string]::IsNullOrWhiteSpace($key)) {
  throw "$EncryptionEnv is required for production startup."
}

if ($key.Length -ne 32) {
  throw "$EncryptionEnv must be exactly 32 characters long. Current length: $($key.Length)."
}

[Environment]::SetEnvironmentVariable($EncryptionEnv, $key, "Process")

if (!(Test-Path -LiteralPath ".\pocketbase.exe")) {
  throw "pocketbase.exe not found in repository root."
}

if (!(Test-Path -LiteralPath $DataDir)) {
  throw "Data directory not found: $DataDir"
}

if (!(Test-Path -LiteralPath $HooksDir)) {
  throw "Hooks directory not found: $HooksDir"
}

if (!(Test-Path -LiteralPath $PublicDir)) {
  throw "Public build directory not found: $PublicDir"
}

$listenHost = $Http
$listenPort = "8091"
if ($Http -match "^(.*):(\d+)$") {
  $listenHost = $Matches[1]
  $listenPort = $Matches[2]
}

Write-Host "Starting PocketBase in production mode on $Http..."
Write-Host "Using encryption key from env: $EncryptionEnv"

$lanIPs = Get-LanIPv4Addresses
if ($lanIPs.Count -gt 0) {
  Write-Host "Detected LAN endpoint(s):"
  foreach ($ip in $lanIPs) {
    Write-Host "  http://$ip`:$listenPort"
  }
} else {
  Write-Host "No active LAN IPv4 address detected on this machine."
}

if ($listenHost -eq "127.0.0.1" -or $listenHost -eq "localhost") {
  Write-Host "Loopback-only binding detected. For LAN access, start with -Http `"0.0.0.0:$listenPort`"."
}

& .\pocketbase.exe serve `
  --http $Http `
  --dir $DataDir `
  --hooksDir $HooksDir `
  --publicDir $PublicDir `
  --encryptionEnv $EncryptionEnv
