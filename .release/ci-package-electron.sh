#!/usr/bin/env bash
# Native desktop packaging. Use one machine per target platform, as CI does.
set -euo pipefail

RELEASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT_DIR="${LOOPRA_SOURCE_DIR:-$RELEASE_DIR/source}"
[[ -f "$ROOT_DIR/pom.xml" ]] || { echo "Source checkout missing: $ROOT_DIR" >&2; exit 1; }
ROOT_DIR="$(cd "$ROOT_DIR" && pwd)"

if [[ $# -eq 0 ]]; then
  case "$(uname -s)" in
    Darwin) set -- --mac ;;
    Linux) set -- --linux ;;
    MINGW*|MSYS*|CYGWIN*) set -- --win ;;
    *) echo "Unsupported platform; pass an electron-builder target" >&2; exit 1 ;;
  esac
fi

cd "$ROOT_DIR/loopra-front"
pnpm install --frozen-lockfile
pnpm build:vite
LOOPRA_SOURCE_DIR="$ROOT_DIR" bash "$RELEASE_DIR/.release/ci-embed-core.sh"
pnpm exec electron-builder "$@" --publish=never
