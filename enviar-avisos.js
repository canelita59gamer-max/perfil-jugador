/*
 * Arena Sports — enviador de recordatorios
 * Corre solo cada media hora (GitHub Actions) y manda los avisos que toquen en ese rato.
 * No necesita plan de pago de Firebase.
 *
 * Mira cada documento de "avisos" y decide, en hora de Colombia:
 *   1. antes del entreno  — "Hoy entrenas a las 4:00 p. m."
 *   2. si no registró     — "No olvides registrar el entrenamiento de hoy"
 *   3. día de partido     — solo si el profesor ya creó el partido de hoy
 *
 * Nunca manda dos veces lo mismo el mismo día: lo anotado queda en el campo "enviados".
 */
const admin = require('firebase-admin');

const ZONA = -5;                 // Colombia
const VENTANA = 35;              // minutos: un poco más que el intervalo, para no dejar huecos
const SITIO = process.env.SITIO || 'https://perfil-jugador-wheat.vercel.app';

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
});
const db = admin.firestore();
const fcm = admin.messaging();

function ahoraLocal(zona) {
  const d = new Date(Date.now() + zona * 3600 * 1000);
  return {
    dia: d.getUTCDay(),
    min: d.getUTCHours() * 60 + d.getUTCMinutes(),
    fecha: d.toISOString().slice(0, 10)
  };
}
const aMin = (hhmm) => {
  const [h, m] = String(hhmm || '').split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};
// ¿ya pasó la hora, pero hace poco? Así no se pierde un aviso si la tarea se retrasa.
const toca = (objetivo, ahora) => objetivo !== null && ahora >= objetivo && ahora - objetivo < VENTANA;

const en12 = (hhmm) => {
  const [h, m] = String(hhmm).split(':');
  const n = +h, s = n < 12 ? 'a. m.' : 'p. m.';
  return (n % 12 || 12) + ':' + m + ' ' + s;
};

// ¿el profesor ya guardó algo hoy en su categoría?
async function registroDeHoy(club, categoria, fecha) {
  try {
    const d = await db.doc(`clubes/${club}/categorias/${categoria}`).get();
    if (!d.exists) return { entreno: false, partido: false };
    const v = d.data() || {};
    const dia = (v.trainingDays || {})[fecha];
    const entreno = !!(dia && (dia.held !== null || Object.keys(dia.attendance || {}).length));
    const partido = (v.players || []).some((p) =>
      (p.historial || []).some((h) => h.type === 'partido' && h.date === fecha)
    );
    const hayAlineacion = !!(v.lineups || {})[fecha];
    return { entreno, partido, hayAlineacion };
  } catch (e) {
    console.error('No se pudo leer', club, categoria, e.message);
    return { entreno: true, partido: true, hayAlineacion: false }; // ante la duda, no molestar
  }
}

async function enviar(doc, p, clave, titulo, cuerpo, url) {
  const enviados = p.enviados || {};
  if (enviados[clave]) return false;
  try {
    await fcm.send({
      token: p.token,
      notification: { title: titulo, body: cuerpo },
      data: { url, tag: clave.split('|')[0] },
      webpush: {
        fcmOptions: { link: url },
        notification: { icon: '/icon-192.png', badge: '/icon-192.png' }
      }
    });
    await doc.ref.set({ enviados: { [clave]: Date.now() } }, { merge: true });
    console.log('enviado:', doc.id, clave);
    return true;
  } catch (e) {
    const c = e.errorInfo && e.errorInfo.code;
    // el celular desinstaló la app o cambió de token: se borra para no reintentar siempre
    if (c === 'messaging/registration-token-not-registered' || c === 'messaging/invalid-argument') {
      await doc.ref.set({ token: admin.firestore.FieldValue.delete() }, { merge: true });
      console.log('token vencido, borrado:', doc.id);
    } else {
      console.error('falló', doc.id, c || e.message);
    }
    return false;
  }
}

(async () => {
  const snap = await db.collection('avisos').get();
  let n = 0;

  for (const doc of snap.docs) {
    const p = doc.data() || {};
    if (!p.activo || !p.token || !p.club || !p.categoria) continue;

    const t = ahoraLocal(typeof p.zona === 'number' ? p.zona : ZONA);
    const entrenaHoy = (p.dias || []).includes(t.dia);
    const hora = aMin(p.hora);

    // limpiar lo anotado de días anteriores
    const enviados = p.enviados || {};
    const viejos = Object.keys(enviados).filter((k) => !k.endsWith(t.fecha));
    if (viejos.length) {
      const borrar = {};
      viejos.forEach((k) => (borrar[`enviados.${k}`] = admin.firestore.FieldValue.delete()));
      await doc.ref.update(borrar).catch(() => {});
      viejos.forEach((k) => delete enviados[k]);
      p.enviados = enviados;
    }

    const estado = await registroDeHoy(p.club, p.categoria, t.fecha);
    const verEntreno = `${SITIO}/#/${p.club}`;

    // 1. antes del entreno
    if (entrenaHoy && hora !== null && toca(hora - (+p.antes || 0), t.min)) {
      if (await enviar(doc, p, `antes|${t.fecha}`,
        `Hoy entrenas a las ${en12(p.hora)}`,
        `${p.categoria}. Cuando termines, marca asistencia y califica.`, verEntreno)) n++;
    }

    // 2. si no ha registrado
    if (entrenaHoy && p.recordar && !estado.entreno && toca(aMin(p.horaRecordar), t.min)) {
      if (await enviar(doc, p, `recordar|${t.fecha}`,
        'No olvides registrar el entrenamiento de hoy',
        `${p.categoria} todavía no tiene asistencia ni notas de hoy. Te toma 2 minutos.`, verEntreno)) n++;
    }

    // 3. día de partido: solo si ya armó la alineación y aún no calificó
    if (p.partido && estado.hayAlineacion && !estado.partido && toca(aMin(p.hora), t.min)) {
      if (await enviar(doc, p, `partido|${t.fecha}`,
        'Registra el partido de hoy ⚽',
        `${p.categoria}. Marca quiénes jugaron y califícalos.`, verEntreno)) n++;
    }
  }

  console.log(`Revisados ${snap.size} profesores, ${n} avisos enviados.`);
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
