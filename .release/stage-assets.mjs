import { copyFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOOPRAX_ASSETS } from './prepare-assets.mjs';

export function stageAssets(binDir, outDir) {
  const present = new Set(readdirSync(binDir));
  const missing = LOOPRAX_ASSETS.filter(name => !present.has(name));
  if (missing.length) throw new Error(`Missing LoopraX packages: ${missing.join(', ')}`);
  mkdirSync(outDir, { recursive: true });
  if (readdirSync(outDir).length) throw new Error('Stage directory must be empty');
  for (const name of LOOPRAX_ASSETS) {
    const src = resolve(binDir, name);
    if (!statSync(src).isFile() || statSync(src).size <= 0) throw new Error(`Package is empty: ${name}`);
    copyFileSync(src, resolve(outDir, name));
  }
  return [...LOOPRAX_ASSETS];
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const staged = stageAssets(resolve(process.argv[2] || 'dist'), resolve(process.argv[3] || 'release-packages'));
  console.log(`Staged ${staged.length} LoopraX packages`);
}
