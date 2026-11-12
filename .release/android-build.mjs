import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashFile } from './prepare-assets.mjs';
import { validateMetadata } from './release-metadata.mjs';

export function androidVersionCode(version) {
  const match = /^(0|[1-9]\d?)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(version || '');
  if (!match) throw new Error('Android build version must use the reserved Shanghai date version');
  const [year, month, patch] = match.slice(1).map(Number);
  const day = Math.floor(patch / 100), sequence = patch % 100;
  const date = new Date(Date.UTC(2000 + year, month - 1, day));
  if (month < 1 || month > 12 || day < 1 || sequence < 1 ||
      date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error('Invalid Shanghai date or daily sequence in Android build version');
  }
  // The desktop patch includes day + sequence and can exceed 999. Give each
  // month its own 10,000 codes instead of Tauri's default 1,000-code range.
  return year * 1000000 + month * 10000 + patch;
}

export function setAndroidBuildVersion(sourceDir, version) {
  const versionCode = androidVersionCode(version);
  const read = file => readFileSync(resolve(sourceDir, file), 'utf8');
  const packagePath = 'mobile/package.json', configPath = 'mobile/src-tauri/tauri.conf.json';
  const packageJson = JSON.parse(read(packagePath)), config = JSON.parse(read(configPath));
  if (packageJson.name !== 'loopra-mobile' || config.identifier !== 'app.loopra.mobile') {
    throw new Error('Expected the Loopra mobile package and application identifier');
  }
  const replaceVersion = (file, table) => {
    const text = read(file);
    const pattern = new RegExp(`(^${table}\\r?\\nname = "loopra-mobile"\\r?\\nversion = )"[^"]+"`, 'gm');
    if ([...text.matchAll(pattern)].length !== 1) throw new Error(`Expected one loopra-mobile package in ${file}`);
    return text.replace(pattern, `$1"${version}"`);
  };
  const manifestPath = 'mobile/src-tauri/Cargo.toml', lockPath = 'mobile/src-tauri/Cargo.lock';
  const manifest = replaceVersion(manifestPath, '\\[package\\]');
  const lock = replaceVersion(lockPath, '\\[\\[package\\]\\]');
  packageJson.version = version;
  config.version = version;
  config.bundle = { ...config.bundle, android: { ...config.bundle?.android, versionCode, autoIncrementVersionCode: false } };
  // Validate every input before updating the disposable source checkout.
  for (const [file, text] of [[packagePath, JSON.stringify(packageJson, null, 2) + '\n'],
    [configPath, JSON.stringify(config, null, 2) + '\n'], [manifestPath, manifest], [lockPath, lock]]) {
    writeFileSync(resolve(sourceDir, file), text);
  }
  return versionCode;
}

export function validateAndroidPackage(badging, version) {
  const packageLine = badging.split('\n').find(line => line.startsWith('package:')) || '';
  const fields = Object.fromEntries([...packageLine.matchAll(/(\w+)='([^']*)'/g)].map(match => [match[1], match[2]]));
  const abis = [...(badging.match(/^native-code:(.*)$/m)?.[1] || '').matchAll(/'([^']+)'/g)].map(match => match[1]);
  if (fields.name !== 'app.loopra.mobile' || fields.versionName !== version ||
      fields.versionCode !== String(androidVersionCode(version))) throw new Error('Android APK identity or version does not match this build');
  if (abis.length !== 1 || abis[0] !== 'arm64-v8a') throw new Error('Expected an ARM64-only Android APK');
  if (!/^application-debuggable\s*$/m.test(badging)) throw new Error('Expected a debug Android APK');
  if (!/^sdkVersion:'24'\s*$/m.test(badging)) throw new Error('Expected Android minSdkVersion 24');
}

export function stageAndroidBuild(sourceDir, outDir, metadata, badging) {
  validateMetadata(metadata);
  validateAndroidPackage(badging, metadata.version);
  const sourceSha = execFileSync('git', ['-C', sourceDir, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  if (sourceSha !== metadata.sourceSha) throw new Error('Android source SHA does not match the pinned build');
  const apk = resolve(sourceDir, 'mobile/src-tauri/gen/android/app/build/outputs/apk/arm64/debug/app-arm64-debug.apk');
  if (readFileSync(apk).subarray(0, 4).toString('hex') !== '504b0304') throw new Error('Android APK is not a ZIP archive');
  mkdirSync(outDir, { recursive: true });
  if (readdirSync(outDir).length) throw new Error('Android artifact directory must be empty');
  const name = `loopra-mobile-${metadata.version}-arm64-debug.apk`;
  const destination = resolve(outDir, name);
  copyFileSync(apk, destination);
  const sha256 = hashFile(destination);
  const build = { version: metadata.version, versionCode: androidVersionCode(metadata.version),
    sourceRepository: metadata.sourceRepository, sourceSha, releaseSha: metadata.releaseSha,
    buildType: 'debug', abi: 'arm64-v8a', file: name, sha256 };
  writeFileSync(resolve(outDir, 'android-build.json'), JSON.stringify(build, null, 2) + '\n');
  writeFileSync(resolve(outDir, 'SHA256SUMS'), `${sha256}  ${name}\n`);
  return build;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, sourceDir, metadataPath, outDir, badgingPath] = process.argv.slice(2);
  const metadata = validateMetadata(JSON.parse(readFileSync(metadataPath, 'utf8')));
  if (command === 'version') console.log(`Android versionCode: ${setAndroidBuildVersion(sourceDir, metadata.version)}`);
  else if (command === 'stage') console.log(JSON.stringify(stageAndroidBuild(sourceDir, outDir, metadata, readFileSync(badgingPath, 'utf8')), null, 2));
  else throw new Error('Usage: android-build.mjs version|stage SOURCE METADATA [OUTPUT BADGING]');
}
