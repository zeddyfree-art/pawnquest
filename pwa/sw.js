// The service worker that lets the installed app (and the site) start without a network.
// - Pages: the network first, so a new version arrives as soon as it is published; offline, the last one saved.
// - Everything else of the app (scripts, styles, pieces, boards, music, Stockfish): from the cache at once, refreshed in
//   the background. Each published version gets its own cache, and older ones are removed.
// - Not cached: version.json (how an open tab notices a new version), the Maia models (the app keeps them in its own
//   database) and anything from other sites (Google), which always goes to the network.
// Every path is relative, so it works under /pawnquest/ on GitHub Pages and from any other folder.
const CACHE = 'pawnquest-__BUILD__';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(['./', './manifest.webmanifest', './icon-192.png', './icon.svg', '__PRECACHE__']))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('pawnquest-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/version.json') || url.pathname.endsWith('.onnx')) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put('./', copy));
          }
          return res;
        })
        // ignoreVary: the server answers with "Vary: Origin", which would otherwise keep cached files from matching.
        .catch(() => caches.match('./', { ignoreVary: true }).then((hit) => hit ?? Response.error())),
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(req, { ignoreVary: true }).then((hit) => {
        const fresh = fetch(req)
          .then((res) => {
            // Only whole answers: music is fetched in ranges (206), which a cache cannot hold.
            if (res.status === 200 && res.type === 'basic') cache.put(req, res.clone()).catch(() => {});
            return res;
          })
          .catch(() => hit ?? Response.error());
        return hit ?? fresh;
      }),
    ),
  );
});
