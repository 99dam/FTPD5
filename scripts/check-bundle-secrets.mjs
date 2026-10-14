// Fails if the production bundle contains real secret key material:
//   * new-style secret keys (sb_secret_...)
//   * legacy JWT keys whose payload has role = service_role
// Usage: node scripts/check-bundle-secrets.mjs [dist]
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2] ?? 'dist';
const SECRET_KEY = /sb_secret_[A-Za-z0-9_-]{16,}/g;
const JWT = /eyJ[A-Za-z0-9_-]{10,}\.(eyJ[A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]{10,}/g;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.(js|html|css|json|map)$/.test(name)) yield p;
  }
}

let found = 0;
for (const file of walk(root)) {
  const text = readFileSync(file, 'utf8');
  if (SECRET_KEY.test(text)) {
    console.error(`Secret key (sb_secret_) found in ${file}`);
    found++;
  }
  for (const m of text.matchAll(JWT)) {
    try {
      const payload = JSON.parse(Buffer.from(m[1], 'base64url').toString('utf8'));
      if (payload.role === 'service_role') {
        console.error(`service_role JWT found in ${file}`);
        found++;
      }
    } catch {
      /* not a JWT */
    }
  }
}

if (found) process.exit(1);
console.log('No secret keys found in bundle.');
