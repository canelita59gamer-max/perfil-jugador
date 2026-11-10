// Llena el emulador con un club de prueba en el formato ANTERIOR (todos los jugadores dentro de la categoría),
// igual a como estaban los datos reales antes de separar un documento por jugador. Sirve para probar la migración
// abriendo la app en http://localhost:5173/index.html?emulador
//   node tests/sembrar.js
const E = require('./emulador');
const M = E.MAESTRA;
const CLUB = 'club-prueba';

function jugador(id, nombre, cat, pos, cod, n) {
  const historial = [];
  for (let i = 0; i < n; i++) {
    historial.push({ type: i % 3 === 0 ? 'partido' : 'entrenamiento', date: '2026-10-' + String(1 + i).padStart(2, '0'), delta: 1, rating: 6 + (i % 4),
      asistio: true, pos, quickValues: {}, attrsHit: [], goles: i % 3 === 0 ? 1 : 0, asistencias: 0,
      feedback: 'Buen trabajo', comment: 'Comentario privado del profe ' + i });
  }
  return { id, name: nombre, categoria: cat, pos, posExtra: [], cod, goles: 2, asistencias: 1, valoracion: 60, xp: 0, historial };
}
function publico(p) {
  return { id: p.id, name: p.name, categoria: p.categoria, pos: p.pos, posExtra: [], goles: p.goles, asistencias: p.asistencias, dadas: {},
    historial: p.historial.map((h) => Object.assign({}, h, { comment: '' })) };
}

(async () => {
  await E.limpiar();
  await E.poner('staff/creador@prueba.test', { role: 'creador', modo: 'password' }, M);
  await E.poner('staff/admin@prueba.test', { role: 'admin', club: CLUB, modo: 'password' }, M);
  await E.poner('staff/profe@prueba.test', { role: 'profesor', club: CLUB, categoria: 'Sub-11', modo: 'password' }, M);
  for (const c of ['creador', 'admin', 'profe']) await E.entrar(c + '@prueba.test');
  await E.poner('clubes/' + CLUB, { nombre: 'Club de Prueba', tagline: 'Solo emulador', estado: 'activo', cupos: 60,
    colores: { acento: '#f65334', base: '#0e1736' }, deportes: ['futbol', 'voleibol'] }, M);
  await E.poner(`clubes/${CLUB}/datos/general`, { categories: ['Sub-11', 'Sub-13'], profiles: {}, attrs: { extra: [], labels: {} }, v: 2, insignias: [], racha: [], deportes: {} }, M);
  const sub11 = [jugador('pa1', 'Ana Prueba', 'Sub-11', 'DC', 'AAAA1111', 6), jugador('pa2', 'Beto Prueba', 'Sub-11', 'POR', 'BBBB2222', 4), jugador('pa3', 'Caro Prueba', 'Sub-11', 'MC', 'CCCC3333', 0)];
  const sub13 = [jugador('pb1', 'Dani Prueba', 'Sub-13', 'DFC', 'DDDD4444', 5), jugador('pb2', 'Eli Prueba', 'Sub-13', 'EXT', 'EEEE5555', 3)];
  for (const [cat, lista] of [['Sub-11', sub11], ['Sub-13', sub13]]) {
    await E.poner(`clubes/${CLUB}/categorias/${cat}`, { nombre: cat, players: lista, trainingDays: {}, level: null, weights: null, lineups: {}, formaciones: {},
      formato: null, profile: {}, schedule: [1, 3, 5], attrs: { extra: [], labels: {} }, evals: [], insignias: [], destacados: {} }, M);
    await E.poner(`clubes/${CLUB}/publico/${cat}`, { nombre: cat, level: null, weights: null, attrs: { extra: [], labels: {} }, players: lista.map(publico), insignias: [], destacados: {}, formato: null }, M);
    for (const p of lista) await E.poner(`clubes/${CLUB}/accesos/${p.cod}`, { jugador: p.id, categoria: cat, actualizado: 1 }, M);
  }
  console.log('Emulador sembrado. Club: #/' + CLUB + ' · cuentas: creador@, admin@ y profe@prueba.test · clave: clave-de-prueba · código de familia: AAAA1111');
})().catch((e) => { console.error(e); process.exit(1); });
