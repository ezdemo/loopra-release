import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { readSourceVersion } from '../.release/source-metadata.mjs';
import { prepareAssets } from '../.release/prepare-assets.mjs';
import { checkRelease } from '../.release/check-release.mjs';

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

test('source version is authoritative; mismatched tags and stale installer versions fail', t => {
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

test('release asset installers stay pinned while main installers keep following latest', t => {
  const dir = fixture(t);
  const sha = 'a'.repeat(40);
  write(dir, 'release-metadata.json', JSON.stringify({ version: '26.10.1', sourceSha: sha }));
  const notes = prepareAssets(dir);
  assert.match(notes, new RegExp(`ezdemo/loopra/commit/${sha}`));
  const installers = readdirSync(dir).filter(file => /^setup.*\.(sh|ps1)$/.test(file));
  assert.equal(installers.length, 8);
  for (const file of installers) {
    assert.match(readFileSync(join(dir, file), 'utf8'), /VERSION\s*=\s*"v26\.10\.1"/);
    assert.match(readFileSync(join(tooling, file), 'utf8'), /latest/);
  }
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
  const metadata = { version: '26.10.1', sourceSha: 'a'.repeat(40) };
  await checkRelease(metadata, 'test-token', async () => new Response('', { status: 404 }));
  await assert.rejects(checkRelease(metadata, 'test-token', async () => new Response('', { status: 403 })), /HTTP 403/);
  await assert.rejects(checkRelease(metadata, 'test-token', async () => Response.json({ draft: false })), /already published/);
  const existingDraft = async url => url.includes('/releases/tags/')
    ? Response.json({ draft: true, assets: [{ name: 'release-metadata.json', url: 'https://api.github.com/asset' }] })
    : Response.json(metadata);
  await checkRelease(metadata, 'test-token', existingDraft);
  await assert.rejects(checkRelease({ ...metadata, sourceSha: 'b'.repeat(40) }, 'test-token', existingDraft), /another main commit/);
});
