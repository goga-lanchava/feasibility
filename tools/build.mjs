#!/usr/bin/env node
/* Embeds the shared numerical engine in the single-file release.
 *
 *   node tools/build.mjs           write src/mc-kernels.js and src/mc-worker.js into feasibility-pipeline.html
 *   node tools/build.mjs --check   exit 1 if the HTML is not in sync with src/ (use before release)
 *
 * The kernel block is an ordinary <script> the page executes on the main thread; the adapter block is
 * type="text/plain" and only ever runs inside the Blob Web Worker, after the identical kernel text.
 * Sources are LF-normalized before embedding because HTML parsing normalizes script text to LF. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HTML = path.join(ROOT, 'feasibility-pipeline.html');
const BLOCKS = [
  { file: 'src/mc-kernels.js', open: /<script id="mc-kernels" data-sha256="[0-9a-f]*">/, tag: sha => `<script id="mc-kernels" data-sha256="${sha}">` },
  { file: 'src/mc-worker.js', open: /<script type="text\/plain" id="mc-worker-adapter" data-sha256="[0-9a-f]*">/, tag: sha => `<script type="text/plain" id="mc-worker-adapter" data-sha256="${sha}">` },
];
const sha256 = s => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
const lf = s => s.replace(/\r\n?/g, '\n');

export function embed(html, readSource = f => fs.readFileSync(path.join(ROOT, f), 'utf8')) {
  const hashes = {};
  for (const b of BLOCKS) {
    const code = lf(readSource(b.file)).replace(/\s+$/, '') + '\n';
    if (/<\/script/i.test(code)) throw new Error(`${b.file} contains "</script", which would end the HTML block early`);
    const m = b.open.exec(html);
    if (!m) throw new Error(`Marker for ${b.file} not found in feasibility-pipeline.html`);
    const start = m.index, bodyStart = start + m[0].length, end = html.indexOf('</script>', bodyStart);
    if (end < 0) throw new Error(`Unterminated block for ${b.file}`);
    const sha = sha256(code); hashes[b.file] = sha;
    html = html.slice(0, start) + b.tag(sha) + '\n' + code + html.slice(end);
  }
  return { html, hashes };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check');
  const current = fs.readFileSync(HTML, 'utf8');
  const { html, hashes } = embed(current);
  for (const [f, h] of Object.entries(hashes)) console.log(`${f.padEnd(18)} sha256 ${h}`);
  if (check) {
    if (html !== current) { console.error('feasibility-pipeline.html is NOT in sync with src/. Run: node tools/build.mjs'); process.exit(1); }
    console.log(`feasibility-pipeline.html in sync  sha256 ${sha256(current)}`);
  } else {
    if (html !== current) fs.writeFileSync(HTML, html);
    console.log(`${html !== current ? 'wrote' : 'unchanged'} feasibility-pipeline.html  sha256 ${sha256(html)}`);
  }
}
