---
name: mapa-del-codigo
description: Mapa de secciones de index.html (7468 líneas, app de una sola página) para ubicar código sin tener que leer o grepear el archivo completo. Úsalo antes de tocar cualquier parte de la UI, el modelo de datos o el guardado en Firestore.
---

# Mapa de index.html

Todo el front (HTML + CSS + JS) vive en un solo archivo. Para no gastar tokens
releyéndolo completo, usa estas líneas como punto de entrada y lee solo el
rango que necesitas con `Read offset/limit`.

| Línea | Sección |
|---|---|
| 357 | CSS landing premium |
| 1390 | CSS portada del club (estilo FIFA) |
| 1561 | CSS Fase 2: carta especial, sobre, destacados, insignias |
| 2038 | **DATA MODEL** — forma de los datos en memoria |
| 2135 | Plataforma multi-club: `CLUBS`, `clubPath()`, `currentClub()` — colección Firestore `clubes` |
| 2308 | **GUARDADO SEGURO EN FIRESTORE** |
| 2603 | Helpers generales |
| 2673 | Render: chrome (rol + categoría) |
| 2753 | Render: nav |
| 2772 | Render: entrenamiento |
| 3080 | Render: partido del día |
| 3122 | Alineación del partido |
| 3615 | Render: cartas |
| 4035 | Destacados |
| 4121 | Insignias y rachas |
| 4273 | El sobre |
| 4382 | Carta para compartir |
| 4547 | Mensajes del profe al grupo |
| 4896 | Render: perfil de exigencia |
| 5073 | Render: informe trimestral |
| 5242 | **MAIN RENDER** |
| 5503–5609 | Panel del Creador: alta/edición de clubes (botón "Crear club") |
| 5622 | Recordatorios para el profesor |
| 5825 | Instalar como app (PWA) |
| 5899 | Aviso de cookies / política de datos (`#/privacidad`) |
| 5927 | Acceso staff: un solo link para todos los clubes (`#/staff`) |
| 6059 | Página de inicio: clubes y jugadores de la fecha |
| 6514 | Valoración con barra de progreso |
| 6647 | Fotos de jugadores |
| 6703 | Render: plantel y categorías (solo administrador) — incluye alta de categorías (6875), importar (6932), jugadores de la categoría (7050), fotos en lote (7115) |

## Estructura de datos en Firestore (multi-club)

Todo cuelga de `clubes/{clubId}/...` (ver `clubPath()` en línea 2139):

- `clubes/{club}` — doc del club (nombre, colores, estado, cupos). Solo lo crea/edita el **Creador**.
- `clubes/{club}/datos/general` — perfil y categorías del club.
- `clubes/{club}/categorias/{cat}` — todo lo privado de esa categoría (solo admin del club o profe de esa categoría).
- `clubes/{club}/publico/{cat}` — lo que ven las cartas públicas (sin comentarios privados).
- `clubes/{club}/accesos/{codigo}` — el código del jugador ES la dirección del documento; nunca se lista, solo se abre si ya se conoce.
- `clubes/{club}/familias/{token}` — celular del papá amarrado a su jugador; nadie la lee desde la página, solo la tarea automática (`enviar-avisos.js`).
- `clubes/{club}/mensajes/{id}` — mensajes del profe, máx 280 caracteres, los marca "enviado" la tarea automática.
- `clubes/{club}/fotos/{jugador}` — foto en base64, límite 400 KB.
- `staff/{email}` — cuentas de staff: `role` (`creador` | `admin` | `profesor`), `club`, `categoria`, `modo` (método de login).

Roles: **creador** (por encima de todos los clubes) → **admin** de un club → **profesor** de una categoría. La jerarquía está espejada en `firestore.rules`; ver la skill `editar-firestore-rules` antes de tocarla.

## Antes de agregar una fuente externa (script, fuente, API)

`vercel.json` tiene una Content-Security-Policy estricta (`script-src`, `connect-src`,
`font-src`, etc. con dominios exactos). Si agregas un script o llamada a un dominio
nuevo y no está en esa lista, el navegador lo bloquea en silencio — no da error visible
en consola a veces, solo no carga. Revisar/actualizar `vercel.json` es parte del cambio.
