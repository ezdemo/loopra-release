import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function setBuildVersion(sourceDir, version) {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version || '')) throw new Error('Build version must be a three-part SemVer');
  const read = file => readFileSync(resolve(sourceDir, file), 'utf8');
  const root = read('pom.xml');
  const module = read('loopra/pom.xml');
  const frontend = read('loopra-front/package.json');
  read('loopra/src/installDist/bin/version.txt');
  const property = /(<loopra\.version>)[^<]+(<\/loopra\.version>)/g;
  const project = /(<artifactId>loopra<\/artifactId>\s*<version>)[^<]+(<\/version>)/g;
  if ([...root.matchAll(property)].length !== 1 || [...module.matchAll(project)].length !== 1) {
    throw new Error('Expected exactly one Loopra version in each Maven POM');
  }
  const pkg = JSON.parse(frontend);
  if (typeof pkg.version !== 'string') throw new Error('Frontend package has no version');
  pkg.version = version;
  // Validate every required input before changing any file.
  const files = {
    'pom.xml': root.replace(property, (_, before, after) => `${before}${version}${after}`),
    'loopra/pom.xml': module.replace(project, (_, before, after) => `${before}${version}${after}`),
    'loopra-front/package.json': JSON.stringify(pkg, null, 2) + '\n',
    'loopra/src/installDist/bin/version.txt': version + '\n',
  };
  for (const [file, text] of Object.entries(files)) writeFileSync(resolve(sourceDir, file), text);
  return version;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  setBuildVersion(resolve(process.argv[2] || 'source'), process.argv[3]);
  console.log(`Build version set to ${process.argv[3]}`);
}
