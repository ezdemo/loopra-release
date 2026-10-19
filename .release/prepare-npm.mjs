import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const artifactDir = resolve(process.argv[2] || 'release-artifacts');
const metadata = JSON.parse(readFileSync(resolve(artifactDir, 'release-metadata.json'), 'utf8'));
if (!/^\d+\.\d+\.\d+(?:\.\d+)?$/.test(metadata.version) ||
    !/^\d+\.\d+\.\d+$/.test(metadata.npmVersion) ||
    metadata.npmVersion !== metadata.version.split('.').slice(0, 3).join('.') ||
    metadata.sourceRepository !== 'ezdemo/loopra' ||
    metadata.releaseRepository !== 'ezdemo/loopra-release' ||
    process.env.RELEASE_TAG !== `v${metadata.version}`) {
  throw new Error('Release metadata does not match the requested tag');
}
const packageDir = new URL('./npm/loopra-dist/', import.meta.url);
const packageFile = new URL('package.json', packageDir);
const pkg = JSON.parse(readFileSync(packageFile, 'utf8'));
pkg.version = metadata.npmVersion;
writeFileSync(packageFile, JSON.stringify(pkg, null, 2) + '\n');
copyFileSync(resolve(artifactDir, 'loopra-dist.tar.gz'), new URL('loopra-dist.tar.gz', packageDir));
