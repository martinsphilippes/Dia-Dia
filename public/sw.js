// MatchPoint Service Worker — cache inteligente + atualização automática
// Bump CACHE_VERSION a cada release para invalidar caches antigos.
const CACHE_VERSION = "v1";
const STATIC_CACHE = `mp-static-${CACHE_VERSION}`;
const PAGE_CACHE = `mp-pages-${CACHE_VERSION}`;

// Instala já pronto para assumir (skipWaiting) → atualização rápida.
self.addEventListener("install", () => {
  self.skipWaiting();
});

// Ativa: limpa caches de versões anteriores e assume o controle.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([STATIC_CACHE, PAGE_CACHE]);
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

// Permite que a página force a ativação imediata da nova versão.
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

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Só mexe em recursos do próprio domínio (nunca Supabase/APIs externas).
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
