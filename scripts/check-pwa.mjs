// Public PWA release checks; no dependencies and no private data required.
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const manifest = JSON.parse(read('manifest.webmanifest'));

assert.equal(manifest.name, 'Palmeirais Conectada');
assert.equal(manifest.display, 'standalone');
for (const key of ['id', 'start_url', 'scope']) assert.ok(manifest[key], key);
assert.ok(Array.isArray(manifest.icons), 'Missing icons');

for (const size of [192, 512]) {
  const icon = manifest.icons.find((item) =>
    item.type === 'image/png' && item.sizes.split(/\s+/).includes(`${size}x${size}`)
  );
  assert.ok(icon, `Missing ${size}px PNG icon`);
  const path = resolve(root, icon.src);
  assert.ok(existsSync(path), `Missing icon file: ${path}`);
  const bytes = readFileSync(path);
  assert.equal(bytes.subarray(1, 4).toString('ascii'), 'PNG', 'Invalid PNG');
  assert.equal(bytes.readUInt32BE(16), size, 'Icon width mismatch');
  assert.equal(bytes.readUInt32BE(20), size, 'Icon height mismatch');
}

for (const path of [
  'index.html', 'sobre.html', 'cadastro.html', 'login.html',
  'denuncia.html', 'detalhes.html', 'minhas-denuncias.html', 'admin.html'
]) {
  const html = read(path);
  assert.match(html, /rel=["']manifest["']/, `Missing manifest on ${path}`);
  assert.match(html, /rel=["']apple-touch-icon["']/, `Missing Apple icon on ${path}`);
  assert.match(html, /js\/mobile-app\.js/, `Missing mobile app setup on ${path}`);
}

assert.ok(existsSync(resolve(root, 'offline.html')));
const worker = read('sw.js');
assert.match(worker, /request\.mode !== 'navigate'/);
assert.match(worker, /url\.origin !== self\.location\.origin/);
assert.ok(!/cache\.put\s*\(/.test(worker), 'Do not cache user data');
assert.ok(!/SUPABASE_ANON_KEY|access_token|refresh_token/.test(worker));
console.log('PWA validation passed: manifest, PNG dimensions, iOS metadata, offline privacy.');
