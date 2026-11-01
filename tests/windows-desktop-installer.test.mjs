import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';

const root = fileURLToPath(new URL('..', import.meta.url));
const quote = value => "'" + value.replaceAll("'", "''") + "'";

test('Windows desktop scripts retain portable fallback for releases without installers', { skip: process.platform !== 'win32' }, t => {
  const dir = mkdtempSync(join(tmpdir(), 'loopra-gui-fallback-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const fixture = join(dir, 'portable.exe');
  writeFileSync(fixture, Buffer.concat([Buffer.from('MZ'), Buffer.alloc(100)]));
  for (const name of ['setup-gui.ps1', 'setup-gui-mirror.ps1']) {
    const destination = join(dir, name);
    mkdirSync(destination);
    const trace = join(dir, name + '.urls');
    const wrapper = join(dir, name + '.wrapper.ps1');
    const source = `
$ErrorActionPreference = 'Stop'
function Invoke-WebRequest([string]$Uri, [string]$OutFile, [switch]$UseBasicParsing) {
    Add-Content -LiteralPath ${quote(trace)} -Value $Uri
    if ($Uri.EndsWith('-setup.exe')) {
        $failure = New-Object System.Exception 'fixture HTTP 404'
        $failure | Add-Member NoteProperty Response ([pscustomobject]@{ StatusCode = 404 })
        throw $failure
    }
    Copy-Item -LiteralPath ${quote(fixture)} -Destination $OutFile
}
. ${quote(resolve(root, '.release', name))}
`;
    writeFileSync(wrapper, '\ufeff' + source);
    execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', wrapper], {
      env: { ...process.env, LOOPRA_VERSION: 'v26.11.104', LOOPRAX_ARCH: 'amd64', LOOPRAX_INSTALL_DIR: destination,
        LOOPRA_MIRROR: name.includes('mirror') ? 'https://gh-proxy.org/' : '' },
      encoding: 'utf8', timeout: 15000,
    });
    assert.deepEqual(readFileSync(join(destination, 'loopra-desktop.exe')), readFileSync(fixture));
    const urls = readFileSync(trace, 'utf8').trim().split(/\r?\n/);
    assert.equal(urls.length, 2);
    assert.ok(urls[0].endsWith('/v26.11.104/loopra-desktop-windows-amd64-setup.exe'));
    assert.ok(urls[1].endsWith('/v26.11.104/loopra-desktop-windows-amd64.exe'));
  }
});
