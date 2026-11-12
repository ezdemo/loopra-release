import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { ANDROID_DEBUG_ASSET, LOOPRAX_ASSETS, downloadName, isLoopraxRelease, prepareAssets } from '../.release/prepare-assets.mjs';
import { parseMetadata } from '../.release/release-metadata.mjs';

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'loopra-android-release-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const write = (name, value) => { const path = join(dir, name); mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, value); };
  const metadata = { version: '26.11.1101', npmVersion: '26.11.1101', sourceSha: 'a'.repeat(40), releaseSha: 'b'.repeat(40),
    sourceRepository: 'ezdemo/loopra', releaseRepository: 'ezdemo/loopra-release' };
  const payload = Buffer.from('PK\x03\x04fixture Android APK');
  const build = { version: metadata.version, versionCode: 26111101, sourceSha: metadata.sourceSha,
    sourceRepository: metadata.sourceRepository, releaseSha: metadata.releaseSha, buildType: 'debug', abi: 'arm64-v8a',
    file: `loopra-mobile-${metadata.version}-arm64-debug.apk`, sha256: createHash('sha256').update(payload).digest('hex') };
  write('release-metadata.json', JSON.stringify(metadata));
  write('release-changes.md', '### 更新\n\n- 新增 Android 调试包');
  for (const name of LOOPRAX_ASSETS) write(name, `package ${name}`);
  write('android/android-build.json', JSON.stringify(build));
  write(`android/${build.file}`, payload);
  write('android/SHA256SUMS', `${build.sha256}  ${build.file}\n`);
  return { dir, write, build, payload, out: join(dir, 'publish') };
}

test('Android APK is optional alongside a complete LoopraX release, never a substitute for missing desktop packages', () => {
  assert.equal(isLoopraxRelease(LOOPRAX_ASSETS), true);
  assert.equal(isLoopraxRelease([...LOOPRAX_ASSETS, ANDROID_DEBUG_ASSET], true), true);
  assert.equal(downloadName(ANDROID_DEBUG_ASSET), ANDROID_DEBUG_ASSET);
  assert.equal(isLoopraxRelease([...LOOPRAX_ASSETS.slice(1), ANDROID_DEBUG_ASSET]), false);
  assert.equal(isLoopraxRelease([...LOOPRAX_ASSETS, ANDROID_DEBUG_ASSET, ANDROID_DEBUG_ASSET]), false);
  assert.equal(isLoopraxRelease([...LOOPRAX_ASSETS, 'unexpected.apk']), false);
});

test('publishes the verified Android APK with debug labeling and its checksum in release metadata', t => {
  const f = fixture(t);
  const notes = prepareAssets(f.dir, f.out, { includeAndroid: true });
  assert.deepEqual(readdirSync(f.out).sort(), [...LOOPRAX_ASSETS, ANDROID_DEBUG_ASSET].sort());
  assert.deepEqual(readFileSync(join(f.out, ANDROID_DEBUG_ASSET)), f.payload);
  assert.match(notes, /#### Android 调试版/);
  assert.ok(notes.includes(`releases/download/v${f.build.version}/${ANDROID_DEBUG_ASSET}`));
  const metadata = parseMetadata(notes);
  assert.equal(metadata.artifacts[ANDROID_DEBUG_ASSET], f.build.sha256);
  assert.deepEqual(metadata.android, { asset: ANDROID_DEBUG_ASSET, buildType: 'debug', abi: 'arm64-v8a', versionCode: 26111101 });
});

test('disabling Android preserves the existing desktop-only release even when Android artifacts exist', t => {
  const f = fixture(t);
  const notes = prepareAssets(f.dir, f.out);
  assert.deepEqual(readdirSync(f.out).sort(), [...LOOPRAX_ASSETS].sort());
  assert.equal(parseMetadata(notes).artifacts[ANDROID_DEBUG_ASSET], undefined);
  assert.doesNotMatch(notes, /#### Android 调试版/);
});

test('enabled Android publication fails closed on missing artifacts, foreign builds and modified APK bytes', t => {
  for (const change of [
    f => rmSync(join(f.dir, 'android/android-build.json')),
    f => { f.build.sourceSha = 'c'.repeat(40); },
    f => { f.build.releaseSha = 'c'.repeat(40); },
    f => { f.build.version = '26.11.1102'; },
    f => { f.build.file = '../foreign.apk'; },
    f => { f.build.abi = 'x86_64'; },
    f => { f.build.buildType = 'release'; },
    f => f.write(`android/${f.build.file}`, 'corrupt APK bytes'),
  ]) {
    const f = fixture(t);
    change(f);
    if (existsSync(join(f.dir, 'android/android-build.json'))) f.write('android/android-build.json', JSON.stringify(f.build));
    assert.throws(() => prepareAssets(f.dir, f.out, { includeAndroid: true }));
    assert.equal(existsSync(f.out), false);
  }
});
