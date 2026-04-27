param(
  [string]$HealthUrl = "http://127.0.0.1:8091/api/health",
  [int]$TimeoutSec = 10
)

$ErrorActionPreference = "Stop"

try {
  $response = Invoke-WebRequest -Uri $HealthUrl -Method Get -TimeoutSec $TimeoutSec
  if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
    Write-Host "PocketBase healthcheck OK ($($response.StatusCode))"
    exit 0
  }

  Write-Error "PocketBase healthcheck failed with HTTP $($response.StatusCode)"
  exit 1
}
catch {
  Write-Error "PocketBase healthcheck failed: $($_.Exception.Message)"
  exit 1
}
