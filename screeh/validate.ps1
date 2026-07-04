[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$NodeVersion = (Get-Content -LiteralPath (Join-Path $Root ".node-version") -TotalCount 1).Trim()
$NodeDir = Join-Path (Join-Path $Root ".runtime") "node-v$NodeVersion-win-x64"
$NpmCmd = Join-Path $NodeDir "npm.cmd"

if (-not (Test-Path -LiteralPath $NpmCmd)) {
  & (Join-Path $Root "setup.ps1") -NodeVersion $NodeVersion
}

$env:PATH = "$NodeDir;$env:PATH"
Push-Location $Root
try {
  & $NpmCmd audit --audit-level=moderate
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }

  & $NpmCmd test
  exit $LASTEXITCODE
} finally {
  Pop-Location
}
