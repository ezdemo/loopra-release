export const CURRENT_SOURCE = 'ezdemo/looprax';
const KNOWN_SOURCES = new Set(['ezdemo/loopra', CURRENT_SOURCE]);
const REPO = 'ezdemo/loopra-release';

export function validateMetadata(metadata) {
  if (!/^\d+\.\d+\.\d+(?:\.\d+)?$/.test(metadata.version || '') ||
      metadata.npmVersion !== metadata.version.split('.').slice(0, 3).join('.') ||
      !KNOWN_SOURCES.has(metadata.sourceRepository) || metadata.releaseRepository !== REPO ||
      !/^[a-f0-9]{40}$/.test(metadata.sourceSha || '')) {
    throw new Error('Invalid release source metadata');
  }
  return metadata;
}

export function metadataComment(metadata) {
  return `<!-- loopra-release-metadata\n${JSON.stringify(validateMetadata(metadata))}\n-->`;
}

export function parseMetadata(body = '') {
  const matches = [...body.matchAll(/<!-- loopra-release-metadata\s*\n([^\n]+)\s*\n-->/g)];
  if (matches.length > 1) throw new Error('Ambiguous release source metadata');
  return matches.length ? validateMetadata(JSON.parse(matches[0][1])) : null;
}

export async function readReleaseMetadata(release, { token, request = fetch } = {}) {
  const embedded = parseMetadata(release.body || '');
  if (embedded) return embedded;
  // Compatibility with releases produced before the download list was simplified.
  const asset = release.assets?.find(asset => asset.name === 'release-metadata.json');
  if (!asset) return null;
  const headers = { Accept: 'application/octet-stream' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await request(`https://api.github.com/repos/${REPO}/releases/assets/${asset.id}`, {
    headers, signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Cannot read release source metadata: HTTP ${response.status}`);
  return validateMetadata(await response.json());
}
