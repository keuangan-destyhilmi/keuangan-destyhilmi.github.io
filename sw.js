/* Service worker Catatan Keuangan: cache cangkang aplikasi agar cepat dibuka & bisa dipasang.
   Data transaksi TIDAK pernah di-cache (selalu diambil langsung dari Google Apps Script). */
const CACHE = 'keuangan-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return; // POST ke API tidak disentuh
  const url = new URL(req.url);
  if (url.hostname === 'script.google.com' || url.hostname.endsWith('googleusercontent.com')) return;

  // Halaman utama: coba jaringan dulu (agar update cepat), cadangan dari cache
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('./index.html', copy)); return res; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Aset lain (ikon, Tailwind, Chart.js, font, dll.): tampilkan cache, perbarui di latar belakang
  e.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && (res.status === 200 || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
