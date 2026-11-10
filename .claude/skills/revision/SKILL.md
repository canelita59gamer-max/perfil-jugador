---
name: revision
description: Checklist para verificar que Perfil de Jugador sigue funcionando tras un cambio (sintaxis JS, service worker, ids, CSP, móvil, reglas). Úsalo después de editar index.html, sw.js o enviar-avisos.js, o cuando pidan "revisar/optimizar".
---

# Revisión rápida

1. **Sintaxis** — extraer los `<script>` inline de `index.html` a la carpeta temporal y correr
   `node --check` sobre cada uno; también `node --check sw.js` y `node --check enviar-avisos.js`.
2. **IDs** — cada `getElementById` / `querySelector('#x')` debe existir en el HTML o en la
   plantilla que lo genera. (`closeModal` repetido es normal: solo hay un modal abierto a la vez.)
3. **Service worker** — si cambió `index.html` o un archivo del shell, subir `VERSION` en `sw.js`.
4. **CSP** — cualquier recurso de otro dominio debe estar permitido en `vercel.json`.
5. **Móvil** — se usa sobre todo en celular: nada debe desbordar a 360 px de ancho.
6. **Reglas** — si cambia la forma de un documento de Firestore, revisar `firestore.rules`
   (`hasOnly`, `staffKeysOk` y similares).
7. **Deportes** — si se tocan posiciones o características, probar una categoría de fútbol y
   una de voleibol.
8. **Lógica pura** — las funciones sin DOM (posiciones, `splitPositions`, `attrsFor`,
   `formatosDe`…) se pueden probar en Node extrayéndolas del archivo.
9. Informar qué se verificó y qué no (Firebase y push no se pueden probar sin la sesión real).

No eliminar CSS ni funciones por heurística: muchas clases (`t-oro`, `mc-*`, `f2*`) se arman dinámicamente.

## Pruebas automáticas (están en `tests/` y corren solas en GitHub con cada subida)
- `node tests/sintaxis.js` y `node tests/logica.test.js` — sin instalar nada.
- Reglas: con Java instalado, `npx firebase-tools emulators:exec --only firestore,auth --project perfil-jugadores "node tests/reglas.test.js"`.
- Probar en pantalla sin tocar datos reales: encender el emulador, `node tests/sembrar.js`, abrir
  `http://localhost:5173/index.html?emulador#/club-prueba` y revisar con `node tests/ver.js`.
- Si se agrega una función de lógica o una regla, agregar su prueba en el mismo cambio.
- El navegador guarda la versión anterior (service worker): al probar en local, borrar caché o recargar dos veces.
