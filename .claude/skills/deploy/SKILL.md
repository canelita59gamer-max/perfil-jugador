---
name: deploy
description: Cómo se publica Perfil de Jugador (Vercel + Firebase + GitHub Actions) y qué es automático y qué no. Úsalo al hacer commit/push, al tocar vercel.json, .vercelignore o firestore.rules, o antes de decir que un cambio "ya está en producción".
---

# Deploy de Perfil de Jugador

## Automático
- **Vercel** publica `main` en `https://perfil-jugador-wheat.vercel.app` unos minutos después
  de cada push. `/__/auth/*` se reescribe a `perfil-jugadores.firebaseapp.com` (login con Google).
- **Vercel sirve todo el repo como archivos públicos**, menos lo que está en `.vercelignore`
  (`.claude/`, `.github/`, `CLAUDE.md`, `README.md`, `enviar-avisos.js`, `firestore.rules`,
  `contenido-videos/`). Cualquier archivo interno nuevo (notas, scripts, material) va ahí.
- **Recordatorios**: `.github/workflows/avisos.yml` corre `enviar-avisos.js` cada 5 min con el
  secreto `FIREBASE_SERVICE_ACCOUNT` (nunca en el repo).

## Manual — avisar siempre
- **`firestore.rules` no se publica con el push.** Hay que publicarlo en Firebase Console →
  Firestore → Reglas → Publicar (ver `editar-firestore-rules`). Si el navegador integrado ya
  tiene la sesión de Firebase abierta, se puede hacer desde ahí con permiso del usuario.
- Un dominio externo nuevo (script, fuente, API) debe estar en la CSP de `vercel.json`; si no,
  el navegador lo bloquea en silencio.

## Commits
- Solo commitear/pushear cuando el usuario lo pida. Mensajes cortos en español.
- Antes del push: `git fetch`. A veces hay commits hechos desde otro chat o desde VS Code /
  GitHub Desktop; traerlos sin pisar cambios locales del usuario.
- Archivos grandes (videos, .MOV) no van al repo.

## Checklist antes de decir "ya quedó"
1. ¿Se hizo push a `main`? Verificar en la página real (por ejemplo con `curl`) que el cambio llegó.
2. ¿Cambió `index.html`? → `VERSION` de `sw.js` subida, para que los celulares actualicen.
3. ¿Cambió `firestore.rules`? → falta publicarlo en Firebase.
4. ¿Dominio nuevo? → CSP de `vercel.json`.

## Orden cuando cambian reglas y código a la vez
1. Publicar `firestore.rules` en Firebase. 2. Hacer push enseguida. Entre un paso y otro la página vieja
puede fallarle a las familias, así que van seguidos. Las copias de seguridad corren solas cada madrugada
(`respaldo.yml`); restaurar se hace desde la pestaña Actions → "Copia de seguridad".
