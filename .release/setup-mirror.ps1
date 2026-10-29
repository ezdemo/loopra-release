#
# LoopraX installer for Windows via gh-proxy
# Usage: irm https://raw.githubusercontent.com/ezdemo/loopra-release/main/.release/setup-mirror.ps1 | iex
#

$ErrorActionPreference = 'Stop'

$Variant = 'web'
$UseDefaultMirror = $true

function Write-Info([string]$Message) {
    Write-Host "[INFO] " -ForegroundColor Green -NoNewline
    Write-Host $Message
}

function Fail([string]$Message) {
    Write-Host "[ERROR] $Message" -ForegroundColor Red
    throw $Message
}

function Get-LoopraxArch {
    $arch = $env:LOOPRAX_ARCH
    if (-not $arch) {
        $arch = $env:PROCESSOR_ARCHITEW6432
        if (-not $arch) { $arch = $env:PROCESSOR_ARCHITECTURE }
    }
    switch ($arch.ToLowerInvariant()) {
        'amd64' { return 'amd64' }
        'x64' { return 'amd64' }
        'x86_64' { return 'amd64' }
        'arm64' { return 'arm64' }
        'aarch64' { return 'arm64' }
        '386' { return '386' }
        'x86' { return '386' }
        'i386' { return '386' }
        'i686' { return '386' }
        default { Fail "Unsupported architecture: $arch" }
    }
}

$arch = Get-LoopraxArch
if ($Variant -eq 'desktop' -and $arch -eq '386') { Fail 'No LoopraX desktop package for 386' }
$prefix = if ($Variant -eq 'desktop') { 'looprax-desktop' } else { 'looprax' }
$asset = "$prefix-windows-$arch.exe"
$version = if ($env:LOOPRA_VERSION) { $env:LOOPRA_VERSION } else { 'latest' }
$releasePath = if ($version -eq 'latest') { 'latest/download' } else { "download/$version" }
$mirror = $env:LOOPRA_MIRROR
if ($UseDefaultMirror -and -not $mirror) { $mirror = 'https://gh-proxy.org/' }
$packageUrl = "https://github.com/ezdemo/loopra-release/releases/$releasePath/$asset"
if ($mirror) { $packageUrl = $mirror.TrimEnd('/') + '/' + $packageUrl }

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("looprax-install-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $tempRoot | Out-Null
try {
    if ($mirror) {
        Write-Info "Downloading LoopraX $Variant $version ($asset) via $mirror"
    } else {
        Write-Info "Downloading LoopraX $Variant $version ($asset)"
    }
    $packageFile = Join-Path $tempRoot $asset
    Invoke-WebRequest -Uri $packageUrl -OutFile $packageFile -UseBasicParsing
    $bytes = [System.IO.File]::ReadAllBytes($packageFile)
    if ($bytes.Length -lt 64 -or $bytes[0] -eq 60) { Fail 'Download is not a LoopraX package' }

    $destDir = if ($env:LOOPRAX_INSTALL_DIR) { $env:LOOPRAX_INSTALL_DIR } else { Join-Path $env:LOCALAPPDATA 'LoopraX\bin' }
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
    $leaf = if ($Variant -eq 'desktop') { 'looprax-desktop.exe' } else { 'loopra.exe' }
    $dest = Join-Path $destDir $leaf
    Copy-Item -LiteralPath $packageFile -Destination $dest -Force

    if ($env:LOOPRAX_SKIP_PATH -ne '1') {
        $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
        if (-not $userPath) { $userPath = '' }
        $parts = @($userPath -split ';' | Where-Object { $_ -ne '' })
        $normalized = $destDir.TrimEnd('\')
        $already = $false
        foreach ($part in $parts) {
            if ($part.TrimEnd('\') -eq $normalized) { $already = $true }
        }
        if (-not $already) {
            $joined = (@($parts) + $destDir) -join ';'
            [Environment]::SetEnvironmentVariable('Path', $joined, 'User')
        }
        if ($env:Path -notlike "$destDir*") { $env:Path = $destDir + ';' + $env:Path }
    }

    Write-Host ''
    Write-Info "Installed $dest"
    Write-Host 'You can now run: ' -NoNewline
    if ($Variant -eq 'desktop') {
        Write-Host 'looprax-desktop' -ForegroundColor Cyan
    } else {
        Write-Host 'loopra web' -ForegroundColor Cyan
    }
    Write-Host 'Open a new terminal if the command is not found yet.'
    Write-Host ''
} finally {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
