import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { metadataComment } from '../.release/release-metadata.mjs';
import { syncRelease } from '../.release/sync-release.mjs';

const tag = 'v26.10.1901';
const sha = 'a'.repeat(40);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));
function server(withUpdates = false) {
  const packages = ['loopra-dist.tar.gz', 'Loopra-linux-x64.deb', 'Loopra-macos-arm64.zip', 'Loopra-windows-x64.exe'];
  if (withUpdates) packages.push('latest.yml', 'Loopra-windows-x64.exe.blockmap');
  const bytes = Object.fromEntries(packages.map(name => [name, Buffer.from(`package bytes: ${name}`)]));
  const metadata = { version: tag.slice(1), npmVersion: tag.slice(1), sourceRepository: 'ezdemo/loopra',
    releaseRepository: 'ezdemo/loopra-release', sourceSha: sha,
    artifacts: Object.fromEntries(packages.map(name => [name, hash(bytes[name])])) };
  const state = { ref: null, target: null, latest: tag, corruptDownload: false, failUpload: null, corruptUpload: false, calls: [],
    release: { id: 1, tag_name: tag, name: `Loopra ${tag}`, draft: false, prerelease: false,
      body: `更新说明\nhttps://github.com/ezdemo/loopra-release/releases/download/${tag}/loopra-dist.tar.gz\n${metadataComment(metadata)}`,
      assets: packages.map((name, i) => ({ id: 100 + i, name, size: bytes[name].length, state: 'uploaded',
        digest: `sha256:${hash(bytes[name])}`, content_type: 'application/octet-stream', label: '' })) } };
  const json = value => Response.json(clone(value));
  const missing = () => new Response('', { status: 404 });
  async function request(url, options = {}) {
    const method = options.method || 'GET';
    const path = new URL(url).pathname;
    state.calls.push({ method, path });
    const original = path.startsWith('/repos/ezdemo/loopra-release/');
    assert.equal(options.headers.Authorization, original ? 'Bearer release-token' : 'Bearer source-token');
    if (original) {
      if (path.endsWith(`/releases/tags/${tag}`)) return json(state.release);
      if (path.endsWith('/releases/latest')) return json({ tag_name: state.latest });
      const asset = state.release.assets.find(asset => path.endsWith(`/releases/assets/${asset.id}`));
      if (asset) return new Response(state.corruptDownload ? 'bad bytes' : bytes[asset.name]);
    } else {
      const body = typeof options.body === 'string' ? JSON.parse(options.body) : null;
      if (path.endsWith(`/commits/${sha}`)) return json({ sha });
      if (path.endsWith(`/git/ref/tags/${tag}`)) return state.ref ? json(state.ref) : missing();
      if (path.endsWith(`/git/tags/${'b'.repeat(40)}`)) return json({ object: { type: 'commit', sha } });
      if (path.endsWith(`/releases/tags/${tag}`)) return state.target ? json(state.target) : missing();
      if (method === 'POST' && path.endsWith('/git/refs')) {
        assert.deepEqual(body, { ref: `refs/tags/${tag}`, sha });
        state.ref = { object: { type: 'commit', sha } };
        return json(state.ref);
      }
      if (method === 'POST' && path.endsWith('/releases')) {
        assert.equal(body.draft, true);
        assert.equal(body.target_commitish, sha);
        state.target = { ...body, id: 2, assets: [], upload_url: 'https://uploads.github.com/repos/ezdemo/loopra/releases/2/assets{?name,label}' };
        return json(state.target);
      }
      if (method === 'POST' && path.endsWith('/releases/2/assets')) {
        const name = new URL(url).searchParams.get('name');
        if (state.failUpload === name) return new Response('', { status: 502 });
        const chunks = [];
        for await (const chunk of options.body) chunks.push(chunk);
        const data = Buffer.concat(chunks);
        assert.deepEqual(data, bytes[name]);
        const uploaded = { id: 200 + state.target.assets.length, name, size: data.length, state: 'uploaded',
          digest: `sha256:${state.corruptUpload ? '0'.repeat(64) : hash(data)}` };
        state.target.assets.push(uploaded);
        return json(uploaded);
      }
      if (method === 'DELETE' && /\/releases\/assets\/\d+$/.test(path)) {
        const id = Number(path.split('/').at(-1));
        state.target.assets = state.target.assets.filter(asset => asset.id !== id);
        return new Response(null, { status: 204 });
      }
      if (method === 'PATCH' && path.endsWith('/releases/2')) {
        assert.equal(state.target.assets.length, packages.length, 'do not publish an incomplete mirror');
        Object.assign(state.target, body);
        return json(state.target);
      }
    }
    throw new Error(`Unexpected ${method} ${url}`);
  }
  return { state, run: options => syncRelease({ tag, sourceToken: 'source-token', releaseToken: 'release-token', request, ...options }) };
}
const writes = state => state.calls.filter(call => call.method !== 'GET');

test('mirrors Windows update manifest and blockmap along with all packages', async () => {
  const { state, run } = server(true);
  await run();
  assert.equal(state.target.assets.length, 6);
  assert.ok(state.target.assets.some(asset => asset.name === 'latest.yml'));
  assert.ok(state.target.assets.some(asset => asset.name === 'Loopra-windows-x64.exe.blockmap'));
  assert.equal(state.target.draft, false);
});

test('mirrors verified bytes, notes and a source-commit tag; publishes only after all uploads', async () => {
  const { state, run } = server();
  const result = await run();
  assert.equal(result.sourceSha, sha);
  assert.equal(state.target.draft, false);
  assert.equal(state.target.name, state.release.name);
  assert.equal(state.target.make_latest, 'true');
  assert.equal(state.ref.object.sha, sha);
  assert.match(state.target.body, new RegExp(`ezdemo/loopra/releases/download/${tag}/`));
  assert.match(state.target.body, /更新说明/);
  assert.equal(writes(state).at(-1).method, 'PATCH');
});

test('dry run validates real release identities without downloads or mutations', async () => {
  const { state, run } = server();
  const result = await run({ dryRun: true });
  assert.equal(result.dryRun, true);
  assert.deepEqual(writes(state), []);
  assert.ok(!state.calls.some(call => call.path.includes('/releases/assets/')));
});

test('rejects absent credentials, invalid tags, drafts, missing packages and inconsistent metadata', async () => {
  for (const [change, options, message] of [
    [() => {}, { sourceToken: '' }, /SOURCE_RELEASE_TOKEN/],
    [() => {}, { tag: '../main' }, /Invalid release tag/],
    [state => { state.release.draft = true; }, {}, /published release/],
    [state => { state.release.body = ''; }, {}, /metadata/],
    [state => { state.release.assets.pop(); }, {}, /assets do not match/],
    [state => { state.release.assets[0].digest = `sha256:${'0'.repeat(64)}`; }, {}, /assets do not match/],
  ]) {
    const { state, run } = server();
    change(state);
    await assert.rejects(run(options), message);
    assert.deepEqual(writes(state), []);
  }
});

test('refuses to move an existing tag or adopt an unrelated release', async () => {
  const { state, run } = server();
  state.ref = { object: { type: 'commit', sha: 'c'.repeat(40) } };
  await assert.rejects(run(), /another commit/);
  assert.deepEqual(writes(state), []);
  state.ref = null;
  state.target = { body: 'Existing hand-written release', assets: [] };
  await assert.rejects(run(), /not a mirror/);
  assert.deepEqual(writes(state), []);
});

test('accepts an annotated source tag without moving it', async () => {
  const { state, run } = server();
  state.ref = { object: { type: 'tag', sha: 'b'.repeat(40) } };
  await run();
  assert.ok(!writes(state).some(call => call.path.endsWith('/git/refs')));
});

test('corrupt downloads fail before creating a tag or draft', async () => {
  const { state, run } = server();
  state.corruptDownload = true;
  await assert.rejects(run(), /Checksum or size mismatch/);
  assert.deepEqual(writes(state), []);
});

test('failed upload leaves a draft; retry skips completed bytes and safely finishes', async () => {
  const { state, run } = server();
  state.failUpload = 'Loopra-linux-x64.deb';
  await assert.rejects(run(), /HTTP 502/);
  assert.equal(state.target.draft, true);
  assert.equal(state.target.assets.length, 1);
  assert.ok(!writes(state).some(call => call.method === 'PATCH'));
  state.failUpload = null;
  state.calls = [];
  await run();
  assert.equal(state.target.draft, false);
  assert.equal(writes(state).filter(call => call.path.endsWith('/releases/2/assets')).length, 3);
  assert.equal(state.calls.filter(call => call.method === 'GET' && call.path.includes('/releases/assets/')).length, 3);
  state.calls = [];
  await run();
  assert.equal(writes(state).filter(call => call.method === 'POST').length, 0);
  assert.ok(!state.calls.some(call => call.path.includes('/releases/assets/')), 'complete mirrors must not download gigabytes again');
});

test('bad uploaded digests prevent publication and draft retries repair only bad bytes', async () => {
  const { state, run } = server();
  state.corruptUpload = true;
  await assert.rejects(run(), /Uploaded asset verification/);
  assert.equal(state.target.draft, true);
  state.corruptUpload = false;
  await run();
  assert.equal(state.target.draft, false);
  assert.equal(writes(state).filter(call => call.method === 'DELETE').length, 1);
});

test('never overwrites an already published asset with conflicting bytes', async () => {
  const { state, run } = server();
  await run();
  state.target.assets[0].digest = `sha256:${'0'.repeat(64)}`;
  state.calls = [];
  await assert.rejects(run(), /Published target asset differs/);
  assert.deepEqual(writes(state), []);
});

test('backfills and prereleases do not replace latest stable', async () => {
  for (const prerelease of [false, true]) {
    const { state, run } = server();
    state.latest = 'v26.10.1902';
    state.release.prerelease = prerelease;
    await run();
    assert.equal(state.target.make_latest, 'false');
    assert.equal(state.target.prerelease, prerelease);
  }
});

test('permission failures are not treated as missing releases', async () => {
  await assert.rejects(syncRelease({ tag, sourceToken: 'token', request: async () => new Response('', { status: 403 }) }), /HTTP 403/);
});
