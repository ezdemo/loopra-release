import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync, openSync, readSync, closeSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { metadataComment, validateMetadata } from './release-metadata.mjs';

// Names produced by scripts/package.sh. Darwin desktop ships the zip,
// which keeps the executable bit; the .app directory is not a release asset.
export const LOOPRAX_ASSETS = [
  'loopra-windows-amd64.exe',
  'loopra-windows-arm64.exe',
  'loopra-windows-386.exe',
  'loopra-darwin-amd64',
  'loopra-darwin-arm64',
  'loopra-linux-amd64',
  'loopra-linux-arm64',
  'loopra-linux-armv7',
  'loopra-linux-s390x',
  'loopra-desktop-windows-amd64.exe',
  'loopra-desktop-windows-arm64.exe',
  'loopra-desktop-darwin-amd64.zip',
  'loopra-desktop-darwin-arm64.zip',
  'loopra-desktop-linux-amd64',
  'loopra-desktop-linux-arm64',
];

export function isLoopraxRelease(names) {
  const set = new Set(names);
  return set.size === LOOPRAX_ASSETS.length && LOOPRAX_ASSETS.every(name => set.has(name));
}

export function isHistoricalLoopraRelease(names) {
  const set = new Set(names);
  return set.size === 4 && set.has('loopra-dist.tar.gz') &&
    ['macos', 'windows', 'linux'].every(platform => [...set].some(name => name.startsWith(`Loopra-${platform}-`)));
}

export function downloadName(name) {
  if (LOOPRAX_ASSETS.includes(name)) return name;
  // Historical Loopra installers. Checked after the LoopraX list because those
  // file names also start with "loopra".
  if (name === 'loopra-dist.tar.gz') return name;
  const arch = /(?:arm64|aarch64)/i.test(name) ? 'arm64' : 'x64';
  if (/^loopra.*\.zip$/i.test(name)) return `Loopra-macos-${/(?:x64|amd64|x86_64)/i.test(name) ? 'x64' : 'arm64'}.zip`;
  if (/^loopra.*\.exe$/i.test(name)) return `Loopra-windows-${arch}.exe`;
  if (/^loopra.*\.deb$/i.test(name)) return `Loopra-linux-${arch}.deb`;
  if (/^loopra.*\.AppImage$/i.test(name)) return `Loopra-linux-${arch}.AppImage`;
  return null;
}

export function releaseAssetName(name) {
  if (/^latest(?:-mac|-unsigned-mac|-linux)?\.yml$/.test(name) || /^Loopra-(?:windows-(?:x64|arm64)\.exe|macos-(?:x64|arm64)\.zip)\.blockmap$/.test(name)) return name;
  return downloadName(name);
}

// Accept legacy releases and complete platform update groups, never partial feeds.
export function validReleaseAssets(names) {
  if (new Set(names).size !== names.length || names.some(name => releaseAssetName(name) !== name)) return false;
  const packages = names.filter(name => downloadName(name) === name);
  const one = pattern => packages.filter(name => pattern.test(name)).length === 1;
  if (!packages.includes('loopra-dist.tar.gz') || !one(/^Loopra-windows-.*\.exe$/) ||
      !one(/^Loopra-macos-.*\.zip$/) || !one(/^Loopra-linux-.*\.deb$/)) return false;
  const windows = packages.find(name => name.startsWith('Loopra-windows-'));
  const mac = packages.find(name => name.startsWith('Loopra-macos-'));
  const image = packages.filter(name => name.endsWith('.AppImage'));
  if (image.length > 1 || packages.length !== 4 + image.length) return false;
  if (names.length === 4) return true;
  const expected = new Set([...packages, 'latest.yml', `${windows}.blockmap`]);
  if (image.length || names.includes('latest-linux.yml')) {
    if (image.length !== 1) return false;
    expected.add('latest-linux.yml');
  }
  if (names.includes('latest-mac.yml') || names.includes(`${mac}.blockmap`)) {
    expected.add('latest-mac.yml'); expected.add(`${mac}.blockmap`);
  }
  if (names.includes('latest-unsigned-mac.yml')) expected.add('latest-unsigned-mac.yml');
  return expected.size === names.length && names.every(name => expected.has(name));
}

export function hashFile(path, algorithm = 'sha256', encoding = 'hex') {
  const hash = createHash(algorithm);
  const buffer = Buffer.allocUnsafe(4 * 1024 * 1024);
  const file = openSync(path, 'r');
  try {
    let size;
    while ((size = readSync(file, buffer)) > 0) hash.update(buffer.subarray(0, size));
  } finally { closeSync(file); }
  return hash.digest(encoding);
}

export function prepareAssets(artifactDir, publishDir = resolve(artifactDir, 'publish')) {
  const metadata = validateMetadata(JSON.parse(readFileSync(resolve(artifactDir, 'release-metadata.json'), 'utf8')));
  const packages = readdirSync(artifactDir).filter(name => LOOPRAX_ASSETS.includes(name));
  if (!isLoopraxRelease(packages)) throw new Error('Every LoopraX package is required');
  mkdirSync(publishDir, { recursive: true });
  if (readdirSync(publishDir).length) throw new Error('Publish directory must be empty');
  metadata.artifacts = {};
  for (const name of LOOPRAX_ASSETS) {
    const dest = resolve(publishDir, name);
    copyFileSync(resolve(artifactDir, name), dest);
    metadata.artifacts[name] = hashFile(dest);
  }
  const link = name => `- [${name}](https://github.com/ezdemo/loopra-release/releases/download/v${metadata.version}/${name})`;
  const service = LOOPRAX_ASSETS.filter(name => !name.includes('-desktop-')).map(link).join('\n');
  const desktop = LOOPRAX_ASSETS.filter(name => name.includes('-desktop-')).map(link).join('\n');
  return `## LoopraX v${metadata.version}

${readFileSync(resolve(artifactDir, 'release-changes.md'), 'utf8').trim()}

### 下载

#### 服务

${service}

#### 桌面

${desktop}

[构建源码](https://github.com/${metadata.sourceRepository}/commit/${metadata.sourceSha})

macOS 首次打开如被系统拦截，请右键 → 打开。

${metadataComment(metadata)}
`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  writeFileSync('release-notes.md', prepareAssets(resolve(process.argv[2] || 'release-artifacts'), resolve(process.argv[3] || 'release-assets')));
}
