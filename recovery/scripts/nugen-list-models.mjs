// One-off probe: verify NUGEN_API_KEY works and list alignable base models.
// Reads the key from .env.local and prints ONLY the model list — never the key.
import { readFileSync } from 'node:fs';

function loadKey() {
  try {
    const txt = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^\s*NUGEN_API_KEY\s*=\s*(.*)\s*$/);
      if (m) return m[1].replace(/^["']|["']$/g, '').trim();
    }
  } catch (e) {
    console.error('Could not read .env.local:', e.message);
  }
  return '';
}

const key = loadKey();
if (!key) {
  console.error('NUGEN_API_KEY is empty in .env.local — nothing to test.');
  process.exit(1);
}

const BASE = 'https://api.nugen.in';

async function main() {
  const res = await fetch(`${BASE}/api/v3/models/base?limit=100`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  console.log('HTTP', res.status, res.statusText);
  const text = await res.text();
  // Print body (model list or error message). Contains no credential.
  try {
    console.log(JSON.stringify(JSON.parse(text), null, 2));
  } catch {
    console.log(text.slice(0, 2000));
  }
}

main().catch((e) => {
  console.error('Request failed:', e.message);
  process.exit(1);
});
