import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { reserveVersion } from './release-version.mjs';
import { setBuildVersion } from './set-version.mjs';

export function readSourceVersion(sourceDir, tag = '') {
  const read = file => readFileSync(resolve(sourceDir, file), 'utf8').trim();
  const version = read('pom.xml').match(/<loopra\.version>([^<]+)<\/loopra\.version>/)?.[1];
  if (!/^\d+\.\d+\.\d+(?:\.\d+)?$/.test(version || '')) {
    throw new Error(`Invalid source version: ${version}`);
  }
  const npmVersion = version.split('.').slice(0, 3).join('.');
  if (read('loopra/src/installDist/bin/version.txt') !== version ||
      JSON.parse(read('loopra-front/package.json')).version !== npmVersion) {
    throw new Error('Source versions disagree; run bump-version.ps1 in ezdemo/loopra first.');
  }
  if (tag && tag !== `v${version}`) {
    throw new Error(`Release tag ${tag} does not match Loopra main version v${version}.`);
  }
  return { version, npmVersion };
}

export function createSourceMetadata(sourceDir, version, releaseSha) {
  const originalSourceVersion = readFileSync(resolve(sourceDir, 'pom.xml'), 'utf8').match(/<loopra\.version>([^<]+)<\/loopra\.version>/)?.[1];
  setBuildVersion(sourceDir, version);
  return {
    ...readSourceVersion(sourceDir),
    originalSourceVersion,
    sourceRepository: 'ezdemo/loopra',
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
      `Building Loopra **v${metadata.version}** from [main @ ${metadata.sourceSha}](https://github.com/ezdemo/loopra/commit/${metadata.sourceSha}).\n`);
  }
  console.log(JSON.stringify(metadata, null, 2));
}
