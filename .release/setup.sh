#!/bin/bash
#
# LoopraX installer
# Usage: curl -fsSL https://raw.githubusercontent.com/ezdemo/loopra-release/main/.release/setup.sh | bash
#
# The script is self-contained because users pipe this file to bash.
#

set -euo pipefail

VARIANT=web
DEFAULT_MIRROR=

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

info() { echo -e "${GREEN}[INFO]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }

normalize() { printf '%s' "$1" | tr '[:upper:]' '[:lower:]'; }

host_path() {
  if command -v cygpath >/dev/null 2>&1; then
    cygpath -w "$1"
  else
    printf '%s\n' "$1"
  fi
}

detect_target() {
  if [ -n "${LOOPRAX_OS:-}" ]; then
    OS_NAME=$(normalize "$LOOPRAX_OS")
  else
    case "$(uname -s)" in
      Darwin) OS_NAME=darwin ;;
      Linux) OS_NAME=linux ;;
      MINGW*|MSYS*|CYGWIN*) OS_NAME=windows ;;
      *) error "Unsupported system: $(uname -s)"; exit 1 ;;
    esac
  fi
  case "$OS_NAME" in
    mac|macos|osx) OS_NAME=darwin ;;
    win) OS_NAME=windows ;;
  esac
  if [ -n "${LOOPRAX_ARCH:-}" ]; then
    ARCH_NAME=$(normalize "$LOOPRAX_ARCH")
  else
    ARCH_NAME=$(normalize "$(uname -m)")
  fi
  case "$ARCH_NAME" in
    x64|x86_64|amd64) ARCH_NAME=amd64 ;;
    aarch64|arm64) ARCH_NAME=arm64 ;;
    armv7l|armv7|arm) ARCH_NAME=armv7 ;;
    s390x) ARCH_NAME=s390x ;;
    i386|i686|386) ARCH_NAME=386 ;;
    *) error "Unsupported architecture: $ARCH_NAME"; exit 1 ;;
  esac
}

asset_name() {
  local prefix=looprax
  if [ "$VARIANT" = desktop ]; then
    prefix=looprax-desktop
  fi
  case "$OS_NAME:$ARCH_NAME:$VARIANT" in
    windows:amd64:web|windows:arm64:web|windows:386:web|windows:amd64:desktop|windows:arm64:desktop)
      printf '%s-windows-%s.exe\n' "$prefix" "$ARCH_NAME" ;;
    darwin:amd64:web|darwin:arm64:web)
      printf '%s-darwin-%s\n' "$prefix" "$ARCH_NAME" ;;
    darwin:amd64:desktop|darwin:arm64:desktop)
      printf '%s-darwin-%s.zip\n' "$prefix" "$ARCH_NAME" ;;
    linux:amd64:web|linux:arm64:web|linux:armv7:web|linux:s390x:web|linux:amd64:desktop|linux:arm64:desktop)
      printf '%s-linux-%s\n' "$prefix" "$ARCH_NAME" ;;
    *)
      error "No LoopraX package for ${OS_NAME}/${ARCH_NAME}"
      exit 1 ;;
  esac
}

ensure_path() {
  [ "${LOOPRAX_SKIP_PATH:-}" = 1 ] && return 0
  local dir=$1 line file
  if [ "$dir" = "$HOME/.looprax/bin" ]; then
    line='export PATH="$HOME/.looprax/bin:$PATH" # LoopraX'
  else
    line="export PATH=\"$dir:\$PATH\" # LoopraX"
  fi
  add_path() {
    file=$1
    create=$2
    if [ -f "$file" ]; then
      if ! grep -q '# LoopraX' "$file"; then
        printf '\n%s\n' "$line" >> "$file"
      fi
    elif [ "$create" = 1 ]; then
      printf '%s\n' "$line" > "$file"
    fi
  }
  add_path "$HOME/.profile" 1
  add_path "$HOME/.bashrc" 0
  add_path "$HOME/.zshrc" 0
  case "${SHELL:-}" in
    */zsh) add_path "$HOME/.zshrc" 1 ;;
    */bash) add_path "$HOME/.bashrc" 1 ;;
  esac
}

install_mac_app() {
  local archive=$1 dest py
  dest=${LOOPRAX_INSTALL_DIR:-$HOME/Applications}
  mkdir -p "$dest"
  if command -v python3 >/dev/null 2>&1; then
    py=python3
  elif command -v python >/dev/null 2>&1; then
    py=python
  else
    error "python3 is required to unpack the macOS app"
    exit 1
  fi
  "$py" - "$(host_path "$archive")" "$(host_path "$dest")" <<'PY'
import os, shutil, sys, zipfile
archive, dest = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(archive) as bundle:
    for info in bundle.infolist():
        name = info.filename.replace("\\", "/")
        if name.startswith("/") or ".." in name.split("/"):
            raise SystemExit("unsafe archive path")
    work = dest + ".extract"
    shutil.rmtree(work, ignore_errors=True)
    os.makedirs(work, exist_ok=True)
    try:
        bundle.extractall(work)
        apps = []
        for root, dirs, _files in os.walk(work):
            for entry in dirs:
                if entry.endswith(".app"):
                    apps.append(os.path.join(root, entry))
        if len(apps) != 1:
            raise SystemExit("archive must contain exactly one .app")
        target = os.path.join(dest, "LoopraX.app")
        shutil.rmtree(target, ignore_errors=True)
        shutil.move(apps[0], target)
        executable = os.path.join(target, "Contents", "MacOS", "LoopraX")
        if not os.path.isfile(executable):
            raise SystemExit("archive has no LoopraX executable")
        os.chmod(executable, 0o755)
    finally:
        shutil.rmtree(work, ignore_errors=True)
PY
  info "Installed $dest/LoopraX.app"
  echo -e "Open it with: ${CYAN}open \"$dest/LoopraX.app\"${NC}"
}

detect_target
ASSET=$(asset_name)
VERSION=${LOOPRA_VERSION:-latest}
if [ "$VERSION" = latest ]; then
  RELEASE_PATH=latest/download
else
  RELEASE_PATH=download/$VERSION
fi
if [ -n "${LOOPRA_MIRROR:-}" ]; then
  MIRROR=$LOOPRA_MIRROR
elif [ -n "$DEFAULT_MIRROR" ]; then
  MIRROR=$DEFAULT_MIRROR
else
  MIRROR=
fi
PACKAGE_URL="https://github.com/ezdemo/loopra-release/releases/${RELEASE_PATH}/${ASSET}"
if [ -n "$MIRROR" ]; then
  PACKAGE_URL="${MIRROR%/}/$PACKAGE_URL"
fi

TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT
if [ -n "$MIRROR" ]; then
  info "Downloading LoopraX ${VARIANT} ${VERSION} (${ASSET}) via $MIRROR"
else
  info "Downloading LoopraX ${VARIANT} ${VERSION} (${ASSET})"
fi
if command -v curl >/dev/null 2>&1; then
  curl -fsSL "$PACKAGE_URL" -o "$TMP"
elif command -v wget >/dev/null 2>&1; then
  wget -q "$PACKAGE_URL" -O "$TMP"
else
  error "curl or wget is required"
  exit 1
fi
SIZE=$(wc -c < "$TMP" | tr -d ' ')
if [ "$SIZE" -lt 64 ] || [ "$(head -c 1 "$TMP")" = "<" ]; then
  error "Download is not a LoopraX package"
  exit 1
fi

if [ "$VARIANT" = desktop ] && [ "$OS_NAME" = darwin ]; then
  install_mac_app "$TMP"
  exit 0
fi

if [ "$VARIANT" = desktop ]; then
  BIN=looprax-desktop
else
  BIN=looprax
fi
if [ "$OS_NAME" = windows ]; then
  BIN=$BIN.exe
fi
DEST=${LOOPRAX_INSTALL_DIR:-$HOME/.looprax/bin}
mkdir -p "$DEST"
cp "$TMP" "$DEST/$BIN"
chmod 755 "$DEST/$BIN" || true
ensure_path "$DEST"
echo ""
info "Installed $DEST/$BIN"
echo -e "You can now run: ${CYAN}${BIN}${NC}"
echo "Open a new terminal if the command is not found yet."
