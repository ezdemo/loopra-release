import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { downloadCore } from '../.release/download-core.mjs';
import { metadataComment } from '../.release/release-metadata.mjs';

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'loopra-download-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}
const bundle = 'fixture core bundle';
const checksum = createHash('sha256').update(bundle).digest('hex');
const metadata = { version: '26.10.1', npmVersion: '26.10.1', sourceSha: 'a'.repeat(40),
  sourceRepository: 'ezdemo/loopra', releaseRepository: 'ezdemo/loopra-release', artifacts: { 'loopra-dist.tar.gz': checksum } };

test('npm downloads and verifies the core using hidden release metadata', async t => {
  const dir = fixture(t);
  const release = { tag_name: 'v26.10.1', draft: false, body: metadataComment(metadata), assets: [{ id: 1, name: 'loopra-dist.tar.gz' }] };
  await downloadCore(dir, { tag: 'v26.10.1', token: 'test-token', request: async url =>
    url.includes('/releases/tags/') ? Response.json(release) : new Response(bundle) });
  assert.equal(readFileSync(join(dir, 'loopra-dist.tar.gz'), 'utf8'), bundle);
  assert.deepEqual(JSON.parse(readFileSync(join(dir, 'release-metadata.json'), 'utf8')), metadata);
});

test('npm still accepts legacy metadata and checksums attachments', async t => {
  const dir = fixture(t);
  const { artifacts, ...oldMetadata } = metadata;
  const release = { tag_name: 'v26.10.1', draft: false, assets: [
    { id: 1, name: 'loopra-dist.tar.gz' }, { id: 2, name: 'release-metadata.json' }, { id: 3, name: 'SHA256SUMS' },
  ] };
  await downloadCore(dir, { tag: 'v26.10.1', token: 'test-token', request: async url => {
    if (url.includes('/releases/tags/')) return Response.json(release);
    if (url.endsWith('/2')) return Response.json(oldMetadata);
    return new Response(url.endsWith('/3') ? `${checksum}  loopra-dist.tar.gz\n` : bundle);
  } });
  assert.equal(readFileSync(join(dir, 'loopra-dist.tar.gz'), 'utf8'), bundle);
});

test('npm rejects draft releases and mismatched core checksums', async t => {
  const dir = fixture(t);
  await assert.rejects(downloadCore(dir, { tag: 'v26.10.1', request: async () => Response.json({ tag_name: 'v26.10.1', draft: true }) }), /not published/);
  await assert.rejects(downloadCore(dir, { tag: 'v26.10.1', request: async url => url.includes('/releases/tags/')
    ? Response.json({ tag_name: 'v26.10.1', draft: false, body: metadataComment(metadata), assets: [{ id: 1, name: 'loopra-dist.tar.gz' }] })
    : new Response('corrupted bundle') }), /checksum mismatch/);
});
