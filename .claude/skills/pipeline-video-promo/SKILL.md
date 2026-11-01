---
name: pipeline-video-promo
description: Método técnico exacto (comandos) para producir un reel vertical de Perfil de Jugador o Arena Sports sin herramientas pagas externas — capturas reales de la app + ffmpeg. Úsalo al ejecutar la producción de un video, después de tener el guion (ver skill reels-perfil-jugador o guiones-arena-sports).
---

# Pipeline de producción de video (sin costo extra)

No usar Higgsfield ni ningún generador de video pago — el usuario paga solo su plan de Claude y quiere que la producción salga de ahí. Este método ya está probado y funciona.

## 1. Capturas reales de la app (nunca maquetas inventadas si la app ya tiene esa pantalla)

Con el navegador del dispositivo enlazado (`mcp__remote-devices__Claude_Browser__*`, NO Playwright — Playwright en este contenedor no tiene salida a internet, solo a localhost/archivos locales):

```
Claude_Browser__resize_window  width:540 height:960   (o 1080x1920 directo)
Claude_Browser__navigate       url: <la app real>
Claude_Browser__computer       action: screenshot      (y clicks/scrolls para navegar)
```

Cada screenshot se guarda como blob en `/root/.claude/projects/-home-claude/<session>/tool-results/mcp-remote-devices-blob-*.jpg` — copiarlos con `cp` a una carpeta de trabajo (ej. `/home/claude/video-promo/real/`) antes de usarlos.

Al final, `resize_window preset: "desktop"` para dejar el navegador como estaba.

## 2. Componer con caption (Playwright SÍ sirve aquí porque es solo renderizar HTML local, sin red)

Envolver cada screenshot real en un HTML simple (fondo de imagen full-bleed 1080×1920 + scrim con gradiente + texto del caption) y volver a capturar con Playwright local:

```js
const { chromium } = require('playwright');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto('file:///ruta/absoluta/escena.html');
await page.screenshot({ path: 'shots/escenaN.jpg', type: 'jpeg', quality: 92 });
```

Si el caption se solapa con texto real de la app en la captura, usar un scrim **sólido** (no solo gradiente) del tamaño suficiente para taparlo del todo — un gradiente que se desvanece a mitad de camino dejará texto real asomando detrás del caption.

## 3. Render de cada escena (zoom sutil tipo Ken Burns)

```
ffmpeg -y -loop 1 -i shots/escenaN.jpg -t <segundos> \
  -vf "scale=1080:1920,zoompan=z='min(zoom+0.0008,1.07)':d=1:s=1080x1920:fps=30,format=yuv420p,fade=t=in:st=0:d=0.3,fade=t=out:st=<dur-0.4>:d=0.4" \
  -r 30 -c:v libx264 -pix_fmt yuv420p out/fN.mp4
```

## 4. Transiciones reales entre escenas (NO concat simple — eso da corte seco)

Usar `xfade` encadenado. Con transición de 0.35s, el offset de cada xfade es la duración acumulada del clip combinado hasta ese punto menos 0.35:

```
ffmpeg -i f1.mp4 -i f2.mp4 -i f3.mp4 -i f4.mp4 -i f5.mp4 -filter_complex "
[0:v][1:v]xfade=transition=fade:duration=0.35:offset=<dur1-0.35>[v01];
[v01][2:v]xfade=transition=slideleft:duration=0.35:offset=<...>[v012];
..." -map "[vout]" -r 30 -c:v libx264 -pix_fmt yuv420p silent.mp4
```

Variar el tipo de transición (`fade`, `slideleft`, `zoomin`, `wipeup`, etc.) — todas con el mismo tipo se ve monótono. La duración final del video baja: `suma(duraciones) - 0.35*(n_transiciones)`.

## 5. Audio

- **Mejor opción**: narración real del usuario (nota de voz) + audio de tendencia agregado al publicar desde Instagram/TikTok (mejor calidad, ayuda al algoritmo). Avisar esto siempre.
- **Placeholder si hace falta de una vez en el archivo**, un beat sintetizado (sin librerías, solo expresiones matemáticas):

```
ffmpeg -y -f lavfi -i "aevalsrc=exprs='0.55*sin(2*PI*58*t)*exp(-22*mod(t,0.6)) + 0.12*sin(2*PI*5000*t)*pow(abs(sin(PI*t/0.3)),50)':s=44100:d=<duracion>" \
  -af "afade=t=in:st=0:d=0.4,afade=t=out:st=<duracion-2>:d=2" -c:a pcm_s16le beat.wav
```

Avisar siempre al usuario que es un beat generado, no una canción real con copyright ni licencia — no presentarlo como "listo" sin esa aclaración.

## 6. Mux final

```
ffmpeg -y -i silent.mp4 -i beat.wav -c:v copy -c:a aac -b:a 160k -map 0:v:0 -map 1:a:0 -shortest final.mp4
```

## 7. Subtítulos tipo karaoke (cuando hay narración real)

1. Transcribir con tiempos por palabra: `mcp__ElevenLabs__creative_transcribe_audio` (necesita subir el audio primero vía `creative_create_asset_upload` + PUT + `creative_finalize_asset_upload`).
2. Quemar los subtítulos palabra por palabra con `drawtext` en ffmpeg, usando `enable='between(t,inicio,fin)'` por palabra, con la palabra activa en una caja/color distinto (ver referencia visual guardada en el tablero de contenido si existe).

## Entregar

`SendUserFile` con el `.mp4` final. Nunca asumir que "se ve bien" sin mostrarlo — el usuario siempre pide ver el preview antes de dar por bueno un video.
