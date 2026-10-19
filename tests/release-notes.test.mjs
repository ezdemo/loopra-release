import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { collectCommits, findBaseline, formatMentions, generateNotes, renderChanges, summarize } from '../.release/generate-notes.mjs';
import { metadataComment } from '../.release/release-metadata.mjs';

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'loopra-notes-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git('init', '--initial-branch=main');
  git('config', 'user.name', 'Release Test');
  git('config', 'user.email', 'release-test@example.invalid');
  git('config', 'core.autocrlf', 'false');
  let index = 0;
  const commit = subject => {
    writeFileSync(join(dir, 'file.txt'), String(++index));
    git('add', 'file.txt');
    git('-c', 'core.hooksPath=/dev/null', 'commit', '--no-gpg-sign', '-m', subject);
    return git('rev-parse', 'HEAD');
  };
  const first = commit('feat: 初始功能');
  git('tag', 'v26.9.1');
  const second = commit('fix: 修复会话切换');
  git('tag', '-a', 'v26.9.2', '-m', 'previous source release');
  const current = commit('feat: 支持独立发版');
  const metadata = { version: '26.10.1', npmVersion: '26.10.1', sourceRepository: 'ezdemo/loopra', sourceSha: current, releaseRepository: 'ezdemo/loopra-release' };
  return { dir, git, commit, first, second, current, metadata };
}

test('uses the newest published stable release source SHA and ignores draft/prerelease/future versions', async t => {
  const f = fixture(t);
  const releases = [
    { tag_name: 'v26.10.1', draft: true, published_at: '2026-10-19' },
    { tag_name: 'v26.10.0', prerelease: true, published_at: '2026-10-18' },
    { tag_name: 'v99.0.0', published_at: '2026-10-17' },
    { tag_name: 'v26.9.2', published_at: '2026-10-16', assets: [{ id: 7, name: 'release-metadata.json' }] },
    { tag_name: 'v26.9.1', published_at: '2026-10-15', assets: [] },
  ];
  const request = async (url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer fake-github-token');
    if (url.includes('/releases?')) return Response.json(releases);
    assert.equal(url, 'https://api.github.com/repos/ezdemo/loopra-release/releases/assets/7');
    return Response.json({ ...f.metadata, sourceSha: f.second });
  };
  const baseline = await findBaseline(f.dir, f.metadata, { request, token: 'fake-github-token' });
  assert.deepEqual(baseline, { sha: f.second, tag: 'v26.9.2', kind: 'published-release' });
  const history = collectCommits(f.dir, f.metadata, baseline);
  assert.equal(history.count, 1);
  assert.deepEqual(history.commits, [{ sha: f.current, subject: 'feat: 支持独立发版' }]);
  f.commit('feat: 本次构建之后才到 main 的变化');
  assert.deepEqual(collectCommits(f.dir, f.metadata, baseline), history);
});

test('bootstraps from the previous reachable source tag; older releases without metadata use their source tag', async t => {
  const f = fixture(t);
  f.git('tag', 'v26.10.1');
  assert.deepEqual(await findBaseline(f.dir, f.metadata, { request: async () => Response.json([]) }), {
    sha: f.second, tag: 'v26.9.2', kind: 'source-tag',
  });
  assert.deepEqual(await findBaseline(f.dir, f.metadata, { request: async () => Response.json([
    { tag_name: 'v26.9.1', published_at: '2026-10-01', assets: [] },
  ]) }), { sha: f.first, tag: 'v26.9.1', kind: 'published-release' });
  f.git('tag', '-d', 'v26.9.1', 'v26.9.2', 'v26.10.1');
  const baseline = await findBaseline(f.dir, f.metadata, { request: async () => Response.json([]) });
  assert.equal(baseline.kind, 'initial-history');
  assert.equal(collectCommits(f.dir, f.metadata, baseline).count, 3);
});

test('rejects unreadable or incorrect previous-release metadata instead of silently inventing a range', async t => {
  const f = fixture(t);
  await assert.rejects(findBaseline(f.dir, f.metadata, { request: async () => new Response('', { status: 403 }) }), /HTTP 403/);
  const request = async url => url.includes('/releases?')
    ? Response.json([{ tag_name: 'v26.9.2', assets: [{ id: 1, name: 'release-metadata.json' }] }])
    : Response.json({ sourceRepository: 'wrong/source', sourceSha: f.second });
  await assert.rejects(findBaseline(f.dir, f.metadata, { request }), /Invalid release source metadata/);
  const badSha = async url => url.includes('/releases?')
    ? Response.json([{ tag_name: 'v26.9.2', assets: [{ id: 1, name: 'release-metadata.json' }] }])
    : Response.json({ ...f.metadata, sourceSha: 'a'.repeat(40) });
  await assert.rejects(findBaseline(f.dir, f.metadata, { request: badSha }), /not an ancestor/);
});

test('reads the previous source SHA from the release body without a metadata download asset', async t => {
  const f = fixture(t);
  const baseline = await findBaseline(f.dir, f.metadata, { request: async url => {
    assert.ok(url.includes('/releases?'));
    return Response.json([{ tag_name: 'v26.9.2', published_at: '2026-10-01', assets: [],
      body: metadataComment({ ...f.metadata, version: '26.9.2', npmVersion: '26.9.2', sourceSha: f.second }) }]);
  } });
  assert.equal(baseline.sha, f.second);
});

test('generates a Chinese AI summary using only source commit subjects', async () => {
  const result = await summarize([{ sha: 'a'.repeat(40), subject: 'feat: 支持独立发版' }], {
    apiKey: 'fake-deepseek-token', model: 'deepseek-v4-pro', request: async (url, options) => {
      assert.equal(url, 'https://amr-link.open-design.ai/v1/chat/completions');
      assert.equal(options.method, 'POST');
      assert.equal(options.headers.Authorization, 'Bearer fake-deepseek-token');
      const body = JSON.parse(options.body);
      assert.equal(body.model, 'deepseek-v4-pro');
      assert.equal('thinking' in body, false);
      assert.deepEqual(JSON.parse(body.messages[1].content), { commitMessages: ['feat: 支持独立发版'] });
      return Response.json({ choices: [{ finish_reason: 'stop', message: { content: '### 新增\n\n- 支持独立发版。' } }] });
    },
  });
  assert.equal(result.inputCount, 1);
  assert.match(result.text, /支持独立发版/);
});

test('missing key, HTTP errors, timeouts, empty and incomplete AI output fall back without exposing credentials', async () => {
  const warnings = [];
  const commits = [{ sha: 'a'.repeat(40), subject: 'fix: 修复安装' }];
  const warn = message => warnings.push(message);
  assert.equal(await summarize(commits, { warn }), null);
  const failures = [
    async () => new Response('secret provider details', { status: 401 }),
    async () => Response.json({ choices: [] }),
    async () => Response.json({ choices: [{ finish_reason: 'length', message: { content: 'partial answer' } }] }),
    async () => { throw new DOMException('fake-deepseek-token', 'TimeoutError'); },
    async () => { throw new Error('fake-deepseek-token'); },
  ];
  for (const request of failures) assert.equal(await summarize(commits, { apiKey: 'fake-deepseek-token', request, warn }), null);
  assert.ok(warnings.some(message => message.includes('HTTP 401')));
  assert.ok(warnings.some(message => message.includes('timeout')));
  assert.ok(warnings.every(message => !message.includes('fake-deepseek-token') && !message.includes('secret provider details')));
  assert.equal(await summarize([], { apiKey: 'fake-deepseek-token', request: () => assert.fail('No commits should not call the model') }), null);
});

test('allows a custom compatible gateway and model without duplicating trailing slashes', async () => {
  const result = await summarize([{ sha: 'a'.repeat(40), subject: 'fix: 安装问题' }], {
    apiKey: 'gateway-test-key', baseUrl: 'https://gateway.example/v1///', model: 'gateway-model',
    request: async (url, options) => {
      assert.equal(url, 'https://gateway.example/v1/chat/completions');
      assert.equal(options.headers.Authorization, 'Bearer gateway-test-key');
      const payload = JSON.parse(options.body);
      assert.equal(payload.model, 'gateway-model');
      assert.deepEqual(Object.keys(payload).sort(), ['max_tokens', 'messages', 'model', 'temperature']);
      return Response.json({ choices: [{ finish_reason: 'stop', message: { content: '### 修复\n\n- 修复安装问题。' } }] });
    },
  });
  assert.match(result.text, /修复安装问题/);
  assert.equal(await summarize([{ subject: 'fix: 安装问题' }], {
    apiKey: 'gateway-test-key', baseUrl: 'not a URL', warn() {},
    request: () => assert.fail('Invalid endpoint must not send a request'),
  }), null);
});

test('writes fallback release notes, comparison links and baseline metadata end to end', async t => {
  const f = fixture(t);
  writeFileSync(join(f.dir, 'release-metadata.json'), JSON.stringify(f.metadata));
  const notes = await generateNotes(f.dir, f.dir, { request: async () => Response.json([]), warn() {} });
  assert.match(notes, /feat: 支持独立发版/);
  assert.ok(!notes.includes('初始功能'));
  assert.match(notes, new RegExp(`${f.second}\.\.\.${f.current}`));
  assert.equal(readFileSync(join(f.dir, 'release-changes.md'), 'utf8'), notes);
  assert.deepEqual(JSON.parse(readFileSync(join(f.dir, 'release-metadata.json'), 'utf8')).releaseNotes, {
    baseSha: f.second, baseTag: 'v26.9.2', baseline: 'source-tag', commitCount: 1, generatedBy: 'commits',
  });
});

test('keeps original commits beside the AI summary and labels any omitted history', () => {
  const sha = 'a'.repeat(40);
  const text = renderChanges({ sourceSha: sha }, { sha: 'b'.repeat(40), tag: 'v1.0.0' }, {
    commits: [{ sha, subject: 'fix: <img src=x> [unsafe] _text_' }], count: 900,
  }, { text: '### 修复\n\n- 修复安装。', inputCount: 1 });
  assert.match(text, /<details>/);
  assert.match(text, /修复安装/);
  assert.match(text, /&lt;img src=x&gt;/);
  assert.match(text, /共 900 条提交/);
  assert.match(renderChanges({ sourceSha: sha }, { sha }, { commits: [], count: 0 }, null), /无新增提交/);
});

test('Java annotations cannot turn into GitHub release contributor mentions', () => {
  assert.equal(formatMentions('添加 @Mapping 和 @Controller 注解'), '添加 `@Mapping` 和 `@Controller` 注解');
  assert.equal(formatMentions('已有 `Java @Mapping` 代码'), '已有 `Java @Mapping` 代码');
  assert.equal(formatMentions('```java\n@Mapping\n```'), '```java\n@Mapping\n```');
  assert.equal(formatMentions('dev@example.com https://example.com/@Mapping'), 'dev@example.com https://example.com/@Mapping');
  const sha = 'a'.repeat(40);
  const notes = renderChanges({ sourceSha: sha }, { sha }, {
    commits: [{ sha, subject: 'fix: 添加 @Mapping 注解修复接口路由未注册的问题' }], count: 1,
  }, { text: '### 修复\n\n添加 @Mapping 注解。', inputCount: 1 });
  assert.equal(notes.match(/`@Mapping`/g).length, 2);
});
