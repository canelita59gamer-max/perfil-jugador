/* Arena Sports — service worker
   Guarda la app en el celular para que abra al instante.
   Los datos (Firebase) NUNCA se guardan aquí: siempre van por la red, para que nadie vea cartas viejas. */
var VERSION = 'arena-v3';
var SHELL = [
  './',
  './index.html',
  './escudo-jogo.webp',
  './arena-logo.png',
  './icon-192.png',
  './icon-512.png',
  './manifest.webmanifest'
];
// Las piezas de Firebase y la librería de Excel vienen de otros servidores. Sin ellas guardadas,
// la app no arranca sin señal. Tienen la versión en la dirección, así que nunca cambian.
var EXTERNOS = [
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-check-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];
function esEstaticoExterno(url){
  return (url.hostname === 'www.gstatic.com' && url.pathname.indexOf('/firebasejs/') === 0)
      || url.hostname === 'cdnjs.cloudflare.com'
      || url.hostname === 'fonts.gstatic.com';
}
// Se pide con CORS (no ocupa espacio de más); si el servidor no lo permite, se guarda igual
function traerExterno(u){
  return fetch(u, {mode:'cors', credentials:'omit'}).catch(function(){ return fetch(u, {mode:'no-cors'}); });
}

self.addEventListener('install', function(e){
  // addAll falla entero si un archivo falta; se guarda uno por uno para que eso no rompa la instalación
  e.waitUntil(caches.open(VERSION).then(function(c){
    return Promise.all(SHELL.map(function(u){ return c.add(u).catch(function(){}); }).concat(
      EXTERNOS.map(function(u){
        return traerExterno(u).then(function(r){ if(r && (r.ok || r.type==='opaque')) return c.put(u, r); }).catch(function(){});
      })
    ));
  }).then(function(){ return self.skipWaiting(); }));
});

self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.map(function(k){ return k===VERSION ? null : caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});

self.addEventListener('message', function(e){ if(e.data==='actualizar') self.skipWaiting(); });

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;
  var url;
  try { url = new URL(req.url); } catch(err){ return; }

  // Piezas fijas de otros servidores (Firebase, Excel, letras): primero la copia guardada
  if(esEstaticoExterno(url)){
    e.respondWith(caches.match(req.url).then(function(hit){
      if(hit) return hit;
      return traerExterno(req.url).then(function(res){
        if(res && (res.ok || res.type==='opaque')){
          var copy = res.clone();
          caches.open(VERSION).then(function(c){ c.put(req.url, copy); });
        }
        return res;
      });
    }));
    return;
  }
  // Las letras de Google: primero la red (cambian según el celular) y sin señal, la copia
  if(url.hostname === 'fonts.googleapis.com'){
    e.respondWith(fetch(req).then(function(res){
      var copy = res.clone();
      caches.open(VERSION).then(function(c){ c.put(req.url, copy); });
      return res;
    }).catch(function(){ return caches.match(req.url); }));
    return;
  }
  // Los datos de Firebase y todo lo demás de Google va siempre por la red, sin guardar nada
  if(url.origin !== self.location.origin) return;

  // La página: caché primero (Safari iOS offline), actualiza por atrás cuando hay señal
  if(req.mode === 'navigate'){
    e.respondWith(
      caches.match('./index.html').then(function(cached){
        var netFetch = fetch(req).then(function(res){
          var copy = res.clone();
          caches.open(VERSION).then(function(c){ c.put('./index.html', copy); });
          return res;
        }).catch(function(){ return cached; });
        return cached || netFetch;
      })
    );
    return;
  }

  // Imágenes e íconos: primero la copia guardada, que no cambian
  e.respondWith(
    caches.match(req).then(function(hit){
      if(hit) return hit;
      return fetch(req).then(function(res){
        if(res && res.status===200 && res.type==='basic'){
          var copy = res.clone();
          caches.open(VERSION).then(function(c){ c.put(req, copy); });
        }
        return res;
      });
    })
  );
});

/* ---------- recordatorios ---------- */
self.addEventListener('push', function(e){
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch(err){ try { d = {notification:{title:'Arena Sports', body:e.data.text()}}; } catch(e2){} }
  var n = d.notification || d.data || {};
  var titulo = n.title || 'Arena Sports';
  var opciones = {
    body: n.body || '',
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: (d.data && d.data.tag) || 'arena',
    renotify: true,
    data: { url: (d.data && d.data.url) || (n.click_action) || './' }
  };
  e.waitUntil(self.registration.showNotification(titulo, opciones));
});

self.addEventListener('notificationclick', function(e){
  e.notification.close();
  var destino = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(clients.matchAll({type:'window', includeUncontrolled:true}).then(function(lista){
    for(var i=0;i<lista.length;i++){
      var c = lista[i];
      if(c.url.indexOf(self.location.origin)===0 && 'focus' in c){
        if('navigate' in c) c.navigate(destino);
        return c.focus();
      }
    }
    return clients.openWindow(destino);
  }));
});
