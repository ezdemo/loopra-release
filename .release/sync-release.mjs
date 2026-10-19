import { appendFileSync, createReadStream, createWriteStream, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { finished, pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { downloadName, hashFile } from './prepare-assets.mjs';
import { parseMetadata, readReleaseMetadata } from './release-metadata.mjs';

const SOURCE = 'ezdemo/loopra';
const RELEASE = 'ezdemo/loopra-release';
const api = repo => `https://api.github.com/repos/${repo}`;

// A release tag in the tooling repository and its source tag have different SHAs.
// Always resolve the latter from the embedded build metadata, never from main.
export async function syncRelease({ tag, sourceToken, releaseToken, dryRun = false, request = fetch }) {
  if (!/^v\d+\.\d+\.\d+(?:\.\d+)?$/.test(tag || '')) throw new Error('Invalid release tag');
  if (!dryRun && !sourceToken) throw new Error('SOURCE_RELEASE_TOKEN is required (Contents: write on ezdemo/loopra)');
  const headers = (repo, extra = {}) => {
    const token = repo === SOURCE ? sourceToken : releaseToken;
    return { Accept: 'application/vnd.github+json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra };
  };
  async function json(repo, path, { method = 'GET', body, optional = false } = {}) {
    const response = await request(`${api(repo)}${path}`, {
      method, headers: headers(repo, body ? { 'Content-Type': 'application/json' } : {}),
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000),
    });
    if (optional && response.status === 404) return null;
    if (!response.ok) throw new Error(`${method} ${repo}${path}: HTTP ${response.status}`);
    return response.status === 204 ? null : response.json();
  }
  const release = await json(RELEASE, `/releases/tags/${tag}`);
  if (release.draft || release.tag_name !== tag) throw new Error('Only a published release can be synchronized');
  const metadata = await readReleaseMetadata(release, { token: releaseToken, request });
  if (!metadata || `v${metadata.version}` !== tag) throw new Error('Release metadata does not match the requested tag');
  const expected = metadata.artifacts || {};
  const names = Object.keys(expected);
  if (!names.includes('loopra-dist.tar.gz') || !['macos', 'windows', 'linux'].every(platform =>
    names.some(name => name.startsWith(`Loopra-${platform}-`)))) throw new Error('Metadata must include core and all desktop packages');
  if (names.some(name => downloadName(name) !== name || !/^[a-f0-9]{64}$/.test(expected[name]))) {
    throw new Error('Invalid package name or checksum in release metadata');
  }
  if (release.assets.length !== names.length || new Set(release.assets.map(asset => asset.name)).size !== names.length ||
      release.assets.some(asset => !names.includes(asset.name) || asset.state !== 'uploaded' ||
        !Number.isSafeInteger(asset.size) || asset.size <= 0 ||
        (asset.digest && asset.digest !== `sha256:${expected[asset.name]}`))) {
    throw new Error('Published assets do not match the release metadata');
  }

  const sourceCommit = await json(SOURCE, `/commits/${metadata.sourceSha}`);
  if (sourceCommit.sha !== metadata.sourceSha) throw new Error('Build source commit is unavailable');
  let ref = await json(SOURCE, `/git/ref/tags/${tag}`, { optional: true });
  if (ref) {
    let object = ref.object;
    for (let depth = 0; object.type === 'tag' && depth < 10; depth++) {
      object = (await json(SOURCE, `/git/tags/${object.sha}`)).object;
    }
    if (object.type !== 'commit' || object.sha !== metadata.sourceSha) throw new Error('Existing source tag points to another commit; refusing to move it');
  }
  let target = await json(SOURCE, `/releases/tags/${tag}`, { optional: true });
  if (target) {
    const previous = parseMetadata(target.body || '');
    if (!previous || previous.sourceSha !== metadata.sourceSha || previous.version !== metadata.version) {
      throw new Error('Existing target release is not a mirror of this build');
    }
    if (target.assets.some(asset => !names.includes(asset.name)) ||
        new Set(target.assets.map(asset => asset.name)).size !== target.assets.length) {
      throw new Error('Existing target release contains unexpected assets');
    }
  }
  const sameAsset = (existing, asset) => existing?.state === 'uploaded' && existing.size === asset.size &&
    existing.digest === `sha256:${expected[asset.name]}`;
  const pending = release.assets.filter(asset => {
    const existing = target?.assets.find(item => item.name === asset.name);
    if (sameAsset(existing, asset)) return false;
    if (existing && !target.draft) throw new Error(`Published target asset differs: ${asset.name}`);
    return true;
  });
  // Replacing only download links keeps the source mirror self-contained; build
  // provenance and all other release notes stay identical to the original.
  const body = (release.body || '').replaceAll(
    `https://github.com/${RELEASE}/releases/download/${tag}/`,
    `https://github.com/${SOURCE}/releases/download/${tag}/`);
  const plan = { tag, sourceSha: metadata.sourceSha, packages: names, dryRun,
    url: `https://github.com/${SOURCE}/releases/tag/${tag}` };
  if (dryRun) return plan;

  const directory = mkdtempSync(join(tmpdir(), 'loopra-sync-'));
  try {
    // Validate all local bytes before creating a public-facing source tag/draft.
    for (const asset of pending) {
      const response = await request(`${api(RELEASE)}/releases/assets/${asset.id}`, {
        headers: headers(RELEASE, { Accept: 'application/octet-stream' }), signal: AbortSignal.timeout(600000),
      });
      if (!response.ok || !response.body) throw new Error(`Cannot download ${asset.name}: HTTP ${response.status}`);
      const path = join(directory, asset.name);
      await pipeline(Readable.fromWeb(response.body), createWriteStream(path, { flags: 'wx' }));
      if (statSync(path).size !== asset.size || hashFile(path) !== expected[asset.name]) throw new Error(`Checksum or size mismatch: ${asset.name}`);
    }
    if (!ref) await json(SOURCE, '/git/refs', { method: 'POST', body: { ref: `refs/tags/${tag}`, sha: metadata.sourceSha } });
    if (!target) target = await json(SOURCE, '/releases', { method: 'POST', body: {
      tag_name: tag, target_commitish: metadata.sourceSha, name: release.name || tag, body,
      draft: true, prerelease: release.prerelease,
    } });

    for (const asset of pending) {
      const existing = target.assets.find(item => item.name === asset.name);
      if (existing) {
        // Never overwrite published bytes. A failed draft upload can be retried.
        if (!target.draft) throw new Error(`Published target asset differs: ${asset.name}`);
        await json(SOURCE, `/releases/assets/${existing.id}`, { method: 'DELETE' });
      }
      const upload = new URL(target.upload_url.replace(/\{.*$/, ''));
      if (upload.origin !== 'https://uploads.github.com' || upload.pathname !== `/repos/${SOURCE}/releases/${target.id}/assets`) {
        throw new Error('Unexpected asset upload URL');
      }
      upload.searchParams.set('name', asset.name);
      if (asset.label) upload.searchParams.set('label', asset.label);
      const stream = createReadStream(join(directory, asset.name));
      const closed = finished(stream).catch(() => {});
      let response;
      try {
        response = await request(upload.href, { method: 'POST',
          headers: headers(SOURCE, { 'Content-Type': asset.content_type || 'application/octet-stream', 'Content-Length': String(asset.size) }),
          body: stream, duplex: 'half', signal: AbortSignal.timeout(600000),
        });
      } finally { stream.destroy(); await closed; }
      if (!response.ok) throw new Error(`Cannot upload ${asset.name}: HTTP ${response.status}`);
      const uploaded = await response.json();
      if (uploaded.name !== asset.name || uploaded.state !== 'uploaded' || uploaded.size !== asset.size ||
          uploaded.digest !== `sha256:${expected[asset.name]}`) throw new Error(`Uploaded asset verification failed: ${asset.name}`);
    }
    // Old backfills must not replace the current latest release.
    const latest = await json(RELEASE, '/releases/latest', { optional: true });
    await json(SOURCE, `/releases/${target.id}`, { method: 'PATCH', body: {
      name: release.name || tag, body, draft: false, prerelease: release.prerelease,
      make_latest: !release.prerelease && latest?.tag_name === tag ? 'true' : 'false',
    } });
    return plan;
  } finally { rmSync(directory, { recursive: true, force: true }); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await syncRelease({ tag: process.env.RELEASE_TAG, sourceToken: process.env.SOURCE_RELEASE_TOKEN,
    releaseToken: process.env.GH_TOKEN, dryRun: process.argv.includes('--dry-run') });
  console.log(JSON.stringify(result, null, 2));
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    `Release ${result.dryRun ? 'sync preview' : 'synchronized'}: [${result.tag}](${result.url}), source commit \`${result.sourceSha}\`.\n`);
}
