/*
 * Arena Sports — copias de seguridad
 * Corre solo una vez al día (GitHub Actions) y guarda una copia de cada club DENTRO de su propio espacio:
 *   clubes/{club}/respaldos/{AAAA-MM-DD}            resumen de la copia
 *   clubes/{club}/respaldos/{AAAA-MM-DD}/docs/...   un documento por cada documento copiado
 * Conserva los últimos 14 días. Las copias "migracion-..." que hace la app nunca se borran.
 * No copia las fotos ni los adjuntos de las fichas (pesan demasiado para guardar 14 versiones).
 *
 *   node respaldo.js                                  copia todos los clubes
 *   node respaldo.js restaurar <club> <fecha>         muestra qué se restauraría (no cambia nada)
 *   node respaldo.js restaurar <club> <fecha> --aplicar   vuelve a escribir esos documentos
 *
 * Restaurar reescribe los documentos de la copia; no borra los que se hayan creado después.
 */
const admin = require('firebase-admin');

const DIAS = 14;
const COLECCIONES = ['datos', 'categorias', 'publico', 'jugadores', 'cartas', 'accesos', 'mensajes', 'fichas'];

if (process.env.FIRESTORE_EMULATOR_HOST) admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'perfil-jugadores' });
else admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = admin.firestore();

function hoyColombia() { return new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10); }

// escribe o borra en paquetes (Firebase acepta hasta 500 por paquete)
async function enPaquetes(lista, hacer) {
  for (let i = 0; i < lista.length; i += 400) {
    const b = db.batch();
    lista.slice(i, i + 400).forEach((x) => hacer(b, x));
    await b.commit();
  }
}
async function borrarCopia(ref) {
  const docs = await ref.collection('docs').get();
  await enPaquetes(docs.docs, (b, d) => b.delete(d.ref));
  await ref.delete();
}

async function respaldarClub(club, fecha) {
  const base = `clubes/${club}`;
  const copia = [];
  const fichaClub = await db.doc(base).get();
  if (fichaClub.exists) copia.push({ ruta: '', datos: JSON.stringify(fichaClub.data()) });
  for (const col of COLECCIONES) {
    const snap = await db.collection(`${base}/${col}`).get();
    snap.forEach((d) => copia.push({ ruta: `${col}/${d.id}`, datos: JSON.stringify(d.data()) }));
  }
  const ref = db.doc(`${base}/respaldos/${fecha}`);
  if ((await ref.get()).exists) await borrarCopia(ref); // si ya había copia de hoy, se reemplaza
  await enPaquetes(copia, (b, x) => b.set(ref.collection('docs').doc(), x));
  await ref.set({ tipo: 'diario', creado: Date.now(), total: copia.length });

  // limpieza: solo las copias diarias (su nombre es una fecha) más viejas que DIAS
  const limite = new Date(Date.now() - 5 * 3600 * 1000 - DIAS * 86400000).toISOString().slice(0, 10);
  const todas = await db.collection(`${base}/respaldos`).get();
  let borradas = 0;
  for (const d of todas.docs) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(d.id) && d.id < limite) { await borrarCopia(d.ref); borradas++; }
  }
  return { total: copia.length, borradas };
}

async function respaldarTodo() {
  const fecha = hoyColombia();
  const clubes = await db.collection('clubes').get();
  let fallos = 0;
  for (const c of clubes.docs) {
    try {
      const r = await respaldarClub(c.id, fecha);
      console.log(`${c.id}: ${r.total} documentos copiados en respaldos/${fecha}` + (r.borradas ? ` · ${r.borradas} copia(s) vieja(s) borrada(s)` : ''));
    } catch (e) { fallos++; console.error(`${c.id}: NO se pudo copiar —`, e.message); }
  }
  if (fallos) process.exitCode = 1;
}

async function restaurar(club, fecha, aplicar) {
  const ref = db.doc(`clubes/${club}/respaldos/${fecha}`);
  if (!(await ref.get()).exists) { console.error(`No hay copia ${fecha} para ${club}.`); process.exitCode = 1; return; }
  const docs = (await ref.collection('docs').get()).docs.map((d) => d.data());
  const porCol = {};
  docs.forEach((x) => { const k = x.ruta ? x.ruta.split('/')[0] : '(ficha del club)'; porCol[k] = (porCol[k] || 0) + 1; });
  console.log(`Copia ${fecha} de ${club}: ${docs.length} documentos`, porCol);
  if (!aplicar) { console.log('Solo se mostró. Para restaurar de verdad, agrega --aplicar.'); return; }
  await enPaquetes(docs, (b, x) => b.set(db.doc(x.ruta ? `clubes/${club}/${x.ruta}` : `clubes/${club}`), JSON.parse(x.datos)));
  console.log('Restaurado.');
}

const [accion, club, fecha] = process.argv.slice(2);
(accion === 'restaurar' ? restaurar(club, fecha, process.argv.includes('--aplicar')) : respaldarTodo())
  .catch((e) => { console.error(e); process.exitCode = 1; });
