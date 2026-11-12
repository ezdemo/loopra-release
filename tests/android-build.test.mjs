import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { androidVersionCode, setAndroidBuildVersion, stageAndroidBuild, validateAndroidPackage } from '../.release/android-build.mjs';

const version = '26.11.1101';
const badging = `package: name='app.loopra.mobile' versionCode='26111101' versionName='${version}'
sdkVersion:'24'
application-debuggable
native-code: 'arm64-v8a'
`;
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'loopra-android-build-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const write = (file, text) => { mkdirSync(dirname(join(dir, file)), { recursive: true }); writeFileSync(join(dir, file), text); };
  const read = file => readFileSync(join(dir, file), 'utf8');
  write('mobile/package.json', JSON.stringify({ name: 'loopra-mobile', version: '0.1.1', scripts: { build: 'pnpm typecheck && vite build' } }));
  write('mobile/src-tauri/tauri.conf.json', JSON.stringify({ identifier: 'app.loopra.mobile', version: '0.1.1', bundle: { android: { minSdkVersion: 24 }, icon: ['icon.png'] } }));
  write('mobile/src-tauri/Cargo.toml', '[package]\nname = "loopra-mobile"\nversion = "0.1.1"\n\n[dependencies]\nloopra-relay = { path = "relay-core" }\n');
  write('mobile/src-tauri/Cargo.lock', 'version = 4\n\n[[package]]\nname = "loopra-mobile"\nversion = "0.1.1"\n\n[[package]]\nname = "loopra-relay"\nversion = "0.1.0"\n');
  return { dir, read, write };
}

test('Android date version codes increase across days, months and years without patch collisions', () => {
  const versions = ['26.1.3199', '26.2.101', '26.11.1101', '26.12.3199', '27.1.101'];
  const codes = versions.map(androidVersionCode);
  assert.deepEqual(codes, [26013199, 26020101, 26111101, 26123199, 27010101]);
  assert.deepEqual([...codes].sort((a, b) => a - b), codes);
  for (const invalid of ['26.01.1101', '26.13.101', '26.2.3001', '26.11.1100', '26.11.1', '100.1.101', '26.11.1101-beta']) {
    assert.throws(() => androidVersionCode(invalid), /version|date|sequence/);
  }
});

test('injects the reserved version into all mobile manifests and only the root Cargo lock entry', t => {
  const f = fixture(t);
  assert.equal(setAndroidBuildVersion(f.dir, version), 26111101);
  assert.equal(JSON.parse(f.read('mobile/package.json')).version, version);
  assert.deepEqual(JSON.parse(f.read('mobile/package.json')).scripts, { build: 'pnpm typecheck && vite build' });
  const config = JSON.parse(f.read('mobile/src-tauri/tauri.conf.json'));
  assert.equal(config.version, version);
  assert.deepEqual(config.bundle.android, { minSdkVersion: 24, versionCode: 26111101, autoIncrementVersionCode: false });
  assert.deepEqual(config.bundle.icon, ['icon.png']);
  assert.match(f.read('mobile/src-tauri/Cargo.toml'), /name = "loopra-mobile"\nversion = "26.11.1101"/);
  assert.match(f.read('mobile/src-tauri/Cargo.lock'), /name = "loopra-mobile"\nversion = "26.11.1101"/);
  assert.match(f.read('mobile/src-tauri/Cargo.lock'), /name = "loopra-relay"\nversion = "0.1.0"/);
  assert.equal(setAndroidBuildVersion(f.dir, version), 26111101);
});

test('invalid Cargo manifests fail before any mobile version file is rewritten', t => {
  const f = fixture(t);
  const before = f.read('mobile/package.json');
  f.write('mobile/src-tauri/Cargo.lock', 'version = 4\n');
  assert.throws(() => setAndroidBuildVersion(f.dir, version), /Expected one/);
  assert.equal(f.read('mobile/package.json'), before);
  assert.equal(JSON.parse(f.read('mobile/src-tauri/tauri.conf.json')).version, '0.1.1');
});

test('rejects wrong package versions, ABI, non-debug builds and unexpected minimum SDK', () => {
  validateAndroidPackage(badging, version);
  for (const input of [badging.replace('app.loopra.mobile', 'app.other'), badging.replace('26111101', '1001'),
    badging.replace(`versionName='${version}'`, "versionName='0.1.1'"), badging.replace('arm64-v8a', 'x86_64'),
    badging.replace("'arm64-v8a'", "'arm64-v8a' 'x86_64'"), badging.replace('application-debuggable', ''), badging.replace("sdkVersion:'24'", "sdkVersion:'26'")]) {
    assert.throws(() => validateAndroidPackage(input, version), /Android|ARM64|debug/);
  }
});

function buildFixture(t) {
  const f = fixture(t);
  const git = (...args) => execFileSync('git', ['-C', f.dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git('init');
  git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', '-c', 'core.hooksPath=/dev/null', 'commit', '--allow-empty', '--no-gpg-sign', '-m', 'pinned Android source');
  const metadata = { version, npmVersion: version, sourceSha: git('rev-parse', 'HEAD'),
    sourceRepository: 'ezdemo/loopra', releaseRepository: 'ezdemo/loopra-release', releaseSha: 'a'.repeat(40) };
  const apkPath = 'mobile/src-tauri/gen/android/app/build/outputs/apk/arm64/debug/app-arm64-debug.apk';
  const payload = Buffer.concat([Buffer.from('504b0304', 'hex'), Buffer.from('fixture APK payload')]);
  f.write(apkPath, payload);
  return { ...f, metadata, apkPath, payload, out: join(f.dir, 'artifact') };
}

test('stages only the verified APK with its SHA-256, pinned source identity and debug metadata', t => {
  const f = buildFixture(t);
  const build = stageAndroidBuild(f.dir, f.out, f.metadata, badging);
  assert.deepEqual(readdirSync(f.out).sort(), ['SHA256SUMS', 'android-build.json', `loopra-mobile-${version}-arm64-debug.apk`].sort());
  const sha256 = createHash('sha256').update(f.payload).digest('hex');
  assert.equal(build.sha256, sha256);
  assert.equal(build.sourceSha, f.metadata.sourceSha);
  assert.equal(build.buildType, 'debug');
  assert.equal(build.versionCode, 26111101);
  assert.deepEqual(JSON.parse(readFileSync(join(f.out, 'android-build.json'), 'utf8')), build);
  assert.equal(readFileSync(join(f.out, 'SHA256SUMS'), 'utf8'), `${sha256}  ${build.file}\n`);
  assert.deepEqual(readFileSync(join(f.out, build.file)), f.payload);
  assert.throws(() => stageAndroidBuild(f.dir, f.out, f.metadata, badging), /must be empty/);
});

test('wrong pinned sources and corrupt APKs cannot create downloadable artifacts', t => {
  const f = buildFixture(t);
  assert.throws(() => stageAndroidBuild(f.dir, f.out, { ...f.metadata, sourceSha: 'b'.repeat(40) }, badging), /source SHA/);
  assert.equal(existsSync(f.out), false);
  f.write(f.apkPath, 'not an APK');
  assert.throws(() => stageAndroidBuild(f.dir, f.out, f.metadata, badging), /ZIP archive/);
  assert.equal(existsSync(f.out), false);
});
