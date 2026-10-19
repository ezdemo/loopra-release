param(
    [switch]$SkipBuild,
    [string]$SourceDir = $(if ($env:LOOPRA_SOURCE_DIR) { $env:LOOPRA_SOURCE_DIR } else { Join-Path $PSScriptRoot "..\source" })
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Loopra 打包脚本 (PowerShell)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 所有构建和资源同步均针对独立的源码 checkout。
$RootDir = (Resolve-Path -LiteralPath $SourceDir).Path
if (-not (Test-Path -LiteralPath (Join-Path $RootDir "pom.xml"))) { throw "Source checkout missing: $RootDir" }
$FrontDir   = Join-Path $RootDir "loopra-front"
$DistDir    = Join-Path $FrontDir "dist\renderer"
$StaticDir  = Join-Path $RootDir "loopra\src\main\resources\static"
$StaticDir = [System.IO.Path]::GetFullPath($StaticDir)
if (-not $StaticDir.StartsWith($RootDir.TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) { throw "Static directory escapes source checkout: $StaticDir" }

Write-Host "Root: $RootDir" -ForegroundColor DarkGray

# ---------- step 1: pnpm build ----------
if (-not $SkipBuild) {
    Write-Host "[1/3] Build frontend (pnpm build) ..." -ForegroundColor Yellow
    if (-not (Test-Path $FrontDir)) {
        Write-Host "[ERROR] frontend dir not found: $FrontDir" -ForegroundColor Red
        exit 1
    }
    Push-Location $FrontDir
    try {
        & pnpm build
        if ($LASTEXITCODE -ne 0) { throw "pnpm build failed" }
    } finally {
        Pop-Location
    }
    Write-Host "[1/3] Frontend build done." -ForegroundColor Green
} else {
    Write-Host "[1/3] Skip frontend build." -ForegroundColor DarkYellow
}
Write-Host ""

# ---------- step 2: clear static (keep config.json) ----------
Write-Host "[2/3] Clear static dir (keep config.json) ..." -ForegroundColor Yellow
if (-not (Test-Path $StaticDir)) {
    Write-Host "[ERROR] static dir not found: $StaticDir" -ForegroundColor Red
    exit 1
}

foreach ($f in (Get-ChildItem -Path $StaticDir -File)) {
    if ($f.Name -ne "config.json") {
        Remove-Item -LiteralPath $f.FullName -Force -ErrorAction Stop
    }
}
foreach ($d in (Get-ChildItem -Path $StaticDir -Directory)) {
    Remove-Item -LiteralPath $d.FullName -Recurse -Force -ErrorAction Stop
}
Write-Host "[2/3] Clear done (config.json kept)." -ForegroundColor Green
Write-Host ""

# ---------- step 3: copy dist/renderer -> static (exclude config.json) ----------
Write-Host "[3/3] Copy dist/renderer to static (exclude config.json) ..." -ForegroundColor Yellow
if (-not (Test-Path $DistDir)) {
    Write-Host "[ERROR] dist/renderer dir not found: $DistDir" -ForegroundColor Red
    exit 1
}

foreach ($f in (Get-ChildItem -Path $DistDir -File)) {
    if ($f.Name -ne "config.json") {
        Copy-Item -Path $f.FullName -Destination $StaticDir -Force -ErrorAction Stop
    }
}
foreach ($d in (Get-ChildItem -Path $DistDir -Directory)) {
    Copy-Item -Path $d.FullName -Destination $StaticDir -Recurse -Force -ErrorAction Stop
}
Write-Host "[3/3] Copy done (config.json excluded)." -ForegroundColor Green
Write-Host ""
