# F2: build runtime for Windows (PowerShell)
$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$LauncherRoot = Resolve-Path (Join-Path $ScriptDir "..")
$RepoRoot = Resolve-Path (Join-Path $LauncherRoot "..")
$OutBin = Join-Path $LauncherRoot "runtime/bin"
$OutStatic = Join-Path $LauncherRoot "runtime/static"
$WebAppDir = Join-Path $RepoRoot "webapp"
$WebDist = Join-Path $RepoRoot "web/dist"
$StaticSrc = Join-Path $RepoRoot "static"

New-Item -ItemType Directory -Force -Path $OutBin | Out-Null
New-Item -ItemType Directory -Force -Path $OutStatic | Out-Null

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "No se encontró npm. Instala Node.js 22 o superior para compilar la interfaz."
}

Write-Host "==> Verificando y compilando webapp (Svelte)"
Push-Location $WebAppDir
try {
    npm ci
    if ($LASTEXITCODE -ne 0) { throw "npm ci falló" }
    npm run check
    if ($LASTEXITCODE -ne 0) { throw "npm run check falló" }
    npm test
    if ($LASTEXITCODE -ne 0) { throw "npm test falló" }
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build falló" }
} finally {
    Pop-Location
}

$OutFile = Join-Path $OutBin "abacophy.exe"
Write-Host "==> Compilando abacophy (windows/amd64) → $OutFile"
Push-Location $RepoRoot
try {
    $env:CGO_ENABLED = "0"
    $env:GOOS = "windows"
    $env:GOARCH = "amd64"
    go build -ldflags="-s -w" -o $OutFile ./cmd/abacophy
    if ($LASTEXITCODE -ne 0) { throw "go build falló" }
} finally {
    Pop-Location
}

Write-Host "==> Copiando estáticos base y superponiendo web/dist"
Get-ChildItem $OutStatic -Exclude README.md | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item -Path (Join-Path $StaticSrc "*") -Destination $OutStatic -Recurse -Force
Copy-Item -Path (Join-Path $WebDist "*") -Destination $OutStatic -Recurse -Force

Write-Host "==> Runtime listo en $LauncherRoot\runtime"
