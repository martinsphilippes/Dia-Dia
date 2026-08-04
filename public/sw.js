// MatchPoint Service Worker — cache inteligente + atualização automática
// Bump CACHE_VERSION a cada release para invalidar caches antigos.
const CACHE_VERSION = "v3";
const STATIC_CACHE = `mp-static-${CACHE_VERSION}`;
const PAGE_CACHE = `mp-pages-${CACHE_VERSION}`;
const IMG_CACHE = `mp-img-${CACHE_VERSION}`;
const IMG_MAX = 80; // teto de imagens em cache

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([STATIC_CACHE, PAGE_CACHE, IMG_CACHE]);
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && res.ok) cache.put(req, res.clone());
  return res;
}

async function networkFirst(req) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (e) {
    const cached = await cache.match(req);
    if (cached) return cached;
    const shell = await cache.match("/inicio");
    if (shell) return shell;
    throw e;
  }
}

// Stale-while-revalidate: responde do cache na hora e atualiza em segundo plano.
async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const network = fetch(req)
    .then((res) => {
      if (res && (res.ok || res.type === "opaque")) {
        cache.put(req, res.clone()).then(() => trimCache(cacheName, IMG_MAX));
      }
      return res;
    })
    .catch(() => null);
  return cached || (await network) || fetch(req);
}

async function trimCache(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= max) return;
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Imagens (avatares/ícones), inclusive do Supabase Storage → stale-while-revalidate.
  if (req.destination === "image") {
    event.respondWith(staleWhileRevalidate(req, IMG_CACHE));
    return;
  }

  // A partir daqui, só recursos do próprio domínio (nunca APIs Supabase).
  if (url.origin !== self.location.origin) return;

  // Assets estáticos e imutáveis do Next + ícones → cache-first (rápido).
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icon-") ||
    url.pathname === "/manifest.webmanifest"
  ) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  // Navegações (páginas) → network-first, com fallback ao cache quando offline.
  if (req.mode === "navigate") {
    event.respondWith(networkFirst(req));
    return;
  }
  // Demais requisições seguem normalmente pela rede.
});
