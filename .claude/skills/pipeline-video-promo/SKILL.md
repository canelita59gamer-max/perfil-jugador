---
name: pipeline-video-promo
description: Método técnico exacto (comandos) para producir un reel vertical de Perfil de Jugador o Arena Sports sin herramientas pagas externas — capturas reales de la app + ffmpeg. Úsalo al ejecutar la producción de un video, después de tener el guion (ver skill reels-perfil-jugador o guiones-arena-sports).
---

# Pipeline de producción de video (sin costo extra)

No usar Higgsfield ni ningún generador de video pago — el usuario paga solo su plan de Claude y quiere que la producción salga de ahí. Este método ya está probado y funciona.

## 0. Remotion (motion graphics/animación real por código) — preferir esto cuando aplique

Desde el 1 nov 2026 hay un proyecto Remotion ya scaffoldeado en `/home/claude/video-promo/remotion-project` (equipo de 2 personas = licencia gratuita de Remotion, sin costo — ver `remotion-license` si el equipo crece a 4+). Para esquenas de tipografía cinética, animaciones de verdad (no zoompan estático), gráficos de datos/estadísticas estilo futbol.datoss, o subtítulos sincronizados, usar la skill `remotion-best-practices` (`.claude/skills/remotion-best-practices/`) en vez de armar todo a mano con HTML+Playwright+ffmpeg.

**Fix obligatorio en este contenedor**: `npx remotion render` intenta descargar su propio Chrome Headless Shell desde `remotion.media`, que el proxy de este entorno bloquea. Siempre pasar `--browser-executable` apuntando al Chromium de Playwright ya instalado:

```bash
npx remotion render src/index.ts <CompositionId> out/video.mp4 \
  --browser-executable=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome
```

(la ruta exacta puede cambiar de versión; obtenerla con `node -e "console.log(require('playwright').chromium.executablePath())"` si falla).

Seguir siendo zoompan+ffmpeg (secciones de abajo) para iteración rápida de piezas simples con capturas reales; usar Remotion cuando el video necesite animación de verdad (texto que se mueve con spring, gráficas animadas, transiciones con código) en vez de fotos estáticas con zoom.

## 1. Capturas reales de la app (nunca maquetas inventadas si la app ya tiene esa pantalla)

Con el navegador del dispositivo enlazado (`mcp__remote-devices__Claude_Browser__*`, NO Playwright — Playwright en este contenedor no tiene salida a internet, solo a localhost/archivos locales):

```
Claude_Browser__resize_window  width:540 height:960   (o 1080x1920 directo)
Claude_Browser__navigate       url: <la app real>
Claude_Browser__computer       action: screenshot      (y clicks/scrolls para navegar)
```

Cada screenshot se guarda como blob en `/root/.claude/projects/-home-claude/<session>/tool-results/mcp-remote-devices-blob-*.jpg` — copiarlos con `cp` a una carpeta de trabajo (ej. `/home/claude/video-promo/real/`) antes de usarlos.

Al final, `resize_window preset: "desktop"` para dejar el navegador como estaba.

## 2. Estilo de edición (referencia: cuentas de alto rendimiento analizadas 1 nov 2026)

Analizado contra reels reales de alto engagement (futbol.datoss 31-65k likes sin footage real, solo esquemas tácticos; mani.agenda y genlab.web con mockups de teléfono flotantes; aquihayunporque y mentecompuesta1 con tipografía cinética). Patrones que SÍ hay que aplicar, no opcional:

- **Nunca fondo completo con la captura real.** La captura/mockup va como un recuadro flotante tipo teléfono (bordes redondeados, sombra, notch) centrado sobre un fondo oscuro mínimo (`#06091a` + grid de puntos sutil + glow radial del color de acento). Ver plantilla `s1-phone-mijugador.html` / `s2-phone-stats.html`.
- **Texto kinético, no un párrafo que se desvanece.** Máx 2-4 palabras grandes por pantalla (font-size 100+ en escenas solo texto), con una palabra clave resaltada en el color de acento (`<b>`). Si no hay footage real que mostrar para una idea (ej. antes de tener los videoclips de cancha), la escena puede ser 100% texto sobre fondo oscuro — así lo hace futbol.datoss y funciona mejor que forzar una maqueta.
- **Cortes rápidos, no crossfades largos.** Transiciones `xfade` de 0.2s (no 0.35s), variar tipo (`fade`, `slideleft`, `fadeblack`) — se siente a corte, no a disolución lenta.
- **Un solo color de acento por pieza** (lima `#c1f807` o naranja `#f65334` de la marca) sobre fondo casi negro — nunca mezclar varios acentos ni usar la captura de la app como fondo "ocupado".
- Plantilla de escena solo-texto: `s0-hook-text.html` (hook de apertura, sin imagen, máximo impacto).

## 4. Componer con caption (Playwright SÍ sirve aquí porque es solo renderizar HTML local, sin red)

Por defecto usar el recuadro flotante tipo teléfono sobre fondo oscuro (sección 2), no fondo full-bleed. El full-bleed con scrim de gradiente queda solo como alternativa puntual (ej. una escena "hero" que necesita sentirse más inmersiva). Envolver cada screenshot real en un HTML y volver a capturar con Playwright local:

```js
const { chromium } = require('playwright');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto('file:///ruta/absoluta/escena.html');
await page.screenshot({ path: 'shots/escenaN.jpg', type: 'jpeg', quality: 92 });
```

Si el caption se solapa con texto real de la app en la captura, usar un scrim **sólido** (no solo gradiente) del tamaño suficiente para taparlo del todo — un gradiente que se desvanece a mitad de camino dejará texto real asomando detrás del caption.

## 5. Render de cada escena (zoom sutil tipo Ken Burns)

```
ffmpeg -y -loop 1 -i shots/escenaN.jpg -t <segundos> \
  -vf "scale=1080:1920,zoompan=z='min(zoom+0.0008,1.07)':d=1:s=1080x1920:fps=30,format=yuv420p,fade=t=in:st=0:d=0.3,fade=t=out:st=<dur-0.4>:d=0.4" \
  -r 30 -c:v libx264 -pix_fmt yuv420p out/fN.mp4
```

## 6. Transiciones reales entre escenas (NO concat simple — eso da corte seco)

Usar `xfade` encadenado, duración **0.2s** por defecto (corte rápido tipo reel de alto engagement — 0.35s se siente lento, usarlo solo si una escena concreta pide una disolución más larga). El offset de cada xfade es la duración acumulada del clip combinado hasta ese punto menos la duración de la transición:

```
ffmpeg -i f1.mp4 -i f2.mp4 -i f3.mp4 -i f4.mp4 -i f5.mp4 -filter_complex "
[0:v][1:v]xfade=transition=fade:duration=0.2:offset=<dur1-0.2>[v01];
[v01][2:v]xfade=transition=slideleft:duration=0.2:offset=<...>[v012];
..." -map "[vout]" -r 30 -c:v libx264 -pix_fmt yuv420p silent.mp4
```

Variar el tipo de transición (`fade`, `slideleft`, `zoomin`, `fadeblack`, `wipeup`, etc.) — todas con el mismo tipo se ve monótono. La duración final del video baja: `suma(duraciones) - duración_transición*(n_transiciones)`.

## 7. Audio

- **Mejor opción**: narración real del usuario (nota de voz) + audio de tendencia agregado al publicar desde Instagram/TikTok (mejor calidad, ayuda al algoritmo). Avisar esto siempre.
- **Placeholder si hace falta de una vez en el archivo**, un beat sintetizado (sin librerías, solo expresiones matemáticas):

```
ffmpeg -y -f lavfi -i "aevalsrc=exprs='0.55*sin(2*PI*58*t)*exp(-22*mod(t,0.6)) + 0.12*sin(2*PI*5000*t)*pow(abs(sin(PI*t/0.3)),50)':s=44100:d=<duracion>" \
  -af "afade=t=in:st=0:d=0.4,afade=t=out:st=<duracion-2>:d=2" -c:a pcm_s16le beat.wav
```

Avisar siempre al usuario que es un beat generado, no una canción real con copyright ni licencia — no presentarlo como "listo" sin esa aclaración.

## 8. Mux final

```
ffmpeg -y -i silent.mp4 -i beat.wav -c:v copy -c:a aac -b:a 160k -map 0:v:0 -map 1:a:0 -shortest final.mp4
```

## 9. Subtítulos tipo karaoke (cuando hay narración real)

1. Transcribir con tiempos por palabra: `mcp__ElevenLabs__creative_transcribe_audio` (necesita subir el audio primero vía `creative_create_asset_upload` + PUT + `creative_finalize_asset_upload`).
2. Quemar los subtítulos palabra por palabra con `drawtext` en ffmpeg, usando `enable='between(t,inicio,fin)'` por palabra, con la palabra activa en una caja/color distinto (ver referencia visual guardada en el tablero de contenido si existe).

## Entregar

`SendUserFile` con el `.mp4` final. Nunca asumir que "se ve bien" sin mostrarlo — el usuario siempre pide ver el preview antes de dar por bueno un video.
