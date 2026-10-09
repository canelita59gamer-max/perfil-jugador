/* Arena Sports — service worker
   Guarda la app en el celular para que abra al instante.
   Los datos (Firebase) NUNCA se guardan aquí: siempre van por la red, para que nadie vea cartas viejas. */
var VERSION = 'arena-v1';
var SHELL = [
  './',
  './index.html',
  './escudo-jogo.webp',
  './arena-logo.png',
  './icon-192.png',
  './icon-512.png',
  './manifest.webmanifest'
];

self.addEventListener('install', function(e){
  // addAll falla entero si un archivo falta; se guarda uno por uno para que eso no rompa la instalación
  e.waitUntil(caches.open(VERSION).then(function(c){
    return Promise.all(SHELL.map(function(u){ return c.add(u).catch(function(){}); }));
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

  // Todo lo de Firebase y Google va siempre por la red, sin guardar nada
  if(url.origin !== self.location.origin) return;

  // La página: primero la red (para que un cambio se vea de una), y si no hay señal, la copia guardada
  if(req.mode === 'navigate'){
    e.respondWith(
      fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(VERSION).then(function(c){ c.put('./index.html', copy); });
        return res;
      }).catch(function(){
        return caches.match('./index.html').then(function(r){ return r || caches.match('./'); });
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
