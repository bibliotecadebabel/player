param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$NpmArgs
)

$ErrorActionPreference = 'Stop'

$NodeVersion = '24.15.0'
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$ToolsRoot = Join-Path $ProjectRoot '.tools'
$NodeDir = Join-Path $ToolsRoot "node-v$NodeVersion-win-x64"
$NodeExe = Join-Path $NodeDir 'node.exe'
$NpmCli = Join-Path $NodeDir 'node_modules\npm\bin\npm-cli.js'

if (-not (Test-Path -LiteralPath $NodeExe)) {
  New-Item -ItemType Directory -Force -Path $ToolsRoot | Out-Null

  $ArchivePath = Join-Path $ToolsRoot "node-v$NodeVersion-win-x64.zip"
  $DownloadUrl = "https://nodejs.org/dist/v$NodeVersion/node-v$NodeVersion-win-x64.zip"

  Write-Host "Downloading Node.js $NodeVersion to $ToolsRoot..."
  Invoke-WebRequest -Uri $DownloadUrl -OutFile $ArchivePath
  Expand-Archive -Path $ArchivePath -DestinationPath $ToolsRoot -Force
}

if (-not (Test-Path -LiteralPath $NpmCli)) {
  throw "npm CLI was not found in $NodeDir"
}

if (-not $NpmArgs -or $NpmArgs.Count -eq 0) {
  $NpmArgs = @('--version')
}

$env:PATH = "$NodeDir;$env:PATH"
& $NodeExe $NpmCli @NpmArgs
exit $LASTEXITCODE
