import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export async function checkRelease({ version, sourceSha }, token, request = fetch) {
  const headers = { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}` };
  const repo = 'https://api.github.com/repos/ezdemo/loopra-release';
  const response = await request(`${repo}/releases/tags/v${version}`, { headers });
  if (response.status !== 404) {
    if (!response.ok) throw new Error(`Could not check existing release: HTTP ${response.status}`);
    const release = await response.json();
    if (!release.draft) throw new Error(`v${version} is already published. Bump the source version first.`);
    const metadataAsset = release.assets.find(asset => asset.name === 'release-metadata.json');
    if (metadataAsset) {
      const previous = await request(metadataAsset.url, { headers: { ...headers, Accept: 'application/octet-stream' } });
      if (!previous.ok) throw new Error(`Could not read existing draft metadata: HTTP ${previous.status}`);
      if ((await previous.json()).sourceSha !== sourceSha) {
        throw new Error('This draft was built from another main commit. Bump the source version or delete the old draft first.');
      }
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await checkRelease(JSON.parse(readFileSync('release-metadata.json', 'utf8')), process.env.GH_TOKEN);
}
