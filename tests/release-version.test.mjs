import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { nextVersion, reserveVersion, shanghaiDate } from '../.release/release-version.mjs';
import { setBuildVersion } from '../.release/set-version.mjs';
import { createSourceMetadata, readSourceVersion } from '../.release/source-metadata.mjs';

const today = new Date('2026-10-19T04:00:00Z');
const releaseSha = 'a'.repeat(40);

test('uses Shanghai calendar dates and a two-digit daily sequence without leading-zero SemVer parts', () => {
  assert.deepEqual(shanghaiDate(new Date('2026-10-18T16:00:00Z')), { year: 26, month: 10, day: 19 });
  assert.equal(nextVersion([], today), '26.10.1901');
  assert.equal(nextVersion(['v26.10.1901'], today), '26.10.1902');
  assert.equal(nextVersion(['v26.10.1901', 'v26.10.1902'], today), '26.10.1903');
  assert.equal(nextVersion(['v26.10.1999'], new Date('2026-10-19T16:00:00Z')), '26.10.2001');
  assert.equal(nextVersion([], new Date('2026-12-31T16:00:00Z')), '27.1.101');
  assert.equal(nextVersion(['v26.10.111'], new Date('2026-10-11T04:00:00Z')), '26.10.1101');
  assert.equal(nextVersion(['v26.10.1101'], new Date('2026-10-01T04:00:00Z')), '26.10.101');
  assert.throws(() => nextVersion(['v26.10.1999'], today), /99 reserved versions/);
});

test('drafts and tags reserve numbers; an atomic tag collision moves to the next sequence', async () => {
  const created = [];
  const version = await reserveVersion({ token: 'test-token', releaseSha, now: today, request: async (url, options) => {
    if (url.includes('/tags?')) return Response.json([{ name: 'v26.10.1901' }]);
    if (url.includes('/releases?')) return Response.json([{ tag_name: 'v26.10.1902', draft: true }]);
    if (options.method === 'POST') {
      const body = JSON.parse(options.body);
      assert.equal(body.sha, releaseSha);
      created.push(body.ref);
      return created.length === 1 ? new Response('', { status: 422 }) : Response.json({}, { status: 201 });
    }
    assert.ok(url.endsWith('/git/ref/tags/v26.10.1903'));
    return Response.json({ ref: 'refs/tags/v26.10.1903' });
  } });
  assert.equal(version, '26.10.1904');
  assert.deepEqual(created, ['refs/tags/v26.10.1903', 'refs/tags/v26.10.1904']);
});

test('reservation scans all pages and does not mistake validation/permission errors for collisions', async () => {
  let posts = 0;
  const version = await reserveVersion({ token: 'test-token', releaseSha, now: today, request: async (url, options) => {
    if (options.method === 'POST') { posts++; return Response.json({}, { status: 201 }); }
    if (url.includes('/releases?')) return Response.json([]);
    return Response.json(url.endsWith('page=1') ? Array.from({ length: 100 }, () => ({ name: 'v25.1.101' })) : [{ name: 'v26.10.1907' }]);
  } });
  assert.equal(version, '26.10.1908');
  assert.equal(posts, 1);
  await assert.rejects(reserveVersion({ token: 'test-token', releaseSha, now: today, request: async (url, options) => {
    if (url.includes('?')) return Response.json([]);
    return new Response('', { status: options.method === 'POST' ? 422 : 404 });
  } }), /Cannot reserve version/);
});

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'loopra-build-version-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const write = (file, value) => {
    mkdirSync(dirname(join(dir, file)), { recursive: true });
    writeFileSync(join(dir, file), value);
  };
  write('internal/controller/version.go', 'package controller\n\nvar Version = "0.1.0-go"\nvar BuildTime = ""\n');
  return { dir, write, read: file => readFileSync(join(dir, file), 'utf8') };
}

test('injects one build version into version.go and preserves the build timestamp variable', t => {
  const f = fixture(t);
  setBuildVersion(f.dir, '26.10.1901');
  assert.deepEqual(readSourceVersion(f.dir), { version: '26.10.1901', npmVersion: '26.10.1901' });
  assert.match(f.read('internal/controller/version.go'), /var Version = "26\.10\.1901"/);
  assert.match(f.read('internal/controller/version.go'), /var BuildTime = ""/);
  setBuildVersion(f.dir, '26.10.1901');
  assert.match(f.read('internal/controller/version.go'), /var Version = "26\.10\.1901"/);
});

test('validates version.go before writing any version file', t => {
  const f = fixture(t);
  f.write('internal/controller/version.go', 'var Version = "0.1.0-go"\nvar Version = "9.9.9"\n');
  assert.throws(() => setBuildVersion(f.dir, '26.10.1901'), /exactly one/);
  assert.match(f.read('internal/controller/version.go'), /0\.1\.0-go/);
  f.write('internal/controller/version.go', 'package controller\n\nvar Version = "0.1.0-go"\n');
  assert.throws(() => setBuildVersion(f.dir, '26.01.1901'), /SemVer/);
  assert.match(f.read('internal/controller/version.go'), /0\.1\.0-go/);
});

test('records the original source version and SHA independently of the generated release version', t => {
  const f = fixture(t);
  const git = (...args) => execFileSync('git', ['-C', f.dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git('init');
  git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', '-c', 'core.hooksPath=/dev/null', 'commit', '--allow-empty', '--no-gpg-sign', '-m', 'source commit');
  const sourceSha = git('rev-parse', 'HEAD');
  const metadata = createSourceMetadata(f.dir, '26.10.1901', releaseSha);
  assert.equal(metadata.version, '26.10.1901');
  assert.equal(metadata.npmVersion, '26.10.1901');
  assert.equal(metadata.originalSourceVersion, '0.1.0-go');
  assert.equal(metadata.sourceRepository, 'ezdemo/looprax');
  assert.equal(metadata.sourceSha, sourceSha);
  assert.equal(metadata.releaseSha, releaseSha);
  assert.equal(git('rev-parse', 'HEAD'), sourceSha);
});
