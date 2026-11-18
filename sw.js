// يحفظ ملفات البرنامج ليعمل دون إنترنت. غيّر رقم الإصدار عند تحديث أي ملف.
const VERSION = 'g11-v2';
const FILES = ['./', 'index.html', 'style.css', 'app.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png',
  'islamic.json', 'quran.json', 'arabic.json', 'english.json',
  'physics.json', 'chemistry.json', 'biology.json', 'geology.json'];
self.addEventListener('install', e => {
  // يحفظ كل ملف على حدة، فلا يفشل التثبيت إن غاب ملف واحد
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(FILES.map(f => c.add(f).catch(() => null)))));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))));
  self.clients.claim();
});
// الشبكة أولاً (لتصل التحديثات)، وعند انقطاع الإنترنت يُستخدم المحفوظ
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
