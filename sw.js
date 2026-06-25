/* Consolida service worker — network-first no app, cache versionado (offline garantido) */
const CACHE = 'consolida-v3';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './pdf.min.js', './pdf.worker.min.js'];

self.addEventListener('install', e => {
  self.skipWaiting();                       // ativa a versão nova na hora
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(()=>{}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const isAppShell = e.request.mode === 'navigate' ||
                     url.pathname.endsWith('/') ||
                     url.pathname.endsWith('index.html');

  if (isAppShell) {
    // network-first: pega o index novo se houver internet; cai pro cache se offline
    e.respondWith(
      fetch(e.request)
        .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)).catch(()=>{}); return res; })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
  } else {
    // demais arquivos (pdf.js, ícones): cache-first é ótimo, são grandes e estáveis
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
        const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)).catch(()=>{});
        return res;
      }))
    );
  }
});
