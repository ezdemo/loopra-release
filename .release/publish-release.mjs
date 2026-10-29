import { appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { downloadName, isLoopraxRelease } from './prepare-assets.mjs';
import { parseMetadata } from './release-metadata.mjs';

// Publishing is the last step: every uploaded LoopraX package must match the hash
// recorded when the build artifacts were prepared, before any release is public.
export async function publishRelease({ tag, releaseId, releaseSha, token, request = fetch }) {
  if (!/^v\d+\.\d+\.\d+(?:\.\d+)?$/.test(tag || '')) throw new Error('Invalid release tag');
  if (!/^[1-9]\d*$/.test(String(releaseId || '')) || !Number.isSafeInteger(Number(releaseId))) throw new Error('Invalid release ID');
  if (!/^[a-f0-9]{40}$/.test(releaseSha || '')) throw new Error('Invalid build workflow commit');
  if (!token) throw new Error('GH_TOKEN is required to publish the release');
  const api = 'https://api.github.com/repos/ezdemo/loopra-release';
  const headers = { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}` };
  // GitHub's by-tag endpoint only returns published releases, even when the
  // caller can read drafts. The upload action returns the exact draft ID.
  const response = await request(`${api}/releases/${releaseId}`, { headers, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Cannot read release draft: HTTP ${response.status}`);
  const release = await response.json();
  const metadata = parseMetadata(release.body || '');
  if (release.id !== Number(releaseId) || release.tag_name !== tag || !metadata || `v${metadata.version}` !== tag || metadata.releaseSha !== releaseSha) {
    throw new Error('Release metadata does not match this build');
  }
  if (release.prerelease) throw new Error('Expected a stable release');
  const hashes = metadata.artifacts || {};
  const names = Object.keys(hashes);
  if (!isLoopraxRelease(names) || names.some(name => downloadName(name) !== name || !/^[a-f0-9]{64}$/.test(hashes[name]))) {
    throw new Error('Build metadata must contain every LoopraX package checksum');
  }
  if (release.assets.length !== names.length || new Set(release.assets.map(asset => asset.name)).size !== names.length ||
      release.assets.some(asset => !names.includes(asset.name) || asset.state !== 'uploaded' ||
        !Number.isSafeInteger(asset.size) || asset.size <= 0 || asset.digest !== `sha256:${hashes[asset.name]}`)) {
    throw new Error('Uploaded packages are incomplete or their checksums differ; leaving the draft unpublished');
  }
  if (!release.draft) return release;
  const published = await request(`${api}/releases/${release.id}`, {
    method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ draft: false, prerelease: false, make_latest: 'true' }), signal: AbortSignal.timeout(30000),
  });
  if (!published.ok) throw new Error(`Cannot publish release: HTTP ${published.status}`);
  const result = await published.json();
  if (result.draft || result.tag_name !== tag) throw new Error('GitHub did not confirm the release was published');
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const release = await publishRelease({ tag: process.env.RELEASE_TAG, releaseId: process.env.RELEASE_ID,
    releaseSha: process.env.GITHUB_SHA, token: process.env.GH_TOKEN });
  console.log(`Published ${release.tag_name}: ${release.html_url}`);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    `Published [${release.tag_name}](${release.html_url}) automatically after verifying every LoopraX package.\n`);
}
