#
# LoopraX desktop installer for Windows via gh-proxy
# Usage: irm https://raw.githubusercontent.com/ezdemo/loopra-release/main/.release/setup-gui-mirror.ps1 | iex
#

$ErrorActionPreference = 'Stop'

$Variant = 'desktop'
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
$prefix = if ($Variant -eq 'desktop') { 'loopra-desktop' } else { 'loopra' }
$asset = "$prefix-windows-$arch-setup.exe"
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
    $portable = $false
    try {
        Invoke-WebRequest -Uri $packageUrl -OutFile $packageFile -UseBasicParsing
    } catch {
        if ($null -eq $_.Exception.Response -or [int]$_.Exception.Response.StatusCode -ne 404) { throw }
        # Releases before Windows installers were added still offer the portable EXE.
        $portable = $true
        $asset = $asset -replace '-setup\.exe$', '.exe'
        $packageUrl = $packageUrl -replace '-setup\.exe$', '.exe'
        $packageFile = Join-Path $tempRoot $asset
        Write-Info 'This release has no Windows installer; downloading its portable version.'
        Invoke-WebRequest -Uri $packageUrl -OutFile $packageFile -UseBasicParsing
    }
    $bytes = [System.IO.File]::ReadAllBytes($packageFile)
    if ($bytes.Length -lt 64 -or $bytes[0] -ne 77 -or $bytes[1] -ne 90) { Fail 'Download is not a Windows executable' }
    if ($portable) {
        $destination = if ($env:LOOPRAX_INSTALL_DIR) { $env:LOOPRAX_INSTALL_DIR } else { Join-Path $env:LOCALAPPDATA 'LoopraX\bin' }
        New-Item -ItemType Directory -Force -Path $destination | Out-Null
        $destination = Join-Path $destination 'loopra-desktop.exe'
        Copy-Item -LiteralPath $packageFile -Destination $destination -Force
        Write-Info "Portable version saved to $destination"
        return
    }

    $arguments = '/S'
    if ($env:LOOPRAX_INSTALL_DIR) { $arguments += ' /D=' + [System.IO.Path]::GetFullPath($env:LOOPRAX_INSTALL_DIR) }
    $start = New-Object System.Diagnostics.ProcessStartInfo
    $start.FileName = $packageFile
    $start.Arguments = $arguments
    $start.UseShellExecute = $false
    $start.CreateNoWindow = $true
    $start.WindowStyle = 'Hidden'
    $installer = [System.Diagnostics.Process]::Start($start)
    $installer.WaitForExit()
    if ($installer.ExitCode -ne 0) { Fail "Loopra installation failed (exit $($installer.ExitCode))" }
    Write-Info 'Installed Loopra. Open it from the Start menu.'
    return

} finally {
    $resolvedTemp = [System.IO.Path]::GetFullPath($tempRoot)
    $allowedTemp = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath()).TrimEnd('\') + '\'
    if ($resolvedTemp.StartsWith($allowedTemp, [System.StringComparison]::OrdinalIgnoreCase) -and (Split-Path -Leaf $resolvedTemp) -like 'looprax-install-*') {
        Remove-Item -LiteralPath $resolvedTemp -Recurse -Force -ErrorAction SilentlyContinue
    }
}
