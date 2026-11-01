// Packs index.html, styles.css, data.js and app.js into one page body for
// hosting as a single-file artifact. Usage: node build-artifact.mjs <out.html>
import { readFileSync, writeFileSync } from 'node:fs';
const here = new URL('.', import.meta.url);
const read = (f) => readFileSync(new URL(f, here), 'utf8');
const html = read('index.html');
const head = html.match(/<title>[\s\S]*?(?=<link rel="stylesheet" href="styles.css">)/)[0];
const body = html.match(/<!--BODY-->([\s\S]*?)<!--\/BODY-->/)[1];
const safe = (js) => js.replace(/<\/script/gi, '<\\/script');
const out = `${head}<style>\n${read('styles.css')}\n</style>\n${body}\n<script>\n${safe(read('data.js'))}\n</script>\n<script>\n${safe(read('app.js'))}\n</script>\n`;
writeFileSync(process.argv[2] || 'george-artifact.html', out);
console.log('wrote', process.argv[2], out.length, 'bytes');
