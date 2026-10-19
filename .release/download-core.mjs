import { mkdirSync, writeFileSync, createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readReleaseMetadata } from './release-metadata.mjs';
import { hashFile } from './prepare-assets.mjs';

export async function downloadCore(artifactDir, { tag, token, request = fetch }) {
  if (!/^v\d+\.\d+\.\d+(?:\.\d+)?$/.test(tag || '')) throw new Error('Invalid release tag');
  const api = 'https://api.github.com/repos/ezdemo/loopra-release';
  const headers = { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}` };
  const releaseResponse = await request(`${api}/releases/tags/${tag}`, { headers, signal: AbortSignal.timeout(30000) });
  if (!releaseResponse.ok) throw new Error(`Cannot read published release: HTTP ${releaseResponse.status}`);
  const release = await releaseResponse.json();
  if (release.draft || release.tag_name !== tag) throw new Error('The requested release is not published');
  const metadata = await readReleaseMetadata(release, { token, request });
  if (!metadata || `v${metadata.version}` !== tag) throw new Error('Release metadata does not match the requested tag');
  const core = release.assets.find(asset => asset.name === 'loopra-dist.tar.gz');
  if (!core) throw new Error('Published release has no core bundle');
  let expected = metadata.artifacts?.['loopra-dist.tar.gz'];
  if (!expected) {
    const checksum = release.assets.find(asset => asset.name === 'SHA256SUMS');
    if (checksum) {
      const response = await request(`${api}/releases/assets/${checksum.id}`, {
        headers: { ...headers, Accept: 'application/octet-stream' }, signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) throw new Error(`Cannot read legacy checksums: HTTP ${response.status}`);
      expected = (await response.text()).match(/^([a-f0-9]{64})\s+\*?loopra-dist\.tar\.gz\s*$/m)?.[1];
    }
  }
  if (!/^[a-f0-9]{64}$/.test(expected || '')) throw new Error('Release has no valid core checksum');
  const response = await request(`${api}/releases/assets/${core.id}`, {
    headers: { ...headers, Accept: 'application/octet-stream' }, signal: AbortSignal.timeout(300000),
  });
  if (!response.ok || !response.body) throw new Error(`Cannot download core: HTTP ${response.status}`);
  mkdirSync(artifactDir, { recursive: true });
  const dest = resolve(artifactDir, 'loopra-dist.tar.gz');
  await pipeline(Readable.fromWeb(response.body), createWriteStream(dest, { flags: 'wx' }));
  if (hashFile(dest) !== expected) throw new Error('Downloaded core checksum mismatch');
  writeFileSync(resolve(artifactDir, 'release-metadata.json'), JSON.stringify(metadata, null, 2) + '\n');
  return metadata;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await downloadCore(resolve(process.argv[2] || 'release-artifacts'), { tag: process.env.RELEASE_TAG, token: process.env.GH_TOKEN });
}
