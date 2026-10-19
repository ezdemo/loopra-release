#
# Loopra Web Installer for Windows (Mirror via GitHub + gh-proxy)
# Usage: irm https://raw.githubusercontent.com/ezdemo/loopra-release/main/.release/setup-mirror.ps1 | iex
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

# Cleanup temp directory
New-Item -ItemType Directory -Path $TEMP_DIR | Out-Null

try {
    Write-Info "Downloading Loopra Web $VERSION via GitHub mirror ($MIRROR)..."

    $packageFile = Join-Path $TEMP_DIR "package.tar.gz"
    Invoke-WebRequest -Uri $PACKAGE_URL -OutFile $packageFile -UseBasicParsing

    Write-Info "Extracting package..."

    # Extract tar.gz using built-in tar (Windows 10+)
    tar -xzf $packageFile -C $TEMP_DIR

    # Find install.ps1
    $installScript = Get-ChildItem -Path $TEMP_DIR -Filter "install.ps1" -Recurse | Select-Object -First 1

    if (-not $installScript) {
        Write-Error "install.ps1 not found in package"
        exit 1
    }

    Write-Info "Running installer..."

    # Run PowerShell installer
    $installPath = $installScript.FullName
    $installDir = Split-Path $installPath -Parent

    Write-Host "Install path: $installPath" -ForegroundColor Gray

    # Execute the installer script
    & $installPath -Setup

    if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) {
        Write-Error "Installer failed with exit code: $LASTEXITCODE"
        throw "Installation failed"
    }

    # Refresh PATH for current session
    $env:Path = [Environment]::GetEnvironmentVariable('Path', 'User') + ';' + [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $env:Path = $env:Path.TrimEnd(';')

    Write-Host ""
    Write-Info "Installation complete!"
    Write-Host ""
    Write-Host "You can now run: " -NoNewline
    Write-Host "loopra web" -ForegroundColor Cyan -NoNewline
    Write-Host " or " -NoNewline
    Write-Host "loopra web 0" -ForegroundColor Cyan
    Write-Host ""

} catch {
    Write-Error $_.Exception.Message
    throw $_
}
