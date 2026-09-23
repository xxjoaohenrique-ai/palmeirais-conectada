const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const output = path.join(root, 'dist');
// Only public website assets belong in a deployment, never the repository/cache/tests.
fs.mkdirSync(output, { recursive: true });
const files = fs.readdirSync(root).filter(file => file.endsWith('.html'));
files.push('manifest.webmanifest', 'robots.txt', 'sitemap.xml', 'sw.js');
for (const file of files) fs.copyFileSync(path.join(root, file), path.join(output, file));
for (const directory of ['css', 'js', 'icons', 'public']) {
    fs.cpSync(path.join(root, directory), path.join(output, directory), { recursive: true });
}
if (process.env.SUPABASE_URL || process.env.SUPABASE_ANON_KEY) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        throw new Error('SUPABASE_URL e SUPABASE_ANON_KEY devem ser fornecidas juntas.');
    }
    fs.writeFileSync(path.join(output, 'js', 'supabase-config.js'),
        `window.SUPABASE_URL = ${JSON.stringify(process.env.SUPABASE_URL)};\n` +
        `window.SUPABASE_ANON_KEY = ${JSON.stringify(process.env.SUPABASE_ANON_KEY)};\n`);
}
console.log('Site preparado em dist/.');
