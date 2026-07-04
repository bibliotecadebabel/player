[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$NodeVersion = (Get-Content -LiteralPath (Join-Path $Root ".node-version") -TotalCount 1).Trim()
$NodeDir = Join-Path (Join-Path $Root ".runtime") "node-v$NodeVersion-win-x64"
$NodeExe = Join-Path $NodeDir "node.exe"
$NpmCmd = Join-Path $NodeDir "npm.cmd"

if (-not (Test-Path -LiteralPath $NodeExe) -or -not (Test-Path -LiteralPath (Join-Path $Root "node_modules\electron"))) {
  & (Join-Path $Root "setup.ps1") -NodeVersion $NodeVersion
}

$env:PATH = "$NodeDir;$env:PATH"
Push-Location $Root
try {
  & $NpmCmd start
  exit $LASTEXITCODE
} finally {
  Pop-Location
}
