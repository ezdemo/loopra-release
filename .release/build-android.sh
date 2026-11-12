#!/usr/bin/env bash
set -euo pipefail

tooling_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
source_dir=$(cd -- "${1:-source}" && pwd)
metadata=$(realpath -- "${3:-release-metadata.json}")
output=$(realpath -m -- "${2:-android-artifact}")
sdk_root=${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}
if [[ -z "$sdk_root" ]]; then echo 'ANDROID_HOME is required' >&2; exit 1; fi
export ANDROID_HOME="$sdk_root"
export NDK_HOME=${NDK_HOME:-"$sdk_root/ndk/28.2.13676358"}
tools="$sdk_root/build-tools/37.0.0"
for tool in "$NDK_HOME/toolchains/llvm/prebuilt/linux-x86_64/bin/llvm-strip" "$tools/apksigner" "$tools/aapt"; do
  if [[ ! -x "$tool" ]]; then echo "Android tool not found: $tool" >&2; exit 1; fi
done

node "$tooling_dir/android-build.mjs" version "$source_dir" "$metadata"
pnpm --dir "$source_dir/web" install --frozen-lockfile
pnpm --dir "$source_dir/mobile" install --frozen-lockfile
pnpm --dir "$source_dir/mobile" test
(
  cd "$source_dir/mobile/src-tauri"
  cargo test --locked -p loopra-relay
)
android="$source_dir/mobile/src-tauri/gen/android"
chmod +x "$android/gradlew"
(
  cd "$source_dir/mobile"
  pnpm tauri android build --debug --apk --target aarch64 --ci
)

# Tauri uses a symlink for JNI. Replace that link with a stripped copy so the
# downloadable debug APK stays small while the original Rust symbols survive.
native="$source_dir/mobile/src-tauri/target/aarch64-linux-android/debug/libloopra_mobile_lib.so"
jni="$android/app/src/main/jniLibs/arm64-v8a/libloopra_mobile_lib.so"
cp --remove-destination -- "$native" "$jni"
"$NDK_HOME/toolchains/llvm/prebuilt/linux-x86_64/bin/llvm-strip" --strip-debug "$jni"
apk="$android/app/build/outputs/apk/arm64/debug/app-arm64-debug.apk"
rm -f -- "$apk"
"$android/gradlew" -p "$android" :app:assembleArm64Debug :app:testArm64DebugUnitTest \
  -x :app:rustBuildArm64Debug -PtargetList=aarch64 -ParchList=arm64 -PabiList=arm64-v8a --no-daemon --console plain
"$tools/apksigner" verify --verbose "$apk"
badging=$(mktemp)
trap 'rm -f -- "$badging"' EXIT
"$tools/aapt" dump badging "$apk" > "$badging"
node "$tooling_dir/android-build.mjs" stage "$source_dir" "$metadata" "$output" "$badging"
if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  printf '\nAndroid ARM64 debug APK, SHA-256 and pinned-source metadata are in the **loopra-android-arm64-debug** artifact. Publishing also attaches the verified APK to the GitHub Release as an Android debug build.\n' >> "$GITHUB_STEP_SUMMARY"
fi
