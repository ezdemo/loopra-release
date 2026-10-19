import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function prepareAssets(artifactDir, toolingDir = fileURLToPath(new URL('.', import.meta.url))) {
  const metadata = JSON.parse(readFileSync(resolve(artifactDir, 'release-metadata.json'), 'utf8'));
  if (!/^\d+\.\d+\.\d+(?:\.\d+)?$/.test(metadata.version) || !/^[a-f0-9]{40}$/.test(metadata.sourceSha)) {
    throw new Error('Invalid release metadata');
  }
  for (const file of readdirSync(toolingDir).filter(file => /^setup.*\.(sh|ps1)$/.test(file))) {
    const input = readFileSync(resolve(toolingDir, file), 'utf8');
    const text = file.endsWith('.sh')
      ? input.replace('VERSION="${LOOPRA_VERSION:-latest}"', `VERSION="v${metadata.version}"`)
      : input.replace('$VERSION = if ($env:LOOPRA_VERSION) { $env:LOOPRA_VERSION } else { "latest" }', `$VERSION = "v${metadata.version}"`);
    if (text === input) throw new Error(`Could not pin installer version: ${file}`);
    writeFileSync(resolve(artifactDir, file), text);
  }
  return `## Loopra v${metadata.version}

源码：[ezdemo/loopra main @ ${metadata.sourceSha}](https://github.com/ezdemo/loopra/commit/${metadata.sourceSha})

- macOS（Apple Silicon）：\`Loopra-*.zip\`
- Windows：\`Loopra Setup *.exe\`
- Linux：\`loopra-front_*.deb\`
- CLI / Web 核心：\`loopra-dist.tar.gz\`

安装脚本 \`setup*.sh\` / \`setup*.ps1\` 固定安装本次版本。校验和见 \`SHA256SUMS\`，构建来源见 \`release-metadata.json\`。

未配置 Apple Developer ID 证书时，macOS 使用 ad-hoc 签名，首次打开请右键 → 打开。
`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  writeFileSync('release-notes.md', prepareAssets(resolve(process.argv[2] || 'release-artifacts')));
}
