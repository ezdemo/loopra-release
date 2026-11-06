import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { downloadName, isLoopraxRelease, prepareAssets } from '../.release/prepare-assets.mjs';
import { stageAssets } from '../.release/stage-assets.mjs';
import { readSourceVersion } from '../.release/source-metadata.mjs';
import { checkRelease } from '../.release/check-release.mjs';
import { parseMetadata } from '../.release/release-metadata.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const tooling = join(root, '.release');
const bash = process.env.BASH_EXE || (process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : '/bin/bash');
const shellPath = path => path.replaceAll('\\', '/').replace(/^([A-Za-z]):\//, (_, drive) => `/${drive.toLowerCase()}/`);
// Model actual build output independently of the release tooling's allowlist.
// The source package matrix pauses Windows 386 and Linux ARMv7.
const releasePackages = [
  'loopra-windows-amd64.exe',
  'loopra-windows-arm64.exe',
  'loopra-darwin-amd64',
  'loopra-darwin-arm64',
  'loopra-linux-amd64',
  'loopra-linux-arm64',
  'loopra-linux-s390x',
  'loopra-desktop-windows-amd64-setup.exe',
  'loopra-desktop-windows-arm64-setup.exe',
  'loopra-desktop-windows-amd64.exe',
  'loopra-desktop-windows-arm64.exe',
  'loopra-desktop-darwin-amd64.zip',
  'loopra-desktop-darwin-arm64.zip',
  'loopra-desktop-linux-amd64',
  'loopra-desktop-linux-arm64',
];
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'loopra-release-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}
function write(dir, file, text) {
  const dest = join(dir, file);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, text);
  return dest;
}

test('reads the LoopraX version and rejects a mismatched tag or a development version', t => {
  const dir = fixture(t);
  write(dir, 'internal/controller/version.go', 'package controller\nvar Version = "26.10.1.2"\n');
  assert.deepEqual(readSourceVersion(dir, 'v26.10.1.2'), { version: '26.10.1.2', npmVersion: '26.10.1' });
  assert.throws(() => readSourceVersion(dir, 'v26.10.1'), /does not match/);
  write(dir, 'internal/controller/version.go', 'var Version = "0.1.0-go"\n');
  assert.throws(() => readSourceVersion(dir), /Invalid source version/);
});

test('keeps LoopraX package names and still canonicalizes historical Loopra installers', () => {
  assert.equal(downloadName('loopra-desktop-windows-amd64-setup.exe'), 'loopra-desktop-windows-amd64-setup.exe');
  assert.equal(downloadName('loopra-desktop-darwin-arm64.zip'), 'loopra-desktop-darwin-arm64.zip');
  assert.equal(downloadName('loopra-windows-amd64.exe'), 'loopra-windows-amd64.exe');
  assert.equal(downloadName('Loopra-26.10.1-arm64-mac.zip'), 'Loopra-macos-arm64.zip');
  assert.equal(downloadName('loopra-dist.tar.gz'), 'loopra-dist.tar.gz');
  assert.equal(downloadName('notes.md'), null);
});

test('legacy portable releases remain readable and new releases require both Windows installers', t => {
  const legacy = releasePackages.filter(name => !name.endsWith('-setup.exe'));
  assert.equal(isLoopraxRelease(legacy), true);
  assert.equal(isLoopraxRelease(legacy, true), false);
  assert.equal(isLoopraxRelease([...legacy, 'loopra-desktop-windows-amd64-setup.exe']), false);
  const dir = fixture(t);
  write(dir, 'release-metadata.json', JSON.stringify({ version: '26.11.105', npmVersion: '26.11.105', sourceSha: 'a'.repeat(40), sourceRepository: 'ezdemo/loopra', releaseRepository: 'ezdemo/loopra-release' }));
  for (const name of legacy) write(dir, name, 'payload');
  assert.throws(() => prepareAssets(dir), /including Windows installers/);
});

test('prepares all active LoopraX packages without paused 32-bit targets and preserves metadata', t => {
  const dir = fixture(t);
  const sha = 'a'.repeat(40);
  write(dir, 'release-metadata.json', JSON.stringify({ version: '26.10.1', npmVersion: '26.10.1', sourceSha: sha,
    sourceRepository: 'ezdemo/loopra', releaseRepository: 'ezdemo/loopra-release' }));
  write(dir, 'release-changes.md', '### 新增\n\n- 一项可核对的更新');
  for (const name of releasePackages) write(dir, name, `package ${name}`);
  write(dir, 'setup.ps1', 'installer script should stay out of download list');
  write(dir, 'loopra-desktop-darwin-arm64.app', 'bundle directory is not a release asset');
  const notes = prepareAssets(dir);
  assert.match(notes, /## LoopraX v26\.10\.1/);
  assert.match(notes, new RegExp(`ezdemo/loopra/commit/${sha}`));
  assert.match(notes, /一项可核对的更新/);
  assert.ok(notes.indexOf('loopra-desktop-windows-amd64-setup.exe') < notes.indexOf('#### Windows 便携版'));
  assert.ok(notes.indexOf('loopra-desktop-windows-amd64.exe') > notes.indexOf('#### Windows 便携版'));
  assert.deepEqual(readdirSync(join(dir, 'publish')).sort(), [...releasePackages].sort());
  assert.equal(parseMetadata(notes).sourceSha, sha);
  assert.equal(parseMetadata(notes).sourceRepository, 'ezdemo/loopra');
  assert.match(parseMetadata(notes).artifacts['loopra-linux-amd64'], /^[a-f0-9]{64}$/);
  assert.doesNotMatch(notes, /setup\.ps1|Loopra-macos|loopra-windows-386\.exe|loopra-linux-armv7/);
  rmSync(join(dir, 'loopra-linux-amd64'));
  assert.throws(() => prepareAssets(dir, join(dir, 'incomplete')), /Every LoopraX package, including Windows installers, is required/);
});

test('stages all active LoopraX packages without paused 32-bit targets and rejects missing active targets', t => {
  const dir = fixture(t);
  for (const name of releasePackages) write(dir, `bin/${name}`, name);
  write(dir, 'bin/loopra.exe', 'windows alias stays out of the release');
  const out = join(dir, 'out');
  assert.deepEqual(stageAssets(join(dir, 'bin'), out).sort(), [...releasePackages].sort());
  assert.deepEqual(readdirSync(out).sort(), [...releasePackages].sort());
  rmSync(join(dir, 'bin', 'loopra-linux-amd64'));
  assert.throws(() => stageAssets(join(dir, 'bin'), join(dir, 'incomplete')),
    /Missing LoopraX packages: loopra-linux-amd64$/);
  mkdirSync(join(dir, 'empty'));
  assert.throws(() => stageAssets(join(dir, 'empty'), join(dir, 'other')), /Missing LoopraX packages/);
});

test('shell installers download the matching LoopraX package', t => {
  const dir = fixture(t);
  const installDir = join(dir, 'install');
  const binary = `looprax-binary\n${'x'.repeat(80)}`;
  write(dir, 'bundle.bin', binary);
  const curl = write(dir, 'bin/curl', `#!/usr/bin/env bash
set -eu
while [[ $# -gt 0 ]]; do
  case "$1" in
    http*) printf '%s' "$1" > "$TRACE_URL" ;;
    -o) shift; cp "$MOCK_BUNDLE" "$1" ;;
  esac
  shift
done
`);
  chmodSync(curl, 0o755);
  const run = (file, extra = {}) => {
    const env = { ...process.env, MOCK_BIN: shellPath(join(dir, 'bin')),
      TRACE_URL: shellPath(join(dir, 'url')), MOCK_BUNDLE: shellPath(join(dir, 'bundle.bin')),
      LOOPRAX_OS: 'linux', LOOPRAX_ARCH: 'amd64', LOOPRAX_INSTALL_DIR: shellPath(installDir),
      LOOPRAX_SKIP_PATH: '1', ...extra };
    delete env.LOOPRA_MIRROR;
    delete env.LOOPRA_VERSION;
    Object.assign(env, extra);
    execFileSync(bash, ['-c', 'export PATH="$MOCK_BIN:$PATH"; exec bash "$@"', 'installer-test', shellPath(join(tooling, file))], { env, encoding: 'utf8' });
    return readFileSync(join(dir, 'url'), 'utf8');
  };
  const base = 'https://github.com/ezdemo/loopra-release/releases';
  assert.equal(run('setup.sh'), `${base}/latest/download/loopra-linux-amd64`);
  assert.equal(readFileSync(join(installDir, 'loopra'), 'utf8'), binary);
  assert.equal(run('setup-gui.sh', { LOOPRA_VERSION: 'v26.10.1' }), `${base}/download/v26.10.1/loopra-desktop-linux-amd64`);
  assert.equal(readFileSync(join(installDir, 'loopra-desktop'), 'utf8'), binary);
  assert.equal(run('setup-mirror.sh'), `https://gh-proxy.org/${base}/latest/download/loopra-linux-amd64`);
  assert.equal(run('setup-gui-mirror.sh', { LOOPRA_MIRROR: 'https://mirror.example/', LOOPRA_VERSION: 'v26.10.1' }),
    `https://mirror.example/${base}/download/v26.10.1/loopra-desktop-linux-amd64`);
});

test('macOS desktop installer unpacks Loopra.app', t => {
  const dir = fixture(t);
  const zip = join(dir, 'LoopraX.zip');
  const apps = join(dir, 'apps');
  const python = process.platform === 'win32' ? 'python' : 'python3';
  execFileSync(python, ['-c', `
import zipfile
archive = zipfile.ZipFile(r'''${zip}''', 'w')
payload = b'app-bin-' + b'x' * 64
archive.writestr('loopra-desktop-darwin-arm64.app/Contents/Info.plist', b'plist')
archive.writestr('loopra-desktop-darwin-arm64.app/Contents/MacOS/Loopra', payload)
archive.close()
`]);
  const curl = write(dir, 'bin/curl', `#!/usr/bin/env bash
set -eu
while [[ $# -gt 0 ]]; do
  case "$1" in
    http*) printf '%s' "$1" > "$TRACE_URL" ;;
    -o) shift; cp "$MOCK_BUNDLE" "$1" ;;
  esac
  shift
done
`);
  chmodSync(curl, 0o755);
  execFileSync(bash, ['-c', 'export PATH="$MOCK_BIN:$PATH"; exec bash "$@"', 'installer-test', shellPath(join(tooling, 'setup-gui.sh'))], {
    env: { ...process.env, MOCK_BIN: shellPath(join(dir, 'bin')), TRACE_URL: shellPath(join(dir, 'url')),
      MOCK_BUNDLE: shellPath(zip), LOOPRAX_OS: 'darwin', LOOPRAX_ARCH: 'arm64',
      LOOPRAX_INSTALL_DIR: shellPath(apps), LOOPRAX_SKIP_PATH: '1' },
    encoding: 'utf8',
  });
  assert.match(readFileSync(join(dir, 'url'), 'utf8'), /loopra-desktop-darwin-arm64\.zip$/);
  assert.match(readFileSync(join(apps, 'Loopra.app', 'Contents', 'MacOS', 'Loopra'), 'utf8'), /^app-bin-/);
});

test('release guard permits a new version and rejects published or changed-source releases', async () => {
  const metadata = { version: '26.10.1', npmVersion: '26.10.1', sourceSha: 'a'.repeat(40),
    sourceRepository: 'ezdemo/loopra', releaseRepository: 'ezdemo/loopra-release' };
  await checkRelease(metadata, 'test-token', async () => new Response('', { status: 404 }));
  await assert.rejects(checkRelease(metadata, 'test-token', async () => new Response('', { status: 403 })), /HTTP 403/);
  await assert.rejects(checkRelease(metadata, 'test-token', async () => Response.json({ draft: false })), /already published/);
  const existingDraft = async url => url.includes('/releases/tags/')
    ? Response.json({ draft: true, assets: [{ id: 1, name: 'release-metadata.json' }] })
    : Response.json(metadata);
  await checkRelease(metadata, 'test-token', existingDraft);
  await assert.rejects(checkRelease({ ...metadata, sourceSha: 'b'.repeat(40) }, 'test-token', existingDraft), /another main commit/);
});
