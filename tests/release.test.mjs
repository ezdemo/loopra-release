import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { readSourceVersion } from '../.release/source-metadata.mjs';
import { prepareAssets, validateWindowsUpdate, validateUpdateManifest, validReleaseAssets } from '../.release/prepare-assets.mjs';
import { checkRelease } from '../.release/check-release.mjs';
import { parseMetadata } from '../.release/release-metadata.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const tooling = join(root, '.release');
const bash = process.env.BASH_EXE || (process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : '/bin/bash');
const shellPath = path => path.replaceAll('\\', '/').replace(/^([A-Za-z]):\//, (_, drive) => `/${drive.toLowerCase()}/`);
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

test('reads source version consistency; mismatched tags and stale installer versions fail', t => {
  const dir = fixture(t);
  write(dir, 'pom.xml', '<project><properties><loopra.version>26.10.1.2</loopra.version></properties></project>');
  write(dir, 'loopra/src/installDist/bin/version.txt', '26.10.1.2\n');
  write(dir, 'loopra-front/package.json', JSON.stringify({ version: '26.10.1' }));
  assert.deepEqual(readSourceVersion(dir, 'v26.10.1.2'), { version: '26.10.1.2', npmVersion: '26.10.1' });
  assert.throws(() => readSourceVersion(dir, 'v26.10.1'), /does not match/);
  write(dir, 'loopra/src/installDist/bin/version.txt', '26.9.91\n');
  assert.throws(() => readSourceVersion(dir), /versions disagree/);
  write(dir, 'pom.xml', '<loopra.version>26.10.1-SNAPSHOT</loopra.version>');
  assert.throws(() => readSourceVersion(dir), /Invalid source version/);
});

function windowsUpdate(dir, installer = 'Loopra-windows-x64.exe') {
  const bytes = readFileSync(join(dir, installer));
  const sha512 = createHash('sha512').update(bytes).digest('base64');
  write(dir, 'Loopra-windows-x64.exe.blockmap', 'blockmap fixture');
  const text = `version: 26.10.1\nfiles:\n  - url: Loopra-windows-x64.exe\n    sha512: ${sha512}\n    size: ${bytes.length}\npath: Loopra-windows-x64.exe\nsha512: ${sha512}\nreleaseDate: '2026-10-20T00:00:00.000Z'\n`;
  write(dir, 'latest.yml', text);
  return text;
}

function manifest(dir, name, files) {
  const entries = files.map(file => {
    const bytes = readFileSync(join(dir, file.name));
    return { url: file.download, sha512: createHash('sha512').update(bytes).digest('base64'), size: bytes.length };
  });
  const text = `version: 26.10.1\nfiles:\n${entries.map(entry => `  - url: ${entry.url}\n    sha512: ${entry.sha512}\n    size: ${entry.size}`).join('\n')}\npath: ${entries[0].url}\nsha512: ${entries[0].sha512}\n`;
  write(dir, name, text);
  return text;
}

function linuxUpdate(dir, debName = 'Loopra-linux-x64.deb') {
  write(dir, 'Loopra-linux-x64.AppImage', 'appimage fixture');
  const files = [{ name: 'Loopra-linux-x64.AppImage', download: 'Loopra-linux-x64.AppImage' }, { name: debName, download: 'Loopra-linux-x64.deb' }];
  manifest(dir, 'latest-linux.yml', files);
  return files;
}

function desktopArtifacts(t, signed) {
  const dir = fixture(t);
  write(dir, 'release-metadata.json', JSON.stringify({ version: '26.10.1', npmVersion: '26.10.1', sourceSha: 'a'.repeat(40), sourceRepository: 'ezdemo/loopra', releaseRepository: 'ezdemo/loopra-release' }));
  write(dir, 'release-changes.md', '### 修复\n\n- 自动更新');
  for (const name of ['loopra-dist.tar.gz', 'Loopra-macos-arm64.zip', 'Loopra-windows-x64.exe', 'Loopra-linux-x64.deb']) write(dir, name, 'package fixture');
  windowsUpdate(dir); linuxUpdate(dir);
  write(dir, 'desktop-update-mac.json', JSON.stringify({ signed }));
  if (signed) {
    manifest(dir, 'latest-mac.yml', [{ name: 'Loopra-macos-arm64.zip', download: 'Loopra-macos-arm64.zip' }]);
    write(dir, 'Loopra-macos-arm64.zip.blockmap', 'blockmap fixture');
  }
  return dir;
}

test('publishes five packages plus verified Windows/Linux update assets; metadata stays in the release body', t => {
  const dir = fixture(t);
  const sha = 'a'.repeat(40);
  write(dir, 'release-metadata.json', JSON.stringify({ version: '26.10.1', npmVersion: '26.10.1', sourceSha: sha,
    sourceRepository: 'ezdemo/loopra', releaseRepository: 'ezdemo/loopra-release' }));
  write(dir, 'release-changes.md', '### 新增\n\n- 一项可核对的更新');
  for (const name of ['Loopra-26.10.1-arm64-mac.zip', 'Loopra.Setup.26.10.1.exe', 'loopra-front_26.10.1_amd64.deb', 'loopra-dist.tar.gz']) {
    write(dir, name, 'package fixture');
  }
  write(dir, 'setup.ps1', 'installer script should stay out of download list');
  write(dir, 'SHA256SUMS', 'old checksums should stay out of download list');
  windowsUpdate(dir, 'Loopra.Setup.26.10.1.exe');
  linuxUpdate(dir, 'loopra-front_26.10.1_amd64.deb');
  write(dir, 'desktop-update-mac.json', '{"signed":false}');
  const notes = prepareAssets(dir);
  assert.match(notes, new RegExp(`ezdemo/loopra/commit/${sha}`));
  assert.match(notes, /一项可核对的更新/);
  assert.deepEqual(readdirSync(join(dir, 'publish')).sort(), [
    'Loopra-linux-x64.AppImage', 'Loopra-linux-x64.deb', 'Loopra-macos-arm64.zip', 'Loopra-windows-x64.exe', 'Loopra-windows-x64.exe.blockmap', 'latest-linux.yml', 'latest.yml', 'loopra-dist.tar.gz',
  ]);
  assert.equal(parseMetadata(notes).sourceSha, sha);
  assert.match(parseMetadata(notes).artifacts['loopra-dist.tar.gz'], /^[a-f0-9]{64}$/);
  assert.match(parseMetadata(notes).artifacts['latest.yml'], /^[a-f0-9]{64}$/);
  assert.doesNotMatch(notes.split('<!--')[0], /latest\.yml|\.blockmap/);
  assert.doesNotMatch(notes, /setup\.ps1|SHA256SUMS/);
});

test('signed macOS publishes its manifest/blockmap; ad-hoc archives remain available without an update feed', t => {
  for (const signed of [false, true]) {
    const dir = desktopArtifacts(t, signed);
    const notes = prepareAssets(dir);
    const names = readdirSync(join(dir, 'publish'));
    assert.equal(names.length, signed ? 10 : 8);
    assert.equal(names.includes('latest-mac.yml'), signed);
    assert.equal(names.includes('desktop-update-mac.json'), false);
    assert.equal(parseMetadata(notes).desktopUpdates.mac, signed);
  }
});

test('missing platform metadata or an unsigned macOS update feed blocks publication', t => {
  const adhoc = desktopArtifacts(t, false);
  write(adhoc, 'latest-mac.yml', 'unsigned update');
  assert.throws(() => prepareAssets(adhoc), /Ad-hoc/);
  const signed = desktopArtifacts(t, true);
  rmSync(join(signed, 'latest-mac.yml'));
  assert.throws(() => prepareAssets(signed), /ENOENT/);
  const linux = desktopArtifacts(t, false);
  rmSync(join(linux, 'latest-linux.yml'));
  assert.throws(() => prepareAssets(linux), /ENOENT/);
});

test('validates every Linux manifest entry, including secondary file hashes and untrusted URLs', t => {
  const dir = desktopArtifacts(t, false);
  const files = [{ name: 'Loopra-linux-x64.AppImage', download: 'Loopra-linux-x64.AppImage' }, { name: 'Loopra-linux-x64.deb', download: 'Loopra-linux-x64.deb' }];
  const text = readFileSync(join(dir, 'latest-linux.yml'), 'utf8');
  validateUpdateManifest(dir, 'latest-linux.yml', '26.10.1', files);
  for (const bad of [text.replace('Loopra-linux-x64.deb', 'https://other.example/package.deb'),
    text.replace('version: 26.10.1', 'version: 26.10.2'), text.replace(/(    sha512: .+\n)/, '$1$1')]) {
    write(dir, 'latest-linux.yml', bad);
    assert.throws(() => validateUpdateManifest(dir, 'latest-linux.yml', '26.10.1', files), /Invalid|does not match/);
  }
  write(dir, 'latest-linux.yml', text);
  write(dir, 'Loopra-linux-x64.deb', 'tampered secondary file');
  assert.throws(() => validateUpdateManifest(dir, 'latest-linux.yml', '26.10.1', files), /does not match/);
});

test('legacy four/six assets and complete multiplatform groups are accepted, partial update feeds are rejected', () => {
  const legacy = ['loopra-dist.tar.gz', 'Loopra-macos-arm64.zip', 'Loopra-windows-x64.exe', 'Loopra-linux-x64.deb'];
  const windows = [...legacy, 'latest.yml', 'Loopra-windows-x64.exe.blockmap'];
  const linux = [...windows, 'Loopra-linux-x64.AppImage', 'latest-linux.yml'];
  const all = [...linux, 'latest-mac.yml', 'Loopra-macos-arm64.zip.blockmap'];
  for (const names of [legacy, windows, linux, all]) assert.equal(validReleaseAssets(names), true);
  for (const names of [[...linux, 'latest-mac.yml'], all.filter(name => name !== 'latest-linux.yml'),
    all.filter(name => name !== 'Loopra-windows-x64.exe.blockmap'), [...linux, 'unexpected.yml']]) assert.equal(validReleaseAssets(names), false);
});

test('rejects missing/mismatched Windows manifests and installer checksums before publishing', t => {
  const dir = fixture(t);
  write(dir, 'Loopra-windows-x64.exe', 'package fixture');
  assert.throws(() => validateWindowsUpdate(dir, '26.10.1', 'Loopra-windows-x64.exe'), /ENOENT/);
  const manifest = windowsUpdate(dir);
  for (const text of [manifest.replace('version: 26.10.1', 'version: 26.10.2'),
    manifest.replaceAll('Loopra-windows-x64.exe', 'other.exe'),
    manifest.replace('size: 15', 'size: 16'),
    manifest.replace(/sha512: .+/g, 'sha512: wrong')]) {
    write(dir, 'latest.yml', text);
    assert.throws(() => validateWindowsUpdate(dir, '26.10.1', 'Loopra-windows-x64.exe'), /does not match/);
  }
  write(dir, 'latest.yml', manifest);
  write(dir, 'Loopra-windows-x64.exe', 'tampered');
  assert.throws(() => validateWindowsUpdate(dir, '26.10.1', 'Loopra-windows-x64.exe'), /does not match/);
});

test('shell installers use new release URLs and preserve mirror, version and GUI options', t => {
  const dir = fixture(t);
  write(dir, 'payload/install.sh', '#!/usr/bin/env bash\nprintf "%s" "$*" > "$TRACE_ARGS"\n');
  execFileSync('tar', ['-czf', join(dir, 'bundle.tar.gz'), '-C', join(dir, 'payload'), 'install.sh']);
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
      TRACE_URL: shellPath(join(dir, 'url')), TRACE_ARGS: shellPath(join(dir, 'args')),
      MOCK_BUNDLE: shellPath(join(dir, 'bundle.tar.gz')), ...extra };
    delete env.LOOPRA_MIRROR;
    delete env.LOOPRA_VERSION;
    Object.assign(env, extra);
    execFileSync(bash, ['-c', 'export PATH="$MOCK_BIN:$PATH"; exec bash "$@"', 'installer-test', shellPath(join(tooling, file))], { env, encoding: 'utf8' });
    return { url: readFileSync(join(dir, 'url'), 'utf8'), args: readFileSync(join(dir, 'args'), 'utf8') };
  };
  const base = 'https://github.com/ezdemo/loopra-release/releases';
  assert.deepEqual(run('setup.sh'), { url: `${base}/latest/download/loopra-dist.tar.gz`, args: '--setup' });
  assert.deepEqual(run('setup-gui.sh', { LOOPRA_VERSION: 'v26.10.1' }), { url: `${base}/download/v26.10.1/loopra-dist.tar.gz`, args: '--gui --setup' });
  assert.equal(run('setup-mirror.sh').url, `https://gh-proxy.org/${base}/latest/download/loopra-dist.tar.gz`);
  assert.deepEqual(run('setup-gui-mirror.sh', { LOOPRA_MIRROR: 'https://mirror.example/', LOOPRA_VERSION: 'v26.10.1' }), {
    url: `https://mirror.example/${base}/download/v26.10.1/loopra-dist.tar.gz`, args: '--gui --setup',
  });
});

test('core embedding writes into the requested source checkout', t => {
  const dir = fixture(t);
  write(dir, 'source/pom.xml', '<project/>');
  write(dir, 'payload/loopra-web.jar', 'fixture');
  execFileSync('tar', ['-czf', join(dir, 'bundle.tar.gz'), '-C', join(dir, 'payload'), 'loopra-web.jar']);
  execFileSync(bash, [shellPath(join(tooling, 'ci-embed-core.sh')), shellPath(join(dir, 'bundle.tar.gz'))], {
    env: { ...process.env, LOOPRA_SOURCE_DIR: shellPath(join(dir, 'source')) },
  });
  assert.equal(readFileSync(join(dir, 'source/loopra-front/resources/loopra-core/loopra-web.jar'), 'utf8'), 'fixture');
});

test('frontend sync replaces old assets but preserves the source config.json', t => {
  const dir = fixture(t);
  write(dir, 'source/pom.xml', '<project/>');
  write(dir, 'source/loopra-front/dist/renderer/index.html', 'new UI');
  write(dir, 'source/loopra-front/dist/renderer/config.json', 'build config');
  const staticDir = 'source/loopra/src/main/resources/static';
  write(dir, `${staticDir}/config.json`, 'local config');
  write(dir, `${staticDir}/assets/old.js`, 'stale');
  const pnpm = write(dir, 'bin/pnpm', '#!/usr/bin/env bash\nexit 0\n');
  chmodSync(pnpm, 0o755);
  execFileSync(bash, ['-c', 'export PATH="$MOCK_BIN:$PATH"; exec bash "$@"', 'sync-test', shellPath(join(tooling, 'ci-sync-web-assets.sh'))], {
    env: { ...process.env, MOCK_BIN: shellPath(join(dir, 'bin')), LOOPRA_SOURCE_DIR: shellPath(join(dir, 'source')) },
  });
  assert.equal(readFileSync(join(dir, staticDir, 'config.json'), 'utf8'), 'local config');
  assert.equal(readFileSync(join(dir, staticDir, 'index.html'), 'utf8'), 'new UI');
  assert.deepEqual(readdirSync(join(dir, staticDir)).sort(), ['config.json', 'index.html']);
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
