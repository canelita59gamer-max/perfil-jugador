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
const VENTANA = 9;               // minutos: un poco más que el intervalo, para no dejar huecos
const AVANCE = 10;               // minutos que el creador recibe el aviso antes que el profesor
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
    enviados[clave] = Date.now();
    p.enviados = enviados;
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

// ---------- Familias ----------
// Un aviso cuando el profesor califica al niño (entreno o partido) y cuando su carta sube.
// La primera vez que se ve un celular solo se anota cómo está todo, para no avisar de cosas viejas.
async function mandarFamilia(doc, token, titulo, cuerpo, url) {
  try {
    await fcm.send({
      token,
      notification: { title: titulo, body: cuerpo },
      data: { url, tag: 'familia' },
      webpush: { fcmOptions: { link: url }, notification: { icon: '/icon-192.png', badge: '/icon-192.png' } }
    });
    console.log('familia avisada:', doc.ref.path.split('/')[1]);
    return true;
  } catch (e) {
    const c = e.errorInfo && e.errorInfo.code;
    if (c === 'messaging/registration-token-not-registered' || c === 'messaging/invalid-argument') {
      await doc.ref.delete().catch(() => {});
      console.log('celular de familia vencido, borrado');
    } else {
      console.error('falló familia', c || e.message);
    }
    return false;
  }
}

async function avisarFamilias() {
  let n = 0, vistos = 0;
  const clubes = await db.collection('clubes').get();
  for (const club of clubes.docs) {
    const fams = await db.collection(`clubes/${club.id}/familias`).get();
    if (fams.empty) continue;
    const jugadoresDe = {};
    for (const f of fams.docs) {
      const v = f.data() || {};
      if (!v.token || !v.jugador || !v.categoria) continue;
      vistos++;
      if (!(v.categoria in jugadoresDe)) {
        const d = await db.doc(`clubes/${club.id}/categorias/${v.categoria}`).get().catch(() => null);
        jugadoresDe[v.categoria] = d && d.exists ? (d.data().players || []) : [];
      }
      const p = jugadoresDe[v.categoria].find((x) => x.id === v.jugador);
      if (!p) continue;

      const conNota = (p.historial || []).filter((h) => typeof h.rating === 'number' && h.asistio !== false);
      const ult = conNota.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
      const claveUlt = ult ? `${ult.type}|${ult.date}` : '';
      const val = typeof p.valoracion === 'number' ? p.valoracion : null;

      if (!v.visto) { // primera vez: solo anotar
        await f.ref.set({ visto: Date.now(), ultimo: claveUlt, val }, { merge: true });
        continue;
      }
      const nuevaNota = ult && claveUlt !== v.ultimo;
      const subio = val !== null && typeof v.val === 'number' && val > v.val;
      if (nuevaNota || subio) {
        const nombre = String(p.name || 'Tu hijo').split(' ')[0];
        const url = `${SITIO}/#/${club.id}`;
        let titulo, cuerpo;
        if (nuevaNota) {
          const donde = ult.type === 'partido' ? 'el partido' : 'el entrenamiento';
          titulo = `${nombre} fue calificado: ${ult.rating}/10`;
          cuerpo = `Su profesor lo calificó en ${donde}.` + (subio ? ` Y su carta subió de ${v.val} a ${val}.` : ' Toca para ver el comentario.');
        } else {
          titulo = `${nombre} subió a ${val}`;
          cuerpo = `Su carta pasó de ${v.val} a ${val}. Toca para verla.`;
        }
        if (await mandarFamilia(f, v.token, titulo, cuerpo, url)) n++;
        else continue; // si falló, se reintenta en la próxima vuelta
      }
      if (claveUlt !== v.ultimo || val !== v.val) {
        await f.ref.set({ ultimo: claveUlt, val }, { merge: true }).catch(() => {});
      }
    }
  }
  console.log(`Revisadas ${vistos} familias, ${n} avisos enviados.`);
  return n;
}

(async () => {
  const snap = await db.collection('avisos').get();
  let n = 0;

  // el creador no tiene categoría: recibe una copia de cada entreno, 10 minutos antes que el profesor
  const jefes = snap.docs.filter((d) => {
    const v = d.data() || {};
    return v.activo && v.token && !v.categoria;
  });

  for (const doc of snap.docs) {
    const p = doc.data() || {};
    // la categoría puede faltar (p. ej. el creador): se avisa igual, solo sin revisar el registro
    if (!p.activo || !p.token || !p.club) continue;

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

    const estado = p.categoria
      ? await registroDeHoy(p.club, p.categoria, t.fecha)
      : { entreno: false, partido: false, hayAlineacion: false };
    const dondeTxt = p.categoria || 'Tu categoría';
    const verEntreno = `${SITIO}/#/${p.club}`;

    // 0. copia anticipada para el creador
    if (entrenaHoy && p.categoria && hora !== null && toca(hora - (+p.antes || 0) - AVANCE, t.min)) {
      for (const jefe of jefes) {
        if (jefe.id === doc.id) continue;
        const j = jefe.data() || {};
        if (await enviar(jefe, j, `sup|${doc.id}|${t.fecha}`,
          `${p.categoria} entrena a las ${en12(p.hora)}`,
          `En ${AVANCE + (+p.antes || 0)} minutos le llega el aviso al profesor.`, verEntreno)) n++;
      }
    }

    // 1. antes del entreno
    if (entrenaHoy && hora !== null && toca(hora - (+p.antes || 0), t.min)) {
      if (await enviar(doc, p, `antes|${t.fecha}`,
        `Hoy entrenas a las ${en12(p.hora)}`,
        `${dondeTxt}. Cuando termines, marca asistencia y califica.`, verEntreno)) n++;
    }

    // 2. si no ha registrado
    if (entrenaHoy && p.categoria && p.recordar && !estado.entreno && toca(aMin(p.horaRecordar), t.min)) {
      if (await enviar(doc, p, `recordar|${t.fecha}`,
        'No olvides registrar el entrenamiento de hoy',
        `${p.categoria} todavía no tiene asistencia ni notas de hoy. Te toma 2 minutos.`, verEntreno)) n++;
    }

    // 3. día de partido: solo si ya armó la alineación y aún no calificó
    if (p.categoria && p.partido && estado.hayAlineacion && !estado.partido && toca(aMin(p.hora), t.min)) {
      if (await enviar(doc, p, `partido|${t.fecha}`,
        'Registra el partido de hoy ⚽',
        `${p.categoria}. Marca quiénes jugaron y califícalos.`, verEntreno)) n++;
    }
  }

  console.log(`Revisados ${snap.size} profesores, ${n} avisos enviados.`);
  await avisarFamilias().catch((e) => console.error('familias:', e.message));
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
