// يحفظ ملفات البرنامج ليعمل دون إنترنت. غيّر رقم الإصدار عند تحديث أي ملف.
const VERSION = 'g11-v1';
const FILES = ['./', 'index.html', 'style.css', 'app.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png',
  'data/islamic.json', 'data/quran.json', 'data/arabic.json', 'data/english.json',
  'data/physics.json', 'data/chemistry.json', 'data/biology.json', 'data/geology.json'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))));
  self.clients.claim();
});
// الشبكة أولاً (لتصل التحديثات)، وعند انقطاع الإنترنت يُستخدم المحفوظ
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => {
    const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
