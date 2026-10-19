import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync, openSync, readSync, closeSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { metadataComment, validateMetadata } from './release-metadata.mjs';

export function downloadName(name) {
  if (name === 'loopra-dist.tar.gz') return name;
  const arch = /(?:arm64|aarch64)/i.test(name) ? 'arm64' : 'x64';
  if (/^loopra.*\.zip$/i.test(name)) return `Loopra-macos-${/(?:x64|amd64|x86_64)/i.test(name) ? 'x64' : 'arm64'}.zip`;
  if (/^loopra.*\.exe$/i.test(name)) return `Loopra-windows-${arch}.exe`;
  if (/^loopra.*\.deb$/i.test(name)) return `Loopra-linux-${arch}.deb`;
  return null;
}

export function hashFile(path) {
  const hash = createHash('sha256');
  const buffer = Buffer.allocUnsafe(4 * 1024 * 1024);
  const file = openSync(path, 'r');
  try {
    let size;
    while ((size = readSync(file, buffer)) > 0) hash.update(buffer.subarray(0, size));
  } finally { closeSync(file); }
  return hash.digest('hex');
}

export function prepareAssets(artifactDir, publishDir = resolve(artifactDir, 'publish')) {
  const metadata = validateMetadata(JSON.parse(readFileSync(resolve(artifactDir, 'release-metadata.json'), 'utf8')));
  const packages = readdirSync(artifactDir).map(name => ({ name, download: downloadName(name) })).filter(file => file.download);
  if (!packages.some(file => file.download === 'loopra-dist.tar.gz') ||
      !['macos', 'windows', 'linux'].every(platform => packages.some(file => file.download.startsWith(`Loopra-${platform}-`)))) {
    throw new Error('Core and all three desktop packages are required');
  }
  if (new Set(packages.map(file => file.download)).size !== packages.length) throw new Error('Duplicate platform packages');
  mkdirSync(publishDir, { recursive: true });
  if (readdirSync(publishDir).length) throw new Error('Publish directory must be empty');
  metadata.artifacts = {};
  for (const file of packages) {
    const dest = resolve(publishDir, file.download);
    copyFileSync(resolve(artifactDir, file.name), dest);
    metadata.artifacts[file.download] = hashFile(dest);
  }
  const links = packages.map(file => `- [${file.download}](https://github.com/ezdemo/loopra-release/releases/download/v${metadata.version}/${file.download})`).join('\n');
  return `## Loopra v${metadata.version}

${readFileSync(resolve(artifactDir, 'release-changes.md'), 'utf8').trim()}

### 下载

${links}

[构建源码](https://github.com/ezdemo/loopra/commit/${metadata.sourceSha})

macOS 首次打开如被系统拦截，请右键 → 打开。

${metadataComment(metadata)}
`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  writeFileSync('release-notes.md', prepareAssets(resolve(process.argv[2] || 'release-artifacts'), resolve(process.argv[3] || 'release-assets')));
}
