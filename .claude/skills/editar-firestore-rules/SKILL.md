---
name: editar-firestore-rules
description: Cómo tocar firestore.rules sin romper el aislamiento entre clubes o los permisos de rol. Úsalo cuando el usuario pida agregar una colección, cambiar quién puede leer/escribir algo, o agregar un campo a un documento existente.
---

# Editar `firestore.rules` con cuidado

Las reglas viven en un solo archivo y se pegan completas en Firebase Console
(Firestore Database → Reglas → Publicar) — **no se despliegan solas con el push
a GitHub**. Después de editar `firestore.rules` en el repo, avisar al usuario
que falta ese paso manual en Firebase Console.

## Jerarquía de roles (no inventar una regla nueva sin ubicarla aquí)

```
creador            → ve y administra TODOS los clubes
  └─ admin (de 1 club)   → isAdminOf(club): administra su club completo
       └─ profesor (de 1 categoría) → isProfeDe(club, cat): solo su categoría
```

Helpers ya definidos arriba del archivo — reusarlos, no duplicar lógica:
`signedIn()`, `isStaff()`, `isCreador()`, `isAdminOf(club)`, `isProfeDe(club, cat)`,
`clubActivo(club)`, `miClub()`.

## Reglas de oro de este archivo

1. **Todo nuevo match va dentro de `match /clubes/{club}`** si el dato pertenece a
   un club — así hereda el aislamiento multi-tenant automáticamente. Un match fuera
   de ahí es visible/editable global, no por club.
2. **`hasOnly([...])` en cada `allow create/update`** — limita los campos exactos
   que se pueden escribir. Si agregas un campo nuevo a un documento, hay que
   agregarlo a la lista `hasOnly` correspondiente o Firestore rechaza el write.
3. Un club **suspendido** (`estado == 'suspendido'`) debe seguir bloqueando lectura
   pública vía `clubActivo(club)` en cualquier colección nueva que agregues bajo
   ese club, si es contenido que las familias ven.
4. Las colecciones `accesos/{codigo}` (códigos de jugador) y `familias/{tok}`
   tienen `allow list: if false` / `allow read: if false` a propósito — el código
   es la única llave, nunca se debe poder listar o enumerar. No agregar un `list`
   a estas sin preguntar primero, es una decisión de seguridad deliberada.
5. `fichas/{f}` (ficha personal: documento, salud, vivienda, acudiente) es **solo del admin**
   (`isAdminOf(club)`). Ni profesores ni familias. No abrirla a otro rol sin preguntar: son
   datos sensibles de menores (Ley 1581) y la política de privacidad lo promete así.
6. Las colecciones sin prefijo `clubes/{club}` al final del archivo (`/club/{doc}`,
   `/categorias/{cat}`, `/publico/{cat}`, `/fotosJugadores/{f}`, `/appState/{doc}`)
   son la estructura **pre-multi-club**, solo para migración — no agregar
   funcionalidad nueva ahí.

## Al terminar

Las reglas no se suben solas con el push: hay que publicarlas en Firebase Console →
Firestore → Reglas → Publicar. Es el único paso de este proyecto que no es automático.

Si el usuario lo pide y el navegador integrado tiene abierta su sesión de Firebase, se puede
hacer desde ahí:
1. Antes de cambiar nada, comparar lo publicado con `git show HEAD:firestore.rules`. Si
   alguien editó directo en la consola, no pisarlo sin avisar.
2. Aplicar solo el cambio en el editor (CodeMirror: `view.dispatch`), comprobar que el texto
   quedó igual a `firestore.rules`, tocar **Publicar** y recargar para confirmar.
Si no hay sesión, pasarle el archivo al usuario (por ejemplo copiado al portapapeles).

## Lectura de datos del club (desde noviembre de 2026)
Ninguna colección del club se lee sin permiso: usar `puedeVer(club)` (cuerpo técnico del club, familia con
pase válido o Creador). No volver a poner `allow read: if clubActivo(club)`. Toda regla nueva lleva su
comprobación en `tests/reglas.test.js`.
