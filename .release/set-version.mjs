import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const VERSION_FILE = 'internal/controller/version.go';
const VERSION_PATTERN = /var Version = "([^"]*)"/g;

export function readVersionText(sourceDir) {
  return readFileSync(resolve(sourceDir, VERSION_FILE), 'utf8');
}

export function versionValues(text) {
  return [...text.matchAll(VERSION_PATTERN)].map(match => match[1]);
}

export function setBuildVersion(sourceDir, version) {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version || '')) throw new Error('Build version must be a three-part SemVer');
  const text = readVersionText(sourceDir);
  if (versionValues(text).length !== 1) throw new Error('Expected exactly one LoopraX version in version.go');
  writeFileSync(resolve(sourceDir, VERSION_FILE), text.replace(VERSION_PATTERN, `var Version = "${version}"`));
  return version;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  setBuildVersion(resolve(process.argv[2] || 'source'), process.argv[3]);
  console.log(`Build version set to ${process.argv[3]}`);
}
