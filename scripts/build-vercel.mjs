import { cpSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const output = 'site-dist';
rmSync(output, { recursive: true, force: true });
mkdirSync(output);

for (const file of readdirSync('.').filter((name) => name.endsWith('.html'))) {
  cpSync(file, join(output, file));
}
for (const file of ['manifest.webmanifest', 'robots.txt', 'sitemap.xml', 'sw.js']) {
  cpSync(file, join(output, file));
}
for (const directory of ['css', 'js', 'icons', 'public']) {
  cpSync(directory, join(output, directory), { recursive: true });
}

console.log(`Prepared ${readdirSync(output).length} top-level public entries in ${output}`);
