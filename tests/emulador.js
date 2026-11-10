// Ayudas para probar contra el emulador de Firebase (Firestore en :8080, Auth en :9099).
// Sin dependencias: usa fetch de Node. "owner" es la llave maestra del emulador (salta las reglas).
const PROYECTO = 'perfil-jugadores';
const FS = 'http://127.0.0.1:8080';
const AUTH = 'http://127.0.0.1:9099';
const DOCS = `${FS}/v1/projects/${PROYECTO}/databases/(default)/documents`;

function aValor(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(aValor) } };
  return { mapValue: { fields: aCampos(v) } };
}
function aCampos(o) { const f = {}; Object.keys(o).forEach((k) => { f[k] = aValor(o[k]); }); return f; }
function deValor(v) {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(deValor);
  if ('mapValue' in v) return deCampos(v.mapValue.fields || {});
  return null;
}
function deCampos(f) { const o = {}; Object.keys(f || {}).forEach((k) => { o[k] = deValor(f[k]); }); return o; }
function cab(token) { const h = { 'Content-Type': 'application/json' }; if (token) h.Authorization = 'Bearer ' + token; return h; }
const ruta = (p) => p.split('/').map(encodeURIComponent).join('/');

async function limpiar() {
  await fetch(`${FS}/emulator/v1/projects/${PROYECTO}/databases/(default)/documents`, { method: 'DELETE' });
  await fetch(`${AUTH}/emulator/v1/projects/${PROYECTO}/accounts`, { method: 'DELETE' });
}
// Crea una cuenta en el emulador y devuelve {token, uid}. Sin correo = sesión anónima (una familia).
async function entrar(email) {
  const cuerpo = email ? { email, password: 'clave-de-prueba', returnSecureToken: true } : { returnSecureToken: true };
  const r = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=prueba`, { method: 'POST', headers: cab(), body: JSON.stringify(cuerpo) });
  const j = await r.json();
  if (!j.idToken) throw new Error('No se pudo crear la cuenta de prueba: ' + JSON.stringify(j));
  return { token: j.idToken, uid: j.localId };
}
async function poner(path, datos, token) {
  const r = await fetch(`${DOCS}/${ruta(path)}`, { method: 'PATCH', headers: cab(token), body: JSON.stringify({ fields: aCampos(datos) }) });
  return r.status;
}
async function leer(path, token) {
  const r = await fetch(`${DOCS}/${ruta(path)}`, { headers: cab(token) });
  return { status: r.status, datos: r.status === 200 ? deCampos((await r.json()).fields) : null };
}
async function listar(path, token) {
  const r = await fetch(`${DOCS}/${ruta(path)}?pageSize=300`, { headers: cab(token) });
  const j = r.status === 200 ? await r.json() : {};
  return { status: r.status, docs: (j.documents || []).map((d) => ({ id: d.name.split('/').pop(), datos: deCampos(d.fields) })) };
}
// Consulta con filtro de igualdad (lo que hace el profesor: solo su categoría)
async function consultar(padre, coleccion, campo, valor, token) {
  const q = { structuredQuery: { from: [{ collectionId: coleccion }], where: { fieldFilter: { field: { fieldPath: campo }, op: 'EQUAL', value: aValor(valor) } } } };
  const r = await fetch(`${DOCS}/${ruta(padre)}:runQuery`, { method: 'POST', headers: cab(token), body: JSON.stringify(q) });
  const j = await r.json().catch(() => []);
  const fallo = r.status !== 200 || (Array.isArray(j) && j.some((x) => x.error));
  return { status: fallo ? (r.status === 200 ? 403 : r.status) : 200, docs: fallo ? [] : j.filter((x) => x.document).map((x) => ({ id: x.document.name.split('/').pop(), datos: deCampos(x.document.fields) })) };
}
async function borrar(path, token) {
  const r = await fetch(`${DOCS}/${ruta(path)}`, { method: 'DELETE', headers: cab(token) });
  return r.status;
}

module.exports = { PROYECTO, limpiar, entrar, poner, leer, listar, consultar, borrar, MAESTRA: 'owner' };
