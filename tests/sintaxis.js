// Revisa que el JavaScript de index.html (los <script> sin src), sw.js y los scripts de Node no tengan errores de sintaxis.
//   node tests/sintaxis.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const raiz = path.join(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'arena-sintaxis-'));

const html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
const re = /<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g;
const archivos = [];
let m, i = 0;
while ((m = re.exec(html))) { const f = path.join(tmp, `index-script-${i++}.js`); fs.writeFileSync(f, m[1]); archivos.push(f); }
['sw.js', 'enviar-avisos.js', 'respaldo.js'].forEach((f) => archivos.push(path.join(raiz, f)));

let fallos = 0;
archivos.forEach((f) => {
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); }
  catch (e) { fallos++; console.error('Error de sintaxis en', path.basename(f), '\n' + String(e.stderr || e.message)); }
});
['firebase.json', 'vercel.json', 'manifest.webmanifest'].forEach((f) => {
  try { JSON.parse(fs.readFileSync(path.join(raiz, f), 'utf8')); }
  catch (e) { fallos++; console.error('JSON inválido en', f, e.message); }
});
fs.rmSync(tmp, { recursive: true, force: true });
if (fallos) process.exit(1);
console.log(`sintaxis: ${archivos.length} scripts y 3 JSON OK`);
