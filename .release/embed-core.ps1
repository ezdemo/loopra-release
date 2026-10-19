# 将核心分发包（loopra-dist.tar.gz）解压到 loopra-front/resources/loopra-core，
# 供 electron-builder 的 extraResources 嵌入前端安装包（Windows 本地打包用）。
# 用法：powershell -ExecutionPolicy Bypass -File .release/embed-core.ps1 [-Tarball <path>]
param(
    [string]$SourceDir = $(if ($env:LOOPRA_SOURCE_DIR) { $env:LOOPRA_SOURCE_DIR } else { Join-Path $PSScriptRoot "..\source" }),
    [string]$Tarball
)

$ErrorActionPreference = "Stop"

$root = (Resolve-Path -LiteralPath $SourceDir).Path
if (-not (Test-Path -LiteralPath (Join-Path $root "pom.xml"))) { throw "Source checkout missing: $root" }
if (-not $Tarball) { $Tarball = Join-Path $root "loopra\target\loopra-dist.tar.gz" }
$dest = Join-Path $root "loopra-front\resources\loopra-core"

if (-not (Test-Path $Tarball)) {
    Write-Host "[ERROR] 未找到核心分发包: $Tarball" -ForegroundColor Red
    Write-Host "        请先构建 loopra：mvn -B -ntp -DskipTests -pl loopra package" -ForegroundColor Yellow
    exit 1
}

$dest = [System.IO.Path]::GetFullPath($dest)
if (-not $dest.StartsWith($root.TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) { throw "Destination escapes source checkout: $dest" }
if (Test-Path -LiteralPath $dest) { Remove-Item -Recurse -Force -LiteralPath $dest }
New-Item -ItemType Directory -Path $dest -Force | Out-Null

tar -xzf $Tarball -C $dest
if ($LASTEXITCODE -ne 0) { throw "Core extraction failed" }

Write-Host "核心运行时已嵌入: $dest" -ForegroundColor Green
Get-ChildItem -Path $dest -Recurse -File | ForEach-Object { Write-Host "  $($_.FullName)" }
