// MainStage Athletes — minimal shell service worker.
// Network-first for everything it touches; never caches /api/* or non-GET.
// IndexedDB remains the only source of truth for session data.
const CACHE = 'mainstage-shell-v1';
const SHELL = [
  '/', '/index.html', '/snaprecruit.html', '/js/snaprecruit-core.mjs',
  '/manifest.webmanifest', '/ms-icon.svg',
  '/icon-192.png', '/icon-512.png', '/icon-512-maskable.png', '/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/.netlify/')) return;

  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok && (SHELL.includes(url.pathname) || url.pathname.startsWith('/snaprecruit'))) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(async () => {
      const hit = await caches.match(e.request);
      if (hit) return hit;
      if (e.request.mode === 'navigate') {
        const shell = url.pathname.startsWith('/snaprecruit')
          ? await caches.match('/snaprecruit.html')
          : await caches.match('/index.html');
        if (shell) return shell;
      }
      return Response.error();
    })
  );
});
