import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync, openSync, readSync, closeSync, statSync } from 'node:fs';
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

export function releaseAssetName(name) {
  if (name === 'latest.yml' || /^Loopra-windows-(?:x64|arm64)\.exe\.blockmap$/.test(name)) return name;
  return downloadName(name);
}

// Retain support for mirroring older, four-package releases.
export function validReleaseAssets(names) {
  const packages = names.filter(name => downloadName(name) === name);
  if (packages.length !== 4 || !packages.includes('loopra-dist.tar.gz') ||
      !['macos', 'windows', 'linux'].every(platform => packages.some(name => name.startsWith(`Loopra-${platform}-`)))) return false;
  const windows = packages.find(name => name.startsWith('Loopra-windows-'));
  return names.length === 4 || (names.length === 6 && names.includes('latest.yml') && names.includes(`${windows}.blockmap`));
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

// Validate electron-builder's generated stable Windows manifest before publishing.
// Read only the required scalar fields; never execute/expand YAML tags or aliases.
export function validateWindowsUpdate(dir, version, windowsName, installerName = windowsName) {
  const manifest = readFileSync(resolve(dir, 'latest.yml'), 'utf8');
  const scalar = (pattern) => {
    const matches = [...manifest.matchAll(pattern)];
    if (matches.length !== 1) throw new Error('Invalid Windows update manifest');
    return matches[0][1].trim().replace(/^(['"])(.*)\1$/, '$2');
  };
  const manifestVersion = scalar(/^version:\s*([^\r\n]+)$/gm);
  const path = scalar(/^path:\s*([^\r\n]+)$/gm);
  const url = scalar(/^\s+- url:\s*([^\r\n]+)$/gm);
  const sha512 = scalar(/^sha512:\s*([^\r\n]+)$/gm);
  const fileHash = scalar(/^\s+sha512:\s*([^\r\n]+)$/gm);
  const size = scalar(/^\s+size:\s*([^\r\n]+)$/gm);
  const installer = resolve(dir, installerName);
  if (manifestVersion !== version || path !== windowsName || url !== windowsName ||
      sha512 !== hashFile(installer, 'sha512', 'base64') || fileHash !== sha512 ||
      Number(size) !== statSync(installer).size) throw new Error('Windows update manifest does not match the installer/version');
  if (!statSync(resolve(dir, `${windowsName}.blockmap`)).size) throw new Error('Windows update blockmap is empty');
}

export function prepareAssets(artifactDir, publishDir = resolve(artifactDir, 'publish')) {
  const metadata = validateMetadata(JSON.parse(readFileSync(resolve(artifactDir, 'release-metadata.json'), 'utf8')));
  const packages = readdirSync(artifactDir).map(name => ({ name, download: downloadName(name) })).filter(file => file.download);
  if (!packages.some(file => file.download === 'loopra-dist.tar.gz') ||
      !['macos', 'windows', 'linux'].every(platform => packages.some(file => file.download.startsWith(`Loopra-${platform}-`)))) {
    throw new Error('Core and all three desktop packages are required');
  }
  if (new Set(packages.map(file => file.download)).size !== packages.length) throw new Error('Duplicate platform packages');
  const windows = packages.find(file => file.download.startsWith('Loopra-windows-'));
  validateWindowsUpdate(artifactDir, metadata.npmVersion, windows.download, windows.name);
  const updateFiles = ['latest.yml', `${windows.download}.blockmap`].map(name => ({ name, download: name }));
  const files = [...packages, ...updateFiles];
  if (!validReleaseAssets(files.map(file => file.download))) throw new Error('Expected four packages and two Windows update assets');
  mkdirSync(publishDir, { recursive: true });
  if (readdirSync(publishDir).length) throw new Error('Publish directory must be empty');
  metadata.artifacts = {};
  for (const file of files) {
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
