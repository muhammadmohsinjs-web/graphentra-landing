import { copyFile, mkdir, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');
const staticFiles = ['index.html', 'styles.css', 'app.js', 'mark.svg'];
const workerEntrypoint = path.join(root, 'worker/index.js');

for (const file of [...staticFiles, workerEntrypoint]) {
  const details = await stat(file);
  if (!details.isFile() || details.size === 0) throw new Error(`Required deployment file is missing or empty: ${file}`);
}

const html = await readFile(path.join(root, 'index.html'), 'utf8');
for (const reference of ['styles.css', 'app.js', 'mark.svg', 'id="early-access"', 'action="/api/leads"']) {
  if (!html.includes(reference)) throw new Error(`Homepage deployment contract is missing: ${reference}`);
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await Promise.all(staticFiles.map(file => copyFile(path.join(root, file), path.join(output, file))));

console.log('Built Graphentra static assets into dist/; Cloudflare Workers serves them and routes POST /api/leads through worker/index.js.');
