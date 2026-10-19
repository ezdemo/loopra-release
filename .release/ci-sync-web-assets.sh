#!/usr/bin/env bash
set -euo pipefail

RELEASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT_DIR="${LOOPRA_SOURCE_DIR:-$RELEASE_DIR/source}"
[[ -f "$ROOT_DIR/pom.xml" ]] || { echo "Source checkout missing: $ROOT_DIR" >&2; exit 1; }
ROOT_DIR="$(cd "$ROOT_DIR" && pwd)"
FRONT_DIR="$ROOT_DIR/loopra-front"
DIST_DIR="$FRONT_DIR/dist/renderer"
STATIC_DIR="$ROOT_DIR/loopra/src/main/resources/static"
# Node and pnpm are installed by the workflow (or by the local caller).
command -v pnpm >/dev/null || { echo "pnpm is required" >&2; exit 1; }

pushd "$FRONT_DIR" >/dev/null
pnpm install --frozen-lockfile
pnpm build
popd >/dev/null

[[ -d "$DIST_DIR" ]] || { echo "Frontend build output not found: $DIST_DIR" >&2; exit 1; }
mkdir -p "$STATIC_DIR"

find "$STATIC_DIR" -mindepth 1 -maxdepth 1 ! -name config.json -exec rm -rf {} +
find "$DIST_DIR" -mindepth 1 -maxdepth 1 ! -name config.json -exec cp -a {} "$STATIC_DIR"/ \;
