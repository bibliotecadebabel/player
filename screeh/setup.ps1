[CmdletBinding()]
param(
  [string]$NodeVersion = "24.14.1",
  [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$RuntimeDir = Join-Path $Root ".runtime"
$CacheDir = Join-Path $RuntimeDir "cache"
$NodeName = "node-v$NodeVersion-win-x64"
$NodeDir = Join-Path $RuntimeDir $NodeName
$NodeZip = Join-Path $CacheDir "$NodeName.zip"
$ShaFile = Join-Path $CacheDir "SHASUMS256.txt"
$NodeBaseUrl = "https://nodejs.org/dist/v$NodeVersion"

New-Item -ItemType Directory -Force -Path $RuntimeDir, $CacheDir | Out-Null

if (-not (Test-Path -LiteralPath (Join-Path $NodeDir "node.exe"))) {
  if (-not (Test-Path -LiteralPath $NodeZip)) {
    Write-Host "Downloading Node.js $NodeVersion..."
    Invoke-WebRequest -Uri "$NodeBaseUrl/$NodeName.zip" -OutFile $NodeZip
  }

  if (-not (Test-Path -LiteralPath $ShaFile)) {
    Invoke-WebRequest -Uri "$NodeBaseUrl/SHASUMS256.txt" -OutFile $ShaFile
  }

  $match = Select-String -Path $ShaFile -SimpleMatch "$NodeName.zip" | Select-Object -First 1
  if (-not $match) {
    throw "Could not find checksum entry for $NodeName.zip."
  }

  $expected = (($match.Line -split "\s+")[0]).ToLowerInvariant()
  $actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $NodeZip).Hash.ToLowerInvariant()
  if ($actual -ne $expected) {
    throw "Node.js archive checksum mismatch. Expected $expected but got $actual."
  }

  Write-Host "Extracting Node.js $NodeVersion..."
  Expand-Archive -LiteralPath $NodeZip -DestinationPath $RuntimeDir -Force
}

$env:PATH = "$NodeDir;$env:PATH"

Write-Host "Using Node:" (& (Join-Path $NodeDir "node.exe") -v)
Write-Host "Using npm:" (& (Join-Path $NodeDir "npm.cmd") -v)

if (-not $SkipInstall) {
  Push-Location $Root
  try {
    & (Join-Path $NodeDir "npm.cmd") install
  } finally {
    Pop-Location
  }
}

$ffmpegPath = & (Join-Path $NodeDir "node.exe") -e "process.stdout.write(require('ffmpeg-static'))"
if (-not (Test-Path -LiteralPath $ffmpegPath)) {
  throw "Bundled ffmpeg was not installed. Run setup again and check npm install output."
}

$ffmpegVersion = & $ffmpegPath -hide_banner -version | Select-Object -First 1
Write-Host "Using ffmpeg: $ffmpegPath"
Write-Host $ffmpegVersion
Write-Host "Setup complete. Start the app with: powershell -ExecutionPolicy Bypass -File .\start.ps1"
