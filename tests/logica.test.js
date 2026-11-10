// Pruebas de la lógica de index.html que no necesita pantalla ni Firebase.
// La app es un solo archivo sin módulos, así que aquí se sacan las funciones por nombre y se ejecutan.
//   node tests/logica.test.js
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').replace(/\r\n/g, '\n');

function hasta(i, abre, cierra) { // devuelve el bloque que empieza en la primera llave/corchete desde i
  let d = 0;
  for (let k = i; k < src.length; k++) {
    if (abre.includes(src[k])) d++;
    else if (cierra.includes(src[k])) { d--; if (!d) return k + 1; }
  }
  throw new Error('bloque sin cerrar');
}
function fn(nombre) {
  const i = src.indexOf('function ' + nombre + '(');
  if (i < 0) throw new Error('No existe la función ' + nombre);
  return src.slice(i, hasta(src.indexOf('{', src.indexOf(')', i)), '{', '}'));
}
function vr(nombre) {
  const i = src.indexOf('var ' + nombre + ' = ');
  if (i < 0) throw new Error('No existe la variable ' + nombre);
  return src.slice(i, hasta(src.indexOf(' = ', i) + 3, '[{', ']}')) + ';';
}

let codigo = ['BASE_ATTRS', 'VOLEY_ATTRS', 'DEPORTES', 'POSITIONS', 'VOLEY_POSITIONS', 'VOLEY_ALIASES', 'POSITION_ALIASES', 'DEFAULT_PROFILES',
  'GRUPOS_POS', 'GRUPOS_VOLEY', 'FORMACIONES'].map(vr).join('\n');
codigo += '\nvar ALL_POSITIONS = POSITIONS.concat(VOLEY_POSITIONS);\n';
codigo += ['_G', 'sportOf', 'baseAttrs', 'attrsFor', 'cleanLabel', 'positionsFor', 'posSport', 'defaultPos', 'normalizeVoley', 'normalizePos', 'splitPositions',
  'formatosDe', 'gruposDe', 'setCategorySport', 'posName', 'deportesDelClub', 'catsDeporte', 'variosDeportes', 'nombreCatDeporte', 'elegirDeporte', 'ajustarDeporte',
  'defaultLevel', 'sortCategories', 'jugDe', 'marcarBorrado', 'cerrarTemporada', 'todayStr', 'normalizeCategoryName', 'codigoLimpio'].map(fn).join('\n');

// lo mínimo que esas funciones esperan encontrar alrededor
const entorno = `
var deporteActivo = null, sessionEnteredClub = 'jogo', visitorCategoria = 'Sub-13', jugBorrados = {};
var guardado = {}; var localStorage = { getItem: function(k){ return guardado[k] || null; }, setItem: function(k, v){ guardado[k] = v; } };
var CLUB = { id: 'jogo' }; function currentClub(){ return CLUB; }
var MICAT = ''; function miCategoria(){ return MICAT; }
function attachPhotos(){}
function cleanJson(o){ return JSON.parse(JSON.stringify(o)); }
var state = null;
`;

const pruebas = `
var a = assert;
// ---------- posiciones por deporte ----------
state = { role: 'admin', categorySports: { 'Sub-12 Voleibol': 'voleibol' }, categories: ['Sub-11', 'Sub-12 Voleibol'], clubAttrs: { extra: [], labels: {} }, formatoCat: {},
  players: [{ id: 'a', categoria: 'Sub-12 Voleibol', pos: 'MC', posExtra: ['DC'] }, { id: 'b', categoria: 'Sub-11', pos: 'MC' }], selectedCategoria: 'Sub-11' };
a.equal(sportOf('Sub-12 Voleibol'), 'voleibol'); a.equal(sportOf('Sub-11'), 'futbol'); a.equal(sportOf('no existe'), 'futbol');
a.deepEqual(splitPositions('ARM / LIB', 'voleibol'), ['ARM', 'LIB']);
a.deepEqual(splitPositions('central', 'voleibol'), ['CEN']); a.deepEqual(splitPositions('central'), ['DFC']);
a.deepEqual(splitPositions('LI'), ['LI']); a.deepEqual(splitPositions('LI', 'voleibol'), ['LIB']);
a.deepEqual(splitPositions('PT'), ['POR']); a.deepEqual(splitPositions('lateral izquierdo y extremo'), ['LI', 'EXT']);
a.equal(normalizePos('MC', 'voleibol'), null); a.equal(normalizePos('ARM'), null);
a.equal(attrsFor('Sub-12 Voleibol')[0].key, 'saque'); a.equal(attrsFor('Sub-11')[0].key, 'resistencia'); a.equal(attrsFor('club', 'voleibol').length, 8);
a.deepEqual(formatosDe('Sub-12 Voleibol'), ['6']); a.deepEqual(formatosDe('Sub-11'), ['5', '7', '8', '9', '11']);
ALL_POSITIONS.forEach(function(p){ a.ok(DEFAULT_PROFILES[p.code], 'falta el perfil de ' + p.code); });
FORMACIONES[6]['5-1'].forEach(function(s){ a.equal(posSport(s.p), 'voleibol'); });
a.equal(posName('LIB'), 'Líbero'); a.equal(posName('POR'), 'Portero');
setCategorySport('Sub-11', 'voleibol'); a.equal(state.players[1].pos, 'PUN'); a.equal(state.formatoCat['Sub-11'], 6);
setCategorySport('Sub-11', 'futbol'); a.equal(state.players[1].pos, 'MC'); a.equal(state.formatoCat['Sub-11'], undefined);

// ---------- secciones Fútbol / Voleibol ----------
state = { role: 'admin', categories: ['Sub-13', 'Sub-15'], categorySports: {}, selectedCategoria: 'Sub-15', profesorCategoria: 'Sub-13', players: [] };
ajustarDeporte(); a.equal(deporteActivo, 'futbol'); a.equal(variosDeportes(), false); a.deepEqual(catsDeporte(), ['Sub-13', 'Sub-15']);
a.equal(gruposDe([]).length, 4);
CLUB.deportes = ['futbol', 'voleibol']; a.equal(variosDeportes(), true);
elegirDeporte('voleibol'); a.deepEqual(catsDeporte(), []); a.equal(state.selectedCategoria, 'Sub-15');
a.equal(nombreCatDeporte('Sub-13'), 'Sub-13 Voleibol'); a.equal(nombreCatDeporte('Voleibol mixto'), 'Voleibol mixto');
state.categories.push('Sub-13 Voleibol'); state.categorySports['Sub-13 Voleibol'] = 'voleibol';
ajustarDeporte(); a.equal(state.selectedCategoria, 'Sub-13 Voleibol'); a.deepEqual(catsDeporte(), ['Sub-13 Voleibol']);
elegirDeporte('futbol'); a.equal(state.selectedCategoria, 'Sub-13'); a.equal(nombreCatDeporte('Sub-13'), 'Sub-13');
deporteActivo = null; guardado['arena_dep_jogo'] = 'voleibol'; ajustarDeporte(); a.equal(deporteActivo, 'voleibol'); // recuerda la sección
state.role = 'profesor'; state.profesorCategoria = 'Sub-13 Voleibol'; deporteActivo = 'futbol'; ajustarDeporte(); a.equal(deporteActivo, 'voleibol');
state.role = 'visitante'; deporteActivo = null; guardado = {}; MICAT = 'Sub-13 Voleibol'; ajustarDeporte(); a.equal(deporteActivo, 'voleibol'); a.equal(visitorCategoria, 'Sub-13 Voleibol');
CLUB.deportes = ['futbol']; a.deepEqual(deportesDelClub(), ['futbol', 'voleibol']); // categorías de un deporte quitado no se esconden
a.equal(gruposDe([{ pos: 'LIB' }]).length, 4); a.equal(gruposDe([{ pos: 'LIB' }, { pos: 'MC' }]).length, 8);
a.equal(defaultLevel('Sub-13 Voleibol'), 'competitivo'); a.equal(defaultLevel('Sub-8'), 'infantil');
a.deepEqual(sortCategories(['Sub-15', 'Sub-13 Voleibol', 'Sub-11']), ['Sub-11', 'Sub-13 Voleibol', 'Sub-15']);
a.equal(normalizeCategoryName('sub 11'), 'Sub-11'); a.equal(codigoLimpio(' ab-12 cd '), 'AB12CD');

// ---------- un documento por jugador ----------
var mapa = { p2: { id: 'p2', categoria: 'Sub-11' }, p1: { id: 'p1', categoria: 'Sub-11' }, p3: { id: 'p3', categoria: 'Sub-13' } };
a.deepEqual(jugDe(mapa, 'Sub-11').map(function(x){ return x.id; }), ['p1', 'p2']); a.deepEqual(jugDe(mapa, 'Sub-9'), []);
marcarBorrado({ id: 'p9', categoria: 'Sub-11', cod: 'ABCD' }); a.deepEqual(jugBorrados.p9, { cat: 'Sub-11', cod: 'ABCD' });
marcarBorrado(null); marcarBorrado({}); a.equal(Object.keys(jugBorrados).length, 1);

// ---------- cerrar temporada ----------
var jug = { id: 'j', categoria: 'Sub-11', pos: 'DC', valoracion: 71, goles: 4, asistencias: 2,
  historial: [{ type: 'partido', asistio: true }, { type: 'entrenamiento', asistio: true }, { type: 'entrenamiento', asistio: false }] };
cerrarTemporada('2026', [jug]);
a.equal(jug.temporadas.length, 1); a.equal(jug.temporadas[0].valoracion, 71); a.equal(jug.temporadas[0].sesiones, 3);
a.equal(jug.temporadas[0].asistio, 2); a.equal(jug.temporadas[0].partidos, 1); a.equal(jug.historial.length, 3); // no borra nada
jug.valoracion = 75; cerrarTemporada('2026', [jug]); a.equal(jug.temporadas.length, 1); a.equal(jug.temporadas[0].valoracion, 75); // cerrar dos veces no duplica
cerrarTemporada('2027', [jug]); a.equal(jug.temporadas.length, 2);
`;

try {
  eval(codigo + entorno + pruebas);
  console.log('lógica: todas las pruebas OK');
} catch (e) {
  console.error('FALLÓ:', e.message);
  process.exit(1);
}
