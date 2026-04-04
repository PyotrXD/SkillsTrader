param(
  [string]$Version,
  [string]$OutputDir = "release\\bin"
)

$ErrorActionPreference = "Stop"

function Resolve-PocketBaseVersion {
  param([string]$RequestedVersion)

  if ($RequestedVersion) {
    return $RequestedVersion.Trim().TrimStart('v')
  }

  $exePath = Join-Path $PSScriptRoot "..\\pocketbase.exe"
  if (!(Test-Path -LiteralPath $exePath)) {
    throw "pocketbase.exe not found at repo root. Provide -Version explicitly."
  }

  $rawVersionLines = & $exePath --version 2>$null
  $rawVersion = ($rawVersionLines | Out-String).Trim()
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($rawVersion)) {
    throw "Unable to read PocketBase version from pocketbase.exe"
  }

  $match = [regex]::Match($rawVersion, "(\d+\.\d+\.\d+)")
  if (!$match.Success) {
    throw "Unexpected PocketBase version output: $rawVersion"
  }

  return $match.Groups[1].Value
}

$resolvedVersion = Resolve-PocketBaseVersion -RequestedVersion $Version
$targetDir = Join-Path $PSScriptRoot "..\\$OutputDir"
New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) "skillstrader-pb-linux-$resolvedVersion"
Remove-Item -LiteralPath $tempDir -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

$zipPath = Join-Path $tempDir "pocketbase_linux.zip"
$url = "https://github.com/pocketbase/pocketbase/releases/download/v$resolvedVersion/pocketbase_${resolvedVersion}_linux_amd64.zip"

Write-Host "Downloading PocketBase Linux binary v$resolvedVersion"
Invoke-WebRequest -Uri $url -OutFile $zipPath

$extractDir = Join-Path $tempDir "extract"
Expand-Archive -LiteralPath $zipPath -DestinationPath $extractDir -Force

$binaryPath = Join-Path $extractDir "pocketbase"
if (!(Test-Path -LiteralPath $binaryPath)) {
  throw "Downloaded archive does not contain pocketbase binary"
}

$destPath = Join-Path $targetDir "pocketbase-linux-x64"
Copy-Item -LiteralPath $binaryPath -Destination $destPath -Force

Remove-Item -LiteralPath $tempDir -Recurse -Force
Write-Host "Saved Linux binary to $destPath"
