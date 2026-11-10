# Perfil de Jugador

App de hojas de vida / cards de jugadores y entrenamientos para clubes de fútbol y voleibol (cada categoría elige su deporte), con ficha personal de cada jugador solo para el admin. Branding de Arena Sports. Sitio estático (`index.html`) + Firebase, deploy en Vercel.

## Skills del proyecto (`.claude/skills/`)
- `mapa-del-codigo` — contexto, reglas de trabajo y mapa de `index.html`. Cargarla al empezar.
- `revision` — checklist después de cada cambio.
- `deploy` — qué se publica solo (Vercel) y qué no (reglas de Firebase).
- `editar-firestore-rules` — cómo tocar las reglas sin romper roles ni clubes.
- `reels-perfil-jugador`, `pipeline-video-promo`, `remotion-best-practices` — videos promocionales.

## Stack
- Frontend: HTML/CSS/JS plano (sin framework), PWA (`manifest.webmanifest`, `sw.js`, iconos)
- Backend/datos: Firebase, proyecto `perfil-jugadores`, usando **Firestore** (no Realtime Database) — los datos ya quedan compartidos en vivo entre dispositivos
- Reglas de acceso a datos: `firestore.rules`
- Deploy: Vercel (`vercel.json`), sitio separado del de arena-sports
- Notificaciones: `enviar-avisos.js`

## Convenciones y preferencias de Juanpa
- Prefiere **ediciones puntuales** sobre archivos existentes en vez de reescribir/releer el archivo completo cada vez — usar Edit con el string exacto a cambiar, no Write salvo que sea necesario reescribir todo.
- Si un cambio es grande o toca un archivo crítico, avisar antes de tocarlo y no modificar nada fuera del alcance pedido.
- Working flow: Claude trabaja directo sobre el repo clonado aquí, hace commit y push; Juanpa sigue viendo/depurando desde su VS Code local y GitHub Desktop (solo necesita hacer "Fetch/Pull" para traer los cambios).

## Este repositorio es público
- No escribir aquí ni en ningún archivo versionado decisiones de negocio, precios, clientes, contactos ni planes. Eso va en `CLAUDE.local.md` (ignorado por git, solo en el computador de Juanpa).
- Se mantiene público a propósito: así las tareas automáticas de GitHub (avisos cada 5 minutos, copias, pruebas) son gratis.
