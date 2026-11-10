// Muestra qué hay en el club de prueba del emulador (para revisar una migración a ojo).
//   node tests/ver.js [club]
const E = require('./emulador');
const club = process.argv[2] || 'club-prueba';
(async () => {
  for (const c of ['categorias', 'publico', 'jugadores', 'cartas', 'respaldos', 'accesos', 'pases']) {
    const r = await E.listar(`clubes/${club}/${c}`, E.MAESTRA);
    console.log(c.padEnd(11), String(r.docs.length).padStart(3), r.docs.map((d) => {
      const x = d.datos;
      if (c === 'categorias' || c === 'publico') return `${d.id}[v=${x.v || '-'} players=${'players' in x ? x.players.length : 'no'}]`;
      if (c === 'jugadores') return `${d.id}:${x.name}/${x.categoria}/hist=${(x.historial || []).length}/cod=${x.cod || '-'}/priv=${(x.historial || []).some((h) => h.comment) ? 'si' : 'no'}`;
      if (c === 'cartas') return `${d.id}:${x.categoria}/hist=${(x.historial || []).length}/cod=${'cod' in x ? 'FUGA' : 'no'}/priv=${(x.historial || []).some((h) => /privado/.test(h.comment || '')) ? 'FUGA' : 'no'}`;
      if (c === 'respaldos') return `${d.id}(${(x.datos || '').length} car.)`;
      return d.id;
    }).join('  '));
  }
})();
