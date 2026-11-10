---
name: mapa-del-codigo
description: Contexto y mapa de Arena Sports · Perfil de Jugador (index.html de ~7700 líneas, app de una sola página con Firebase). Úsalo al empezar cualquier sesión en este repo y antes de tocar la UI, el modelo de datos, el guardado en Firestore, sw.js o enviar-avisos.js.
---

# Perfil de Jugador — contexto y mapa

PWA de un solo archivo para clubes de formación (fútbol y voleibol): cartas de jugador,
entrenamientos, partidos, alineaciones, ficha personal y roles.

## Archivos
- `index.html` — toda la app (CSS en `<style>`, JS en un `<script>` al final). Sin build ni
  framework; JS estilo ES5 (`var`, `function`). No introducir bundlers, módulos ni librerías.
- `sw.js` — service worker: caché del shell, Firebase/Excel offline, notificaciones push.
  Subir `VERSION` cada vez que cambie `index.html` u otro archivo del shell.
- `firestore.rules` — reglas por club/rol (ver skill `editar-firestore-rules`).
- `enviar-avisos.js` + `.github/workflows/avisos.yml` — recordatorios push cada 5 min.
- `vercel.json` (cabeceras y CSP), `.vercelignore` (lo que NO se publica), `manifest.webmanifest` + iconos.

## Reglas de trabajo
- Responder y comentar en español; textos de interfaz en español (es-CO).
- Ediciones puntuales (Edit con el texto exacto), no reescribir el archivo.
- Integrar en las pantallas que ya existen; no crear vistas paralelas.
- No borrar nada que el usuario no haya pedido; lo que sale va a la papelera, no a `rm -rf`.
- Nunca pegar claves, tokens ni URLs firmadas en archivos versionados.
- Al terminar un cambio, correr la skill `revision`.

## Mapa de index.html
Las líneas se mueven con cada cambio: úsalas como punto de partida y confirma con
`grep -n "============ NOMBRE"` (cada sección empieza con un comentario así).

| Línea | Sección |
|---|---|
| 207 | CSS plantel y categorías · 226 ficha personal · 258 alineación (incluye `.pitch.voley`) |
| 372 | CSS landing premium |
| 1405 | CSS portada del club (estilo FIFA) |
| 1576 | CSS Fase 2: carta especial, sobre, destacados, insignias |
| 2053 | **DATA MODEL**: `BASE_ATTRS` (fútbol), `VOLEY_ATTRS`, `DEPORTES` / `sportOf(cat)`, `attrsFor(cat, sport)`, `POSITIONS`, `VOLEY_POSITIONS`, `ALL_POSITIONS`, `normalizePos(raw, sport)`, `DEFAULT_PROFILES` |
| 2203 | Plataforma multi-club: `CLUBS`, `clubPath()`, `currentClub()`, `clubRole()` |
| 2378 | **GUARDADO SEGURO EN FIRESTORE**: `buildDocs`, `syncToFirestore`, `rebuildFromRemote` |
| 2674 | Helpers |
| 2744 | Render: chrome (rol + categoría) · 2824 nav |
| 2843 | Render: entrenamiento |
| 3151 | Render: partido del día |
| 3193 | Alineación del partido: `FORMACIONES` (5/7/8/9/11 fútbol, 6 = voleibol), `formatosDe(cat)` |
| 3699 | Render: cartas |
| 4119 | Destacados · 4205 insignias y rachas · 4357 el sobre · 4466 carta para compartir |
| 4631 | Mensajes del profe al grupo |
| 4983 | Render: perfil de exigencia (selector de deporte en el predeterminado del club) |
| 5169 | Render: informe trimestral |
| 5338 | **MAIN RENDER** |
| 5594 | Panel del Creador: alta y edición de clubes |
| 5718 | Recordatorios para el profesor |
| 5921 | Instalar como app (PWA) |
| 5999 | Política de datos (`PRIV_HTML`, `#/privacidad`) — actualizarla si se piden datos nuevos |
| 6023 | Acceso staff (`#/staff`) |
| 6155 | Página de inicio: clubes y jugadores de la fecha |
| 6610 | Valoración con barra de progreso |
| 6680 | Trimestre y grupos por posición (`GRUPOS_POS`, `GRUPOS_VOLEY`, `gruposDe`) |
| 6755 | Fotos de jugadores |
| 6795 | **Ficha personal** (solo admin): `FICHA_BASE`, `openFicha(p)`, `deleteFicha` |
| 6931 | Render: plantel y categorías — `setCategorySport` (7038), `renderPlantel` (7073) |

## Deportes
Cada categoría es de un deporte: `state.categorySports[cat]` (se guarda como `deportes` en
`datos/general`; sin valor = fútbol). Posiciones, características, formaciones y grupos se
eligen con `sportOf(cat)`. Para cambiar el deporte de una categoría se usa `setCategorySport`.

## Datos en Firestore (todo bajo `clubes/{club}/...`)
- `clubes/{club}` — nombre, colores, estado, cupos. Solo el **Creador**.
- `datos/general` — categorías, deportes y perfil del club. Lo lee el club; lo edita el admin.
- `categorias/{cat}` — lo privado de la categoría (admin o profe de esa categoría).
- `publico/{cat}` — lo que muestran las cartas públicas.
- `fichas/{jugador}` y `fichas/_campos` — ficha personal: **solo el admin**.
- `accesos/{codigo}` — el código del jugador es la dirección; nunca se lista.
- `familias/{token}` — celular del papá; solo lo lee la tarea automática.
- `mensajes/{id}` (máx. 280 caracteres) · `fotos/{jugador}` (base64, < 400 KB).
- `staff/{email}` — `role` (`creador` | `admin` | `profesor`), `club`, `categoria`, `modo`.

Roles: creador > admin de un club > profesor de una categoría. Visitante: solo lectura.
Rutas: `#/<club-id>`, `#/staff`, `#/privacidad`.

## Cambios de noviembre de 2026 (leer antes de tocar datos)
- **Un documento por jugador.** Los jugadores ya NO van dentro de `categorias/{cat}`. Viven en
  `jugadores/{id}` (privado: comentarios, código) y `cartas/{id}` (lo que ve la familia). `categorias/{cat}`
  y `publico/{cat}` solo guardan lo de la categoría y llevan `v:3`. Si un documento de categoría todavía
  trae `players`, es el formato viejo: la app lo migra sola (`migrarV3`) y deja copia en `respaldos/`.
- **Borrados explícitos.** Un jugador solo se borra de la base si pasó por `marcarBorrado(p)`. Nunca
  borrar por diferencia entre el estado y la base.
- **Nada del club es público.** `attachClub()` primero confirma el acceso (`prepararAcceso`) y después
  escucha. La familia entra con sesión anónima y registra `pases/{uid}` con su código.
- **Temporadas:** `cerrarTemporada()` guarda un resumen en `p.temporadas`; no borra historial.
- **Emulador:** `http://localhost:5173/index.html?emulador` habla con el Firebase local, no con el real.
