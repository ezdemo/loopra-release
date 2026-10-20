import { appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const API = 'https://api.github.com/repos/ezdemo/loopra-release';
const URL = 'https://github.com/ezdemo/loopra-release/blob/main/CHANGELOG.md';
const START = '<!-- loopra-changelog:start -->';
const END = '<!-- loopra-changelog:end -->';
const TAG = /^v\d+\.\d+\.\d+(?:\.\d+)?$/;

function compareTags(left, right) {
  const a = left.slice(1).split('.').map(Number);
  const b = right.slice(1).split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] || 0) !== (b[i] || 0)) return (b[i] || 0) - (a[i] || 0);
  }
  return 0;
}

export function releaseEntry(release) {
  const tag = release.tag_name;
  if (!TAG.test(tag || '') || release.draft || release.prerelease || !release.published_at) return null;
  const date = new Date(release.published_at);
  if (!Number.isFinite(date.getTime())) throw new Error(`Invalid publication date for ${tag}`);
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).map(part => [part.type, part.value]));
  let notes = (release.body || '').replaceAll('\r\n', '\n')
    .replace(/<!-- loopra-release-metadata\s*\n[^\n]+\s*\n-->/g, '')
    .replace(/^\s*##?\s+Loopra\s+v?[\d.]+[^\n]*\n?/, '')
    .replace(/<details>\s*<summary>原始源码提交记录[^<]*<\/summary>[\s\S]*?<\/details>/g, '');
  // Download links and packaging notes belong on the Release page. Keep this
  // file focused on the changes, including the original source comparison link.
  notes = notes.split(/^### 下载(?:与安装)?\s*$/m)[0].replace(/\n{3,}/g, '\n\n').trim();
  notes = notes.replace(/<!-- loopra-(?:changelog|release):[^\n]*-->/g, marker => marker.replace('<', '&lt;'));
  const heading = `## [${tag.slice(1)}](https://github.com/ezdemo/loopra-release/releases/tag/${tag})`;
  return `${heading}\n\n发布日期：${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}（UTC+8）\n\n${notes || '本版本暂无更新说明。'}`;
}

export function renderChangelog(existing, releases) {
  const text = existing.replaceAll('\r\n', '\n');
  const start = text.indexOf(START);
  const end = text.indexOf(END);
  if ((start < 0) !== (end < 0) || (start >= 0 && end < start) ||
      (start >= 0 && (text.indexOf(START, start + START.length) >= 0 || text.indexOf(END, end + END.length) >= 0))) {
    throw new Error('CHANGELOG.md contains incomplete or duplicate archive markers');
  }
  const entries = new Map();
  if (start >= 0) {
    const managed = text.slice(start + START.length, end);
    const pattern = /<!-- loopra-release:(v\d+\.\d+\.\d+(?:\.\d+)?):start -->\n([\s\S]*?)\n<!-- loopra-release:\1:end -->/g;
    for (const match of managed.matchAll(pattern)) {
      if (entries.has(match[1])) throw new Error(`Duplicate changelog entry: ${match[1]}`);
      entries.set(match[1], match[2]);
    }
    if (managed.replace(pattern, '').replace(/\s|---/g, '')) {
      throw new Error('Unrecognized content inside the generated changelog area');
    }
  }
  for (const release of releases) {
    const entry = releaseEntry(release);
    if (entry) entries.set(release.tag_name, entry);
  }
  const blocks = [...entries.keys()].sort(compareTags).map(tag =>
    `<!-- loopra-release:${tag}:start -->\n${entries.get(tag)}\n<!-- loopra-release:${tag}:end -->`);
  const managed = `${START}\n\n${blocks.join('\n\n---\n\n')}\n\n${END}`;
  const prefix = start >= 0 ? text.slice(0, start) : (text.trimEnd() || '# 更新日志\n\n这里归档 Loopra 正式发布版本的更新说明。');
  const suffix = end >= 0 ? text.slice(end + END.length) : '\n';
  return { content: `${prefix.trimEnd()}\n\n${managed}${suffix}`, versions: entries.size };
}

export async function updateChangelog({ token, request = fetch, dryRun = false }) {
  if (!token) throw new Error('GH_TOKEN with Contents: write is required to update CHANGELOG.md');
  const headers = { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}` };
  const get = path => request(`${API}${path}`, { headers, signal: AbortSignal.timeout(30000) });
  for (let attempt = 0; attempt < 3; attempt++) {
    const releases = [];
    for (let page = 1; ; page++) {
      const response = await get(`/releases?per_page=100&page=${page}`);
      if (!response.ok) throw new Error(`Cannot read published releases: HTTP ${response.status}`);
      const batch = await response.json();
      releases.push(...batch);
      if (batch.length < 100) break;
    }
    const response = await get('/contents/CHANGELOG.md?ref=main');
    let file = null;
    let existing = '';
    if (response.ok) {
      file = await response.json();
      if (file.type !== 'file' || !/^[a-f0-9]{40}$/.test(file.sha || '')) throw new Error('CHANGELOG.md is not a regular repository file');
      if (file.encoding !== 'base64') {
        const blob = await get(`/git/blobs/${file.sha}`);
        if (!blob.ok) throw new Error(`Cannot read changelog contents: HTTP ${blob.status}`);
        file = { ...file, ...await blob.json() };
      }
      if (file.encoding !== 'base64') throw new Error('Unsupported changelog content encoding');
      existing = Buffer.from(file.content, 'base64').toString('utf8');
    } else if (response.status !== 404) throw new Error(`Cannot read CHANGELOG.md: HTTP ${response.status}`);
    const { content, versions } = renderChangelog(existing, releases);
    if (content === existing || dryRun) return { changed: content !== existing, content, versions, url: URL };
    const updated = await request(`${API}/contents/CHANGELOG.md`, {
      method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(30000),
      body: JSON.stringify({ message: 'docs: 更新正式版本变更记录', branch: 'main',
        content: Buffer.from(content).toString('base64'), ...(file ? { sha: file.sha } : {}) }),
    });
    if (updated.ok) return { changed: true, versions, url: URL };
    if (![409, 422].includes(updated.status)) throw new Error(`Cannot update CHANGELOG.md: HTTP ${updated.status}`);
  }
  throw new Error('CHANGELOG.md kept changing concurrently; retry the changelog workflow.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await updateChangelog({ token: process.env.GH_TOKEN });
  console.log(`${result.changed ? 'Updated' : 'Unchanged'} CHANGELOG.md (${result.versions} versions)`);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    `${result.changed ? 'Updated' : 'Unchanged'} [CHANGELOG.md](${result.url}), ${result.versions} archived releases.\n`);
}
