---
name: reels-perfil-jugador
description: Cómo escribir guiones y planear reels para la cuenta de Perfil de Jugador (no la de Arena Sports). Úsalo cuando el usuario pida un video, reel o guion para promocionar la app entre clubes o para enganchar a familias que ya la usan.
---

# Reels de Perfil de Jugador

Perfil de Jugador tiene **dos públicos distintos en el mismo contenido** — no elegir uno:

1. **Clubes/escuelas que todavía no usan la app** — llevan asistencia en papel o WhatsApp. El gancho es "mira lo que te estás perdiendo", mostrando la app ya funcionando con datos reales.
2. **Familias y jugadores que ya están dentro** (Jogo Bonito hoy) — el gancho es su propio progreso: la carta, la racha, el aviso del profe. Contenido que quieren compartir porque es sobre SU hijo.

Casi todo reel sirve a ambos si muestra la app real en uso — la familia se identifica, el club de afuera ve el producto funcionando.

## Material real disponible (usar siempre que se pueda, nunca inventar pantallas)

- App real: `https://perfil-jugador-wheat.vercel.app/`
- Club demo accesible con código de jugador de prueba (pedir uno nuevo a Juanpa si expira, o crear uno en el panel admin — nombre tipo "Jugador Demo", nunca un jugador real sin confirmación explícita del club)
- Capturar con el navegador del dispositivo (`mcp__remote-devices__Claude_Browser__*`), viewport 540x960 o 1080x1920 — la UI de la app ya es responsive y a ese ancho se ve como teléfono
- **Dato sensible**: nunca mostrar nombre completo + cara de un jugador menor de edad real en contenido público sin que el club lo haya confirmado explícitamente para ese video puntual. La vista "Las mejores del club" expone nombres reales — evitarla salvo confirmación. Las vistas de un jugador demo, o las estadísticas agregadas sin nombres (asistencia %, forma del equipo), son siempre seguras.

## Los cinco bloques (igual que guiones-arena-sports, pero el contenido cambia)

1. **Hook en pantalla** — máx 8 palabras, lo que ve el club o la familia en el segundo 0.
2. **Qué grabar** — qué pantallas de la app mostrar y en qué orden.
3. **Guion hablado** — máx 40 palabras, o "Sin voz, solo música" si es puro screen-recording.
4. **Pie de publicación** — máx dos líneas + llamado a acción ("Escríbenos" para clubes, pregunta para familias) + 3-5 hashtags.
5. **Por qué funciona** — una frase.

## Hooks que funcionan para este producto

- **Comparación de antes/después**: "Así llevábamos la asistencia antes. Así la llevamos ahora."
- **Logro del jugador**: "Mateo subió a plata esta semana" (mostrar la carta subiendo de categoría — altamente compartible por la familia).
- **Dolor del profe/admin**: "¿Cuántas veces has perdido el WhatsApp con la lista de asistencia?"
- **Pregunta directa al club**: "¿Tu escuela todavía anota esto en una libreta?"

## Producción (sin costo extra, todo con lo que ya hay)

1. Capturas reales de la app con el navegador del dispositivo — nunca HTML inventado para simular la UI; si hace falta una pantalla que la app no tiene, se construye aparte y se avisa que es una maqueta, no la app.
2. Ensamblar con ffmpeg: zoompan suave por escena + transiciones `xfade` entre escenas (fade/slide/zoomin — variar, nunca corte seco a negro).
3. Música: lo ideal es un audio de tendencia agregado al publicar desde Instagram/TikTok directamente (mejor calidad y ayuda al alcance). Si se necesita de una vez en el archivo, un beat sintetizado con `aevalsrc` de ffmpeg sirve de placeholder, pero avisar siempre que no es una pista real.
4. Narración: si Juanpa manda una nota de voz, se usa su audio real tal cual (no clonar voz — no hay herramienta para eso aquí). Si manda un guion escrito, armar subtítulos quemados sincronizados a su narración (ElevenLabs `creative_transcribe_audio` da tiempos por palabra para estilo karaoke).
5. El material de trabajo (escenas, capturas, renders) vive en `contenido-videos/` dentro de este repo — está en `.gitignore`, nunca se sube a producción.

## Tablero de pipeline

Hay un tablero compartido: https://claude.ai/artifact/6obaw5JXgpkhVAXQu28ykd — un Kanban (idea → guion → grabación → edición → publicado) con base de datos propia, cuenta (Perfil de Jugador / Arena Sports) por tarjeta. Agregar ahí cada reel nuevo que se planee o entregue con `ArtifactData` (colección `pieces`), en vez de solo mencionarlo en el chat — así el progreso no se pierde entre sesiones. Antes de escribir, leer el tablero (`action: "list"`) para no duplicar una pieza que ya está registrada.
