// Uygulama kabuğunu önbelleğe alır; internet yokken de Poker Okulu açılır.
// Dosyalar değiştiğinde VERSION'ı artır ki telefonlar yeni sürümü alsın.
const VERSION = 'v2';
const CACHE = `poker-${VERSION}`;
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  // Stil
  './css/fonts.css',
  './css/temel.css',
  './css/kart.css',
  './css/masa.css',
  './css/kontroller.css',
  './css/ui.css',
  // Yazı tipleri
  './fonts/fraunces-normal-400-700-latin-ext.woff2',
  './fonts/fraunces-normal-400-700-latin.woff2',
  './fonts/instrument-sans-normal-400-700-latin-ext.woff2',
  './fonts/instrument-sans-normal-400-700-latin.woff2',
  './fonts/jetbrains-mono-latin-ext.woff2',
  './fonts/jetbrains-mono-latin.woff2',
  './fonts/source-serif-4-italic-400-latin-ext.woff2',
  './fonts/source-serif-4-italic-400-latin.woff2',
  './fonts/source-serif-4-normal-400-600-latin-ext.woff2',
  './fonts/source-serif-4-normal-400-600-latin.woff2',
  // Simgeler
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  // Motor
  './js/motor/rng.js',
  './js/motor/kart.js',
  './js/motor/deste.js',
  './js/motor/degerlendirici.js',
  './js/motor/pot.js',
  './js/motor/oyun.js',
  // Analiz
  './js/analiz/outs.js',
  './js/analiz/olasilik.js',
  './js/analiz/sayac.js',
  './js/analiz/koc.js',
  // Botlar
  './js/botlar/bot.js',
  './js/botlar/profiller.js',
  // Dersler
  './js/dersler/mufredat.js',
  './js/dersler/seviye-00.js',
  './js/dersler/seviye-01.js',
  './js/dersler/seviye-02.js',
  './js/dersler/seviye-03.js',
  './js/dersler/seviye-04.js',
  './js/dersler/seviye-05.js',
  './js/dersler/seviye-06.js',
  './js/dersler/seviye-07.js',
  './js/dersler/seviye-08.js',
  './js/dersler/seviye-09.js',
  './js/dersler/seviye-10.js',
  // Arayüz
  './js/ui/uygulama.js',
  './js/ui/masa.js',
  './js/ui/kartlar.js',
  './js/ui/eylemler.js',
  './js/ui/koc.js',
  './js/ui/ders.js',
  './js/ui/harita.js',
  './js/ui/dom.js',
  './js/ui/mantik.js',
  './js/ui/soruUret.js',
  './js/ui/sorular.js',
  './js/ui/sayma.js',
  './js/ui/oturum.js',
  './js/ilerleme.js',
];

self.addEventListener('install', (event) => {
  // Tek bir dosya eksikse bütün kurulum çökmesin (geliştirme sırasında js dosyaları yazılıyor olabilir):
  // her dosya ayrı eklenir, olmayanlar atlanır.
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        Promise.all(
          SHELL.map((url) =>
            cache.add(url).catch(() => {
              /* eksik dosya: sonraki ağ isteğinde önbelleğe girer */
            })
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      // Aynı domainde başka uygulamalar da var (bedirhanoktu.dev, blackjack); yalnızca kendi eski önbelleklerimizi sil
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('poker-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Kapsam dışındaki istekleri (örn. sitenin başka bölümleri) dokunmadan geçir
  if (!url.pathname.startsWith(new URL('./', self.location).pathname)) return;

  // Sayfa: önce ağ (güncel sürüm), yoksa önbellek
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put('./index.html', copy));
          }
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Diğer dosyalar: önbellekten ver, arka planda güncelle
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req);
      const network = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
