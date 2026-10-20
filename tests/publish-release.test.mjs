import assert from 'node:assert/strict';
import { test } from 'node:test';
import { metadataComment } from '../.release/release-metadata.mjs';
import { publishRelease } from '../.release/publish-release.mjs';

const tag = 'v26.10.1904';
const releaseSha = 'a'.repeat(40);
function fixture() {
  const names = ['loopra-dist.tar.gz', 'Loopra-linux-x64.deb', 'Loopra-macos-arm64.zip', 'Loopra-windows-x64.exe'];
  const metadata = { version: tag.slice(1), npmVersion: tag.slice(1), sourceSha: 'b'.repeat(40), releaseSha,
    sourceRepository: 'ezdemo/loopra', releaseRepository: 'ezdemo/loopra-release',
    artifacts: Object.fromEntries(names.map((name, i) => [name, String(i).repeat(64)])) };
  const state = { calls: [], patchStatus: 200, metadata,
    release: { id: 12, tag_name: tag, draft: true, prerelease: false, body: metadataComment(metadata),
      html_url: `https://github.com/ezdemo/loopra-release/releases/tag/${tag}`,
      assets: names.map(name => ({ name, state: 'uploaded', size: 100, digest: `sha256:${metadata.artifacts[name]}` })) } };
  const request = async (url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    state.calls.push({ url, method: options.method || 'GET' });
    // Model GitHub's actual API: drafts are invisible to the by-tag endpoint.
    if (url.includes('/releases/tags/')) return new Response('', { status: 404 });
    assert.equal(url, 'https://api.github.com/repos/ezdemo/loopra-release/releases/12');
    if (options.method === 'PATCH') {
      assert.equal(url, 'https://api.github.com/repos/ezdemo/loopra-release/releases/12');
      assert.deepEqual(JSON.parse(options.body), { draft: false, prerelease: false, make_latest: 'true' });
      if (state.patchStatus !== 200) return new Response('', { status: state.patchStatus });
      state.release.draft = false;
    }
    return Response.json(state.release);
  };
  return { state, request, run: options => publishRelease({ tag, releaseId: 12, releaseSha, token: 'test-token', request, ...options }) };
}

test('publishes a draft by its upload ID when the by-tag API returns 404', async () => {
  const { state, request, run } = fixture();
  assert.equal((await request(`https://api.github.com/repos/ezdemo/loopra-release/releases/tags/${tag}`,
    { headers: { Authorization: 'Bearer test-token' } })).status, 404);
  state.calls = [];
  assert.equal((await run({ releaseId: '12' })).draft, false);
  assert.ok(state.calls.every(call => call.url.endsWith('/releases/12')));
});

test('publishes a complete draft only after verifying every package and its build identity', async () => {
  const { state, run } = fixture();
  assert.equal((await run()).draft, false);
  assert.deepEqual(state.calls.map(call => call.method), ['GET', 'PATCH']);
});

test('publishes complete Windows update metadata and rejects a missing update asset', async () => {
  for (const incomplete of [false, true]) {
    const { state, run } = fixture();
    for (const name of ['latest.yml', 'Loopra-windows-x64.exe.blockmap']) {
      state.metadata.artifacts[name] = 'e'.repeat(64);
      state.release.assets.push({ name, state: 'uploaded', size: 100, digest: `sha256:${'e'.repeat(64)}` });
    }
    state.release.body = metadataComment(state.metadata);
    if (incomplete) {
      state.release.assets.pop();
      await assert.rejects(run(), /Uploaded packages/);
    } else assert.equal((await run()).draft, false);
  }
});

test('incomplete, corrupted or unexpected uploaded packages remain unpublished', async () => {
  for (const change of [
    release => release.assets.pop(),
    release => { release.assets[0].state = 'starter'; },
    release => { release.assets[0].size = 0; },
    release => { release.assets[0].digest = `sha256:${'f'.repeat(64)}`; },
    release => { release.assets[0].digest = null; },
    release => { release.assets[0].name = release.assets[1].name; },
    release => { release.assets.push({ name: 'unexpected.exe' }); },
  ]) {
    const { state, run } = fixture();
    change(state.release);
    await assert.rejects(run(), /Uploaded packages/);
    assert.equal(state.release.draft, true);
    assert.deepEqual(state.calls.map(call => call.method), ['GET']);
  }
});

test('mismatched build metadata cannot publish a draft', async () => {
  for (const change of [
    state => { state.release.body = ''; },
    state => { state.release.id = 13; },
    state => { state.release.tag_name = 'v26.10.1903'; },
    state => { state.metadata.releaseSha = 'c'.repeat(40); state.release.body = metadataComment(state.metadata); },
    state => { delete state.metadata.artifacts['loopra-dist.tar.gz']; state.release.body = metadataComment(state.metadata); },
  ]) {
    const { state, run } = fixture();
    change(state);
    await assert.rejects(run(), /metadata/);
    assert.deepEqual(state.calls.map(call => call.method), ['GET']);
  }
});

test('validates input and credentials before making a request', async () => {
  for (const options of [{ tag: '../main' }, { releaseId: undefined }, { releaseId: 0 },
    { releaseId: '../12' }, { releaseId: Number.MAX_SAFE_INTEGER + 1 }, { releaseSha: 'main' }, { token: '' }]) {
    const { state, run } = fixture();
    await assert.rejects(run(options));
    assert.deepEqual(state.calls, []);
  }
});

test('retries of an already published matching release do not publish it twice', async () => {
  const { state, run } = fixture();
  state.release.draft = false;
  assert.equal((await run()).draft, false);
  assert.deepEqual(state.calls.map(call => call.method), ['GET']);
});

test('publication API failures remain visible and do not report success', async () => {
  const { state, run } = fixture();
  state.patchStatus = 403;
  await assert.rejects(run(), /HTTP 403/);
  assert.equal(state.release.draft, true);
  await assert.rejects(run({ request: async () => new Response('', { status: 404 }) }), /HTTP 404/);
});
