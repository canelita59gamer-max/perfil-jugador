// Pruebas de firestore.rules contra el emulador. Correr con el emulador encendido:
//   npx firebase-tools emulators:exec --only firestore,auth --project perfil-jugadores "node tests/reglas.test.js"
const assert = require('assert');
const E = require('./emulador');
const M = E.MAESTRA;
let n = 0;
async function es(esperado, promesa, que) {
  const r = await promesa;
  const st = typeof r === 'number' ? r : r.status;
  assert.strictEqual(st, esperado, `${que}: esperaba ${esperado} y dio ${st}`);
  n++;
  return r;
}

(async () => {
  await E.limpiar();
  // ---------- datos de prueba ----------
  await E.poner('staff/creador@t.co', { role: 'creador', modo: 'password' }, M);
  await E.poner('staff/admin@jogo.co', { role: 'admin', club: 'jogo', modo: 'password' }, M);
  await E.poner('staff/profe11@jogo.co', { role: 'profesor', club: 'jogo', categoria: 'Sub-11', modo: 'password' }, M);
  await E.poner('staff/admin@otro.co', { role: 'admin', club: 'otro', modo: 'password' }, M);
  await E.poner('staff/admin@susp.co', { role: 'admin', club: 'susp', modo: 'password' }, M);
  await E.poner('clubes/jogo', { nombre: 'Jogo', estado: 'activo' }, M);
  await E.poner('clubes/otro', { nombre: 'Otro', estado: 'activo' }, M);
  await E.poner('clubes/susp', { nombre: 'Suspendido', estado: 'suspendido' }, M);
  for (const c of ['jogo', 'otro', 'susp']) {
    await E.poner(`clubes/${c}/datos/general`, { categories: ['Sub-11', 'Sub-13'] }, M);
    await E.poner(`clubes/${c}/categorias/Sub-11`, { nombre: 'Sub-11' }, M);
    await E.poner(`clubes/${c}/categorias/Sub-13`, { nombre: 'Sub-13' }, M);
    await E.poner(`clubes/${c}/jugadores/p1`, { id: 'p1', name: 'Uno', categoria: 'Sub-11', cod: 'COD11' }, M);
    await E.poner(`clubes/${c}/jugadores/p2`, { id: 'p2', name: 'Dos', categoria: 'Sub-13', cod: 'COD13' }, M);
    await E.poner(`clubes/${c}/cartas/p1`, { id: 'p1', name: 'Uno', categoria: 'Sub-11' }, M);
    await E.poner(`clubes/${c}/cartas/p2`, { id: 'p2', name: 'Dos', categoria: 'Sub-13' }, M);
    await E.poner(`clubes/${c}/publico/Sub-11`, { nombre: 'Sub-11' }, M);
    await E.poner(`clubes/${c}/fotos/p1`, { data: 'x', categoria: 'Sub-11', actualizada: 1 }, M);
    await E.poner(`clubes/${c}/mensajes/m1`, { categoria: 'Sub-11', texto: 'hola', autor: 'a', creado: 1, enviado: false }, M);
    await E.poner(`clubes/${c}/accesos/COD11`, { jugador: 'p1', categoria: 'Sub-11' }, M);
    await E.poner(`clubes/${c}/fichas/p1`, { jugador: 'p1', categoria: 'Sub-11', valores: {}, actualizado: 1 }, M);
  }
  const creador = await E.entrar('creador@t.co');
  const admin = await E.entrar('admin@jogo.co');
  const profe = await E.entrar('profe11@jogo.co');
  const adminOtro = await E.entrar('admin@otro.co');
  const adminSusp = await E.entrar('admin@susp.co');
  const curioso = await E.entrar('nadie@gmail.com'); // cuenta real pero sin registro de staff
  const familia = await E.entrar();                 // sesión anónima

  // ---------- 1. Sin sesión: solo la lista de clubes y abrir un código que ya se conoce ----------
  await es(200, E.listar('clubes'), 'sin sesión: lista de clubes');
  await es(200, E.leer('clubes/jogo/accesos/COD11'), 'sin sesión: abrir un código conocido');
  await es(403, E.listar('clubes/jogo/accesos'), 'sin sesión: listar códigos');
  for (const col of ['cartas', 'fotos', 'mensajes', 'publico', 'jugadores', 'categorias', 'fichas', 'pases', 'respaldos']) {
    await es(403, E.listar('clubes/jogo/' + col), 'sin sesión: ' + col);
  }
  await es(403, E.leer('clubes/jogo/datos/general'), 'sin sesión: datos generales');

  // ---------- 2. Con sesión pero sin pase ni registro: nada ----------
  for (const t of [familia.token, curioso.token]) {
    await es(403, E.listar('clubes/jogo/cartas', t), 'sin pase: cartas');
    await es(403, E.listar('clubes/jogo/fotos', t), 'sin pase: fotos');
    await es(403, E.leer('clubes/jogo/datos/general', t), 'sin pase: datos generales');
  }

  // ---------- 3. La familia saca su pase con un código válido ----------
  await es(403, E.poner(`clubes/jogo/pases/${familia.uid}`, { codigo: 'INVENTADO', creado: 1 }, familia.token), 'pase con código inventado');
  await es(403, E.poner(`clubes/jogo/pases/${curioso.uid}`, { codigo: 'COD11', creado: 1 }, familia.token), 'pase a nombre de otro');
  await es(403, E.poner(`clubes/jogo/pases/${familia.uid}`, { codigo: 'COD11', creado: 1, extra: 1 }, familia.token), 'pase con campos de más');
  await es(200, E.poner(`clubes/jogo/pases/${familia.uid}`, { codigo: 'COD11', creado: 1 }, familia.token), 'pase con código válido');
  await es(200, E.leer(`clubes/jogo/pases/${familia.uid}`, familia.token), 'la familia lee su pase');
  await es(403, E.leer(`clubes/jogo/pases/${familia.uid}`, curioso.token), 'otro no lee el pase ajeno');
  for (const col of ['cartas', 'fotos', 'mensajes', 'publico']) {
    await es(200, E.listar('clubes/jogo/' + col, familia.token), 'con pase: ' + col);
  }
  await es(200, E.leer('clubes/jogo/datos/general', familia.token), 'con pase: datos generales');
  for (const col of ['jugadores', 'categorias', 'fichas', 'respaldos', 'pases']) {
    await es(403, E.listar('clubes/jogo/' + col, familia.token), 'con pase NO ve lo privado: ' + col);
  }
  await es(403, E.leer('clubes/jogo/jugadores/p1', familia.token), 'con pase NO lee el jugador privado');
  await es(403, E.listar('clubes/otro/cartas', familia.token), 'el pase de un club no sirve en otro');
  await es(403, E.poner('clubes/jogo/cartas/p1', { id: 'p1', name: 'Cambiado', categoria: 'Sub-11' }, familia.token), 'la familia no edita cartas');
  await es(403, E.poner('clubes/jogo/datos/general', { categories: [] }, familia.token), 'la familia no edita el club');
  // un club suspendido no entrega pases
  await es(403, E.poner(`clubes/susp/pases/${familia.uid}`, { codigo: 'COD11', creado: 1 }, familia.token), 'pase en club suspendido');
  // si el club quita el código (sale el jugador), el pase deja de servir
  await E.borrar('clubes/jogo/accesos/COD11', M);
  await es(403, E.listar('clubes/jogo/cartas', familia.token), 'pase con código retirado');
  await E.poner('clubes/jogo/accesos/COD11', { jugador: 'p1', categoria: 'Sub-11' }, M);
  await es(200, E.listar('clubes/jogo/cartas', familia.token), 'pase vuelve a servir si vuelve el código');

  // ---------- 4. Administrador del club ----------
  for (const col of ['cartas', 'fotos', 'mensajes', 'jugadores', 'categorias', 'fichas', 'respaldos']) {
    await es(200, E.listar('clubes/jogo/' + col, admin.token), 'admin: ' + col);
  }
  await es(200, E.poner('clubes/jogo/jugadores/p3', { id: 'p3', name: 'Tres', categoria: 'Sub-13' }, admin.token), 'admin crea jugador');
  await es(200, E.poner('clubes/jogo/cartas/p3', { id: 'p3', name: 'Tres', categoria: 'Sub-13' }, admin.token), 'admin crea carta');
  await es(200, E.poner('clubes/jogo/jugadores/p3', { id: 'p3', name: 'Tres', categoria: 'Sub-11' }, admin.token), 'admin cambia de categoría');
  await es(200, E.poner('clubes/jogo/datos/general', { categories: ['Sub-11', 'Sub-13'], deportes: {} }, admin.token), 'admin edita el club');
  await es(403, E.listar('clubes/otro/jugadores', admin.token), 'admin NO ve jugadores de otro club');
  await es(403, E.listar('clubes/otro/cartas', admin.token), 'admin NO ve cartas de otro club');
  await es(403, E.poner('clubes/jogo', { nombre: 'Hackeado' }, admin.token), 'admin NO edita la ficha del club (solo el Creador)');
  await es(403, E.listar('clubes/jogo/cartas', adminOtro.token), 'admin de otro club NO ve este');

  // ---------- 5. Profesor: solo su categoría ----------
  const mios = await es(200, E.consultar('clubes/jogo', 'jugadores', 'categoria', 'Sub-11', profe.token), 'profe consulta su categoría');
  assert.ok(mios.docs.length >= 1 && mios.docs.every((d) => d.datos.categoria === 'Sub-11'), 'el profe solo recibe su categoría');
  await es(403, E.listar('clubes/jogo/jugadores', profe.token), 'profe NO lista todos los jugadores');
  await es(403, E.consultar('clubes/jogo', 'jugadores', 'categoria', 'Sub-13', profe.token), 'profe NO consulta otra categoría');
  await es(403, E.leer('clubes/jogo/jugadores/p2', profe.token), 'profe NO lee jugador de otra categoría');
  await es(200, E.leer('clubes/jogo/categorias/Sub-11', profe.token), 'profe lee su categoría');
  await es(403, E.leer('clubes/jogo/categorias/Sub-13', profe.token), 'profe NO lee otra categoría');
  await es(200, E.listar('clubes/jogo/cartas', profe.token), 'profe ve las cartas del club');
  await es(200, E.poner('clubes/jogo/jugadores/p4', { id: 'p4', name: 'Cuatro', categoria: 'Sub-11' }, profe.token), 'profe crea jugador en su categoría');
  await es(403, E.poner('clubes/jogo/jugadores/p5', { id: 'p5', name: 'Cinco', categoria: 'Sub-13' }, profe.token), 'profe NO crea en otra categoría');
  await es(200, E.poner('clubes/jogo/jugadores/p1', { id: 'p1', name: 'Uno editado', categoria: 'Sub-11' }, profe.token), 'profe edita su jugador');
  await es(403, E.poner('clubes/jogo/jugadores/p1', { id: 'p1', name: 'Uno', categoria: 'Sub-13' }, profe.token), 'profe NO pasa su jugador a otra categoría');
  await es(403, E.poner('clubes/jogo/jugadores/p2', { id: 'p2', name: 'Robado', categoria: 'Sub-11' }, profe.token), 'profe NO se trae un jugador ajeno');
  await es(403, E.poner('clubes/jogo/cartas/p2', { id: 'p2', name: 'Robado', categoria: 'Sub-11' }, profe.token), 'profe NO edita carta ajena');
  await es(403, E.borrar('clubes/jogo/jugadores/p2', profe.token), 'profe NO borra jugador ajeno');
  await es(200, E.borrar('clubes/jogo/jugadores/p4', profe.token), 'profe borra su jugador');
  await es(403, E.listar('clubes/jogo/fichas', profe.token), 'profe NO ve fichas personales');
  await es(403, E.poner('clubes/jogo/datos/general', { categories: [] }, profe.token), 'profe NO edita el club');
  await es(200, E.poner('clubes/jogo/respaldos/migracion-Sub-11', { cat: 'Sub-11', datos: '{}', creado: 1 }, profe.token), 'profe crea respaldo de migración');
  await es(403, E.poner('clubes/jogo/respaldos/migracion-Sub-11', { cat: 'Sub-11', datos: 'otro', creado: 2 }, profe.token), 'nadie edita un respaldo');
  await es(403, E.leer('clubes/jogo/respaldos/migracion-Sub-11', profe.token), 'profe NO lee respaldos');
  await es(200, E.leer('clubes/jogo/respaldos/migracion-Sub-11', admin.token), 'admin lee respaldos');
  await es(403, E.borrar('clubes/jogo/respaldos/migracion-Sub-11', admin.token), 'nadie borra un respaldo desde la página');

  // ---------- 6. Club suspendido: solo el Creador ----------
  await es(403, E.listar('clubes/susp/cartas', adminSusp.token), 'admin de club suspendido no ve');
  await es(403, E.listar('clubes/susp/jugadores', adminSusp.token), 'admin de club suspendido no ve lo privado');
  await es(200, E.listar('clubes/susp/cartas', creador.token), 'Creador ve club suspendido');

  // ---------- 7. Creador: todo ----------
  for (const c of ['jogo', 'otro']) {
    for (const col of ['cartas', 'jugadores', 'categorias', 'fichas', 'respaldos', 'fotos', 'mensajes']) {
      await es(200, E.listar(`clubes/${c}/${col}`, creador.token), `Creador: ${c}/${col}`);
    }
  }
  await es(200, E.poner('clubes/jogo', { nombre: 'Jogo', estado: 'activo', deportes: ['futbol', 'voleibol'] }, creador.token), 'Creador edita el club');

  console.log(`reglas: ${n} comprobaciones OK`);
})().catch((e) => { console.error('FALLÓ:', e.message); process.exit(1); });
