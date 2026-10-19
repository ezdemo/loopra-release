#
# Loopra Desktop Web Installer for Windows (Mirror via GitHub + gh-proxy)
# Usage: irm https://raw.githubusercontent.com/ezdemo/loopra-release/main/.release/setup-gui-mirror.ps1 | iex
#

$ErrorActionPreference = "Stop"

$VERSION = if ($env:LOOPRA_VERSION) { $env:LOOPRA_VERSION } else { "latest" }
$RELEASE_PATH = if ($VERSION -eq "latest") { "latest/download" } else { "download/$VERSION" }
# 下载地址：优先使用用户指定的镜像（LOOPRA_MIRROR），未指定时默认 gh-proxy.org
$MIRROR = $env:LOOPRA_MIRROR
if (-not $MIRROR) { $MIRROR = "https://gh-proxy.org/" }
$PACKAGE_URL = $MIRROR.TrimEnd('/') + "/https://github.com/ezdemo/loopra-release/releases/$RELEASE_PATH/loopra-dist.tar.gz"
$TEMP_DIR = Join-Path ([System.IO.Path]::GetTempPath()) ("loopra-install-" + [guid]::NewGuid().ToString("N"))

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] " -ForegroundColor Green -NoNewline
    Write-Host $Message
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] " -ForegroundColor Red -NoNewline
    Write-Host $Message
}

New-Item -ItemType Directory -Path $TEMP_DIR | Out-Null

try {
    Write-Info "Downloading Loopra Desktop runtime $VERSION via GitHub mirror ($MIRROR)..."

    $packageFile = Join-Path $TEMP_DIR "package.tar.gz"
    Invoke-WebRequest -Uri $PACKAGE_URL -OutFile $packageFile -UseBasicParsing

    Write-Info "Extracting package..."
    tar -xzf $packageFile -C $TEMP_DIR

    $installScript = Get-ChildItem -Path $TEMP_DIR -Filter "install.ps1" -Recurse | Select-Object -First 1
    if (-not $installScript) {
        Write-Error "install.ps1 not found in package"
        exit 1
    }

    Write-Info "Installing desktop runtime..."
    & $installScript.FullName -Gui -Setup

    if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) {
        Write-Error "Installer failed with exit code: $LASTEXITCODE"
        throw "Installation failed"
    }

    Write-Host ""
    Write-Info "Desktop runtime installation complete!"
    Write-Host ""
} catch {
    Write-Error $_.Exception.Message
    throw
}
