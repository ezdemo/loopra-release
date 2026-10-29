import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { reserveVersion } from './release-version.mjs';
import { CURRENT_SOURCE } from './release-metadata.mjs';
import { readVersionText, setBuildVersion, versionValues } from './set-version.mjs';

export function readSourceVersion(sourceDir, tag = '') {
  const values = versionValues(readVersionText(sourceDir));
  if (values.length !== 1) throw new Error('Expected exactly one LoopraX version in version.go');
  const version = values[0];
  if (!/^\d+\.\d+\.\d+(?:\.\d+)?$/.test(version || '')) {
    throw new Error(`Invalid source version: ${version}`);
  }
  const npmVersion = version.split('.').slice(0, 3).join('.');
  if (tag && tag !== `v${version}`) {
    throw new Error(`Release tag ${tag} does not match LoopraX version v${version}.`);
  }
  return { version, npmVersion };
}

export function createSourceMetadata(sourceDir, version, releaseSha) {
  const declared = versionValues(readFileSync(resolve(sourceDir, 'internal/controller/version.go'), 'utf8'));
  if (declared.length !== 1 || !declared[0]) throw new Error('LoopraX version.go has no Version');
  const originalSourceVersion = declared[0];
  setBuildVersion(sourceDir, version);
  return {
    ...readSourceVersion(sourceDir),
    originalSourceVersion,
    sourceRepository: CURRENT_SOURCE,
    sourceRef: 'main',
    sourceSha: execFileSync('git', ['-C', sourceDir, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    releaseRepository: 'ezdemo/loopra-release',
    releaseSha,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const sourceDir = resolve(process.argv[2] || 'source');
  const releaseSha = process.env.GITHUB_SHA || execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const version = await reserveVersion({ token: process.env.GH_TOKEN, releaseSha });
  const metadata = createSourceMetadata(sourceDir, version, releaseSha);
  writeFileSync('release-metadata.json', JSON.stringify(metadata, null, 2) + '\n');
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `source_sha=${metadata.sourceSha}\nversion=${metadata.version}\n`);
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      `Building LoopraX **v${metadata.version}** from [main @ ${metadata.sourceSha}](https://github.com/${CURRENT_SOURCE}/commit/${metadata.sourceSha}).\n`);
  }
  console.log(JSON.stringify(metadata, null, 2));
}
