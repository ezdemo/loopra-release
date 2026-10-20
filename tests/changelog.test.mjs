import assert from 'node:assert/strict';
import { test } from 'node:test';
import { releaseEntry, renderChangelog, updateChangelog } from '../.release/update-changelog.mjs';

const release = (tag, body = '### 新增\n\n- 新功能。') => ({
  tag_name: tag, body, draft: false, prerelease: false, published_at: '2026-10-19T16:05:00Z',
});
const encodeFile = (content, sha = 'a'.repeat(40)) => ({
  type: 'file', sha, encoding: 'base64', content: Buffer.from(content).toString('base64'),
});

test('creates a readable archive with Shanghai dates and excludes draft/prerelease versions and packaging details', () => {
  const notes = `## Loopra v26.10.2001

### 新增
- 新功能。

<details>
<summary>原始源码提交记录（1 条）</summary>

- raw commit
</details>

[查看完整源码变更](https://github.com/ezdemo/loopra/compare/a...b)

### 下载
- installer.exe

<!-- loopra-release-metadata
{"sourceSha":"hidden-metadata"}
-->`;
  const { content, versions } = renderChangelog('', [release('v26.10.2001', notes),
    { ...release('v26.10.2002'), draft: true }, { ...release('v26.10.2003'), prerelease: true }]);
  assert.equal(versions, 1);
  assert.match(content, /^# 更新日志/);
  assert.match(content, /\[26\.10\.2001\]/);
  assert.match(content, /2026-10-20（上海时间）/);
  assert.match(content, /新功能/);
  assert.match(content, /查看完整源码变更/);
  assert.doesNotMatch(content, /raw commit|installer.exe|hidden-metadata|2002|2003/);
});

test('retries replace the same version, preserve other versions and manual text, and sort numerically', () => {
  const first = renderChangelog('# 自定义说明\n\n保留这段。\n', [release('v26.9.91'), release('v26.10.1906')]);
  const withFooter = first.content + '\n人工维护的尾注。\n';
  const updated = renderChangelog(withFooter, [release('v26.10.2001'), release('v26.10.1906', '### 修复\n\n- 修订后的说明。')]);
  assert.equal(updated.versions, 3);
  assert.match(updated.content, /保留这段/);
  assert.match(updated.content, /人工维护的尾注/);
  assert.match(updated.content, /修订后的说明/);
  assert.ok(updated.content.indexOf('## [26.10.2001]') < updated.content.indexOf('## [26.10.1906]'));
  assert.ok(updated.content.indexOf('## [26.10.1906]') < updated.content.indexOf('## [26.9.91]'));
  assert.equal((updated.content.match(/## \[26\.10\.1906\]/g) || []).length, 1);
  assert.equal(renderChangelog(updated.content, [release('v26.10.2001')]).content, updated.content);
});

test('rejects broken managed areas instead of losing unrecognized content', () => {
  assert.throws(() => renderChangelog('<!-- loopra-changelog:start -->', []), /incomplete/);
  assert.throws(() => renderChangelog('<!-- loopra-changelog:start -->\nmanual text\n<!-- loopra-changelog:end -->', []), /Unrecognized content/);
  assert.equal(releaseEntry({ ...release('v26.10.2001'), draft: true }), null);
});

test('creates CHANGELOG.md when absent and avoids another commit when the contents are unchanged', async () => {
  let saved;
  let writes = 0;
  const request = async (url, options) => {
    if (url.includes('/releases?')) return Response.json([release('v26.10.2001')]);
    if (options.method === 'PUT') {
      writes++;
      const body = JSON.parse(options.body);
      assert.equal(body.branch, 'main');
      assert.equal('sha' in body, false);
      saved = Buffer.from(body.content, 'base64').toString('utf8');
      return Response.json({}, { status: 201 });
    }
    return saved ? Response.json(encodeFile(saved)) : new Response('', { status: 404 });
  };
  assert.equal((await updateChangelog({ token: 'test-token', request })).changed, true);
  assert.equal((await updateChangelog({ token: 'test-token', request })).changed, false);
  assert.equal(writes, 1);
});

test('concurrent edits are fetched again and retained while retrying with the new file SHA', async () => {
  let reads = 0;
  let writes = 0;
  const concurrent = renderChangelog('# 并发人工补充\n', [release('v26.10.2002')]).content;
  const request = async (url, options) => {
    if (url.includes('/releases?')) return Response.json([release('v26.10.2001')]);
    if (options.method === 'PUT') {
      writes++;
      if (writes === 1) return new Response('', { status: 409 });
      const payload = JSON.parse(options.body);
      assert.equal(payload.sha, 'b'.repeat(40));
      const text = Buffer.from(payload.content, 'base64').toString('utf8');
      assert.match(text, /并发人工补充/);
      assert.match(text, /26\.10\.2002/);
      assert.match(text, /26\.10\.2001/);
      return Response.json({});
    }
    reads++;
    return reads === 1 ? new Response('', { status: 404 }) : Response.json(encodeFile(concurrent, 'b'.repeat(40)));
  };
  assert.equal((await updateChangelog({ token: 'test-token', request })).versions, 2);
  assert.equal(writes, 2);
});

test('reads all release pages and supports large changelog files through the blob API', async () => {
  const archived = renderChangelog('', [release('v26.10.2001')]).content;
  let secondPage = false;
  const request = async url => {
    if (url.includes('/releases?')) {
      if (url.endsWith('page=1')) return Response.json(Array.from({ length: 100 }, () => ({ ...release('v26.10.2002'), draft: true })));
      secondPage = true;
      return Response.json([release('v26.10.2001')]);
    }
    if (url.includes('/contents/')) return Response.json({ type: 'file', sha: 'a'.repeat(40), encoding: 'none' });
    assert.ok(url.endsWith(`/git/blobs/${'a'.repeat(40)}`));
    return Response.json(encodeFile(archived));
  };
  assert.equal((await updateChangelog({ token: 'test-token', request })).changed, false);
  assert.equal(secondPage, true);
});

test('dry run does not write; API failures do not erase existing history', async () => {
  const preview = await updateChangelog({ token: 'test-token', dryRun: true, request: async (url, options) => {
    assert.notEqual(options.method, 'PUT');
    return url.includes('/releases?') ? Response.json([release('v26.10.2001')]) : new Response('', { status: 404 });
  } });
  assert.match(preview.content, /26\.10\.2001/);
  await assert.rejects(updateChangelog({ token: 'test-token', request: async () => new Response('', { status: 403 }) }), /HTTP 403/);
});
