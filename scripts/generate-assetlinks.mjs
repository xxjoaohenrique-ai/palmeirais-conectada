// Generate Digital Asset Links ONLY after obtaining the real signing certificate SHA-256.
// Usage: APP_SIGNING_FINGERPRINTS='AA:...:FF[,BB:...:FF]' node scripts/generate-assetlinks.mjs
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const config = JSON.parse(readFileSync(resolve(root, 'android/twa-manifest.json'), 'utf8'));
const values = (process.env.APP_SIGNING_FINGERPRINTS ?? '')
  .split(/[;,]/)
  .map((value) => value.trim().toUpperCase())
  .filter(Boolean);
const fingerprint = /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/;

if (!values.length || values.some((value) => !fingerprint.test(value))) {
  console.error('Defina APP_SIGNING_FINGERPRINTS com o SHA-256 real no formato AA:BB:... (32 bytes).');
  process.exit(1);
}

if (!/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/.test(config.packageId)) {
  console.error('Identificador do pacote Android inválido.');
  process.exit(1);
}

const links = [{
  relation: ['delegate_permission/common.handle_all_urls'],
  target: {
    namespace: 'android_app',
    package_name: config.packageId,
    sha256_cert_fingerprints: [...new Set(values)]
  }
}];
const output = resolve(root, '.well-known/assetlinks.json');
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(links, null, 2) + '\n');
console.log('Arquivo pronto para revisão: .well-known/assetlinks.json');
