import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync, openSync, readSync, closeSync, statSync, existsSync } from 'node:fs';
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
  if (/^loopra.*\.AppImage$/i.test(name)) return `Loopra-linux-${arch}.AppImage`;
  return null;
}

export function releaseAssetName(name) {
  if (/^latest(?:-mac|-linux)?\.yml$/.test(name) || /^Loopra-(?:windows-(?:x64|arm64)\.exe|macos-(?:x64|arm64)\.zip)\.blockmap$/.test(name)) return name;
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

// Validate electron-builder's generated manifests before publishing.
// Read only the required scalar fields; never execute/expand YAML tags or aliases.
function readUpdateManifest(dir, manifestName) {
  const manifest = readFileSync(resolve(dir, manifestName), 'utf8');
  const unquote = value => value.trim().replace(/^(['"])(.*)\1$/, '$2');
  const scalar = (pattern) => {
    const matches = [...manifest.matchAll(pattern)];
    if (matches.length !== 1) throw new Error(`Invalid update manifest: ${manifestName}`);
    return unquote(matches[0][1]);
  };
  const manifestVersion = scalar(/^version:\s*([^\r\n]+)$/gm);
  const path = scalar(/^path:\s*([^\r\n]+)$/gm);
  const sha512 = scalar(/^sha512:\s*([^\r\n]+)$/gm);
  const entries = [];
  let entry;
  for (const line of manifest.split(/\r?\n/)) {
    const url = /^  - url:\s*(.+)$/.exec(line);
    if (url) { entry = { url: unquote(url[1]) }; entries.push(entry); continue; }
    const field = /^    (sha512|size):\s*(.+)$/.exec(line);
    if (field && entry) {
      if (entry[field[1]] !== undefined) throw new Error(`Invalid update manifest: ${manifestName}`);
      entry[field[1]] = unquote(field[2]);
    } else if (/^\S/.test(line)) entry = null;
  }
  return { manifestVersion, path, sha512, entries };
}

export function validateUpdateManifest(dir, manifestName, version, files) {
  const { manifestVersion, path, sha512, entries } = readUpdateManifest(dir, manifestName);
  const mismatch = () => { throw new Error(`Update manifest ${manifestName} does not match the installer/version`); };
  if (manifestVersion !== version || entries.length !== files.length || new Set(entries.map(item => item.url)).size !== files.length) mismatch();
  for (const file of files) {
    const item = entries.find(item => item.url === file.download);
    const installer = resolve(dir, file.name);
    if (!item || item.sha512 !== hashFile(installer, 'sha512', 'base64') || Number(item.size) !== statSync(installer).size) mismatch();
  }
  const primary = entries.find(item => item.url === path);
  if (!primary || primary.sha512 !== sha512) mismatch();
}

// electron-builder only emits the AppImage in latest-linux.yml. DebUpdater needs
// its DEB in the same feed, so build the final manifest from the verified files.
export function renderLinuxUpdateManifest(dir, version, files) {
  const entries = files.map(file => {
    const installer = resolve(dir, file.name);
    return {
      url: file.download,
      sha512: hashFile(installer, 'sha512', 'base64'),
      size: statSync(installer).size,
    };
  });
  return `version: ${version}
files:
${entries.map(entry => `  - url: ${entry.url}
    sha512: ${entry.sha512}
    size: ${entry.size}`).join('\n')}
path: ${entries[0].url}
sha512: ${entries[0].sha512}
`;
}

export function validateWindowsUpdate(dir, version, windowsName, installerName = windowsName) {
  validateUpdateManifest(dir, 'latest.yml', version, [{ name: installerName, download: windowsName }]);
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
  const linux = packages.filter(file => file.download.startsWith('Loopra-linux-'));
  const linuxAppImage = linux.find(file => file.download.endsWith('.AppImage'));
  const linuxDeb = linux.find(file => file.download.endsWith('.deb'));
  if (!linuxAppImage || !linuxDeb) throw new Error('Both Linux DEB and AppImage packages are required');
  // electron-builder records its architecture-specific artifact names
  // (x86_64/amd64); only the published copies are normalized to x64.
  validateUpdateManifest(artifactDir, 'latest-linux.yml', metadata.npmVersion,
    [linuxAppImage, linuxDeb].map(file => ({ ...file, download: file.name })));
  const linuxUpdateManifest = renderLinuxUpdateManifest(artifactDir, metadata.npmVersion, [linuxAppImage, linuxDeb]);
  const updateNames = ['latest.yml', `${windows.download}.blockmap`, 'latest-linux.yml'];
  const macSupport = JSON.parse(readFileSync(resolve(artifactDir, 'desktop-update-mac.json'), 'utf8'));
  if (typeof macSupport.signed !== 'boolean') throw new Error('Missing macOS signing status');
  if (macSupport.signed) {
    const mac = packages.find(file => file.download.startsWith('Loopra-macos-'));
    validateUpdateManifest(artifactDir, 'latest-mac.yml', metadata.npmVersion, [mac]);
    if (!statSync(resolve(artifactDir, `${mac.download}.blockmap`)).size) throw new Error('macOS update blockmap is empty');
    updateNames.push('latest-mac.yml', `${mac.download}.blockmap`);
  } else if (existsSync(resolve(artifactDir, 'latest-mac.yml'))) throw new Error('Ad-hoc macOS builds must not publish an automatic update feed');
  const updateFiles = updateNames.map(name => ({ name, download: name }));
  const files = [...packages, ...updateFiles];
  if (!validReleaseAssets(files.map(file => file.download))) throw new Error('Incomplete desktop packages/update assets');
  mkdirSync(publishDir, { recursive: true });
  if (readdirSync(publishDir).length) throw new Error('Publish directory must be empty');
  metadata.artifacts = {};
  metadata.desktopUpdates = { windows: true, linux: ['deb', 'AppImage'], mac: macSupport.signed };
  for (const file of files) {
    const dest = resolve(publishDir, file.download);
    if (file.name === 'latest-linux.yml') writeFileSync(dest, linuxUpdateManifest);
    else copyFileSync(resolve(artifactDir, file.name), dest);
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
