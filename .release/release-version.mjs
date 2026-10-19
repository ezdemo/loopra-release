const API = 'https://api.github.com/repos/ezdemo/loopra-release';

export function shanghaiDate(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: 'numeric', day: 'numeric',
  }).formatToParts(now).map(part => [part.type, part.value]));
  return { year: Number(parts.year) % 100, month: Number(parts.month), day: Number(parts.day) };
}

export function nextVersion(usedVersions, now = new Date()) {
  const { year, month, day } = shanghaiDate(now);
  let sequence = 0;
  for (const tag of usedVersions) {
    const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(tag);
    if (!match || Number(match[1]) !== year || Number(match[2]) !== month) continue;
    const patch = Number(match[3]);
    if (Math.floor(patch / 100) === day && patch % 100 >= 1) sequence = Math.max(sequence, patch % 100);
  }
  if (sequence >= 99) throw new Error('Today already has 99 reserved versions (Asia/Shanghai).');
  return `${year}.${month}.${day * 100 + sequence + 1}`;
}

export async function reserveVersion({ token, releaseSha, now = new Date(), request = fetch }) {
  if (!token) throw new Error('GH_TOKEN is required to reserve a release version');
  if (!/^[a-f0-9]{40}$/.test(releaseSha || '')) throw new Error('Invalid release tooling commit');
  const headers = { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const used = [];
  for (const [resource, key] of [['tags', 'name'], ['releases', 'tag_name']]) {
    for (let page = 1; ; page++) {
      const response = await request(`${API}/${resource}?per_page=100&page=${page}`, { headers, signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`Cannot read reserved versions: GitHub HTTP ${response.status}`);
      const batch = await response.json();
      used.push(...batch.map(item => item[key]));
      if (batch.length < 100) break;
    }
  }
  // Creating a tag is atomic. A concurrent build that wins the same version
  // forces this build to try the next sequence, even outside workflow concurrency.
  for (;;) {
    const version = nextVersion(used, now);
    const response = await request(`${API}/git/refs`, {
      method: 'POST', headers, signal: AbortSignal.timeout(30000),
      body: JSON.stringify({ ref: `refs/tags/v${version}`, sha: releaseSha }),
    });
    if (response.ok) return version;
    if ([409, 422].includes(response.status)) {
      const existing = await request(`${API}/git/ref/tags/v${version}`, { headers, signal: AbortSignal.timeout(30000) });
      if (existing.ok) { used.push(`v${version}`); continue; }
    }
    throw new Error(`Cannot reserve version: GitHub HTTP ${response.status}`);
  }
}
