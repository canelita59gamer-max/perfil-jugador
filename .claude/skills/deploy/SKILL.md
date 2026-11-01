---
name: deploy
description: Qué pasa realmente cuando se hace push a este repo — qué es automático y qué no. Úsalo cuando el usuario pregunte "ya quedó publicado", "cómo subo esto", o antes de decir que un cambio "ya está en producción".
---

# Deploy de Perfil de Jugador

## Automático (no requiere nada manual)

- **Vercel** redeploya solo con cada push a `main` (sitio independiente del de
  arena-sports). Unos minutos después del push ya está en producción.
- **`enviar-avisos.js`** corre solo cada 30 min vía GitHub Actions
  (`.github/workflows/avisos.yml`) — manda recordatorios de entreno/partido por
  push notification (FCM), usando el service account de Firebase guardado como
  secret del repo (`FIREBASE_SERVICE_ACCOUNT`). No se toca a mano salvo que se
  cambie la lógica de avisos.

## Manual — SIEMPRE avisar al usuario cuando aplique

- **`firestore.rules`** no se despliega con el push. Hay que pegarlo completo en
  Firebase Console → Firestore Database → Reglas → Publicar. Ver skill
  `editar-firestore-rules`.
- Un script o dominio externo nuevo puede quedar bloqueado por la
  Content-Security-Policy de `vercel.json` aunque el deploy "funcione" sin error
  — ver skill `mapa-del-codigo`, sección CSP.

## Checklist antes de decir "ya quedó"

1. ¿Tocó solo `index.html` / `enviar-avisos.js` / `sw.js` / assets? → con el push
   a `main` ya está, nada más que hacer.
2. ¿Tocó `firestore.rules`? → falta el paso manual en Firebase Console.
3. ¿Agregó un dominio/script nuevo? → revisar que esté en el CSP de `vercel.json`.
