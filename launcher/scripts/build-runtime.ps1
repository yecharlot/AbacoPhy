# F2: build runtime for Windows (PowerShell)
$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$LauncherRoot = Resolve-Path (Join-Path $ScriptDir "..")
$RepoRoot = Resolve-Path (Join-Path $LauncherRoot "..")
$OutBin = Join-Path $LauncherRoot "runtime/bin"
$OutStatic = Join-Path $LauncherRoot "runtime/static"

New-Item -ItemType Directory -Force -Path $OutBin | Out-Null
New-Item -ItemType Directory -Force -Path $OutStatic | Out-Null

$OutFile = Join-Path $OutBin "abacophy.exe"
Write-Host "==> Compilando abacophy (windows/amd64) → $OutFile"
Push-Location $RepoRoot
$env:CGO_ENABLED = "0"
$env:GOOS = "windows"
$env:GOARCH = "amd64"
go build -ldflags="-s -w" -o $OutFile ./cmd/abacophy
Pop-Location

$StaticSrc = Join-Path $RepoRoot "static"
Write-Host "==> Copiando estáticos: $StaticSrc → $OutStatic"
Get-ChildItem $OutStatic -Exclude README.md | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item -Path (Join-Path $StaticSrc "*") -Destination $OutStatic -Recurse -Force

Write-Host "==> Runtime listo en $LauncherRoot\runtime"
