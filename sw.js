// MainStage Athletes — minimal shell service worker.
// Network-first for everything it touches; never caches /api/* or non-GET.
// IndexedDB remains the only source of truth for session data.
const CACHE = 'mainstage-shell-v5';
const SHELL = [
  '/', '/index.html', '/snaprecruit.html', '/submissions.html', '/media.html',
  '/athletes.html', '/pw-athletes.html',
  '/js/snaprecruit-core.mjs',
  '/css/tokens.css', '/css/fonts.css',
  '/fonts/archivo-800.woff2', '/fonts/inter-400.woff2', '/fonts/inter-500.woff2',
  '/fonts/inter-600.woff2', '/fonts/inter-700.woff2',
  '/fonts/ibmplexmono-400.woff2', '/fonts/ibmplexmono-500.woff2',
  '/manifest.webmanifest',
  '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-512-maskable.png',
  '/icons/mainstage-mark-256.png', '/apple-touch-icon.png'
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
      const cacheable = SHELL.includes(url.pathname)
        || url.pathname.startsWith('/snaprecruit')
        || url.pathname.startsWith('/submissions')
        || url.pathname.startsWith('/media')
        || url.pathname.startsWith('/pw-athletes')
        || url.pathname.startsWith('/athletes');
      if (res.ok && cacheable) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(async () => {
      const hit = await caches.match(e.request);
      if (hit) return hit;
      if (e.request.mode === 'navigate') {
        const p = url.pathname;
        const shell = p.startsWith('/snaprecruit') ? await caches.match('/snaprecruit.html')
          : p.startsWith('/submissions') ? await caches.match('/submissions.html')
          : p.startsWith('/media') ? await caches.match('/media.html')
          : p.startsWith('/pw-athletes') ? await caches.match('/pw-athletes.html')
          : p.startsWith('/athletes') ? await caches.match('/athletes.html')
          : await caches.match('/index.html');
        if (shell) return shell;
      }
      return Response.error();
    })
  );
});
