const CACHE_VERSION = "kamivoca-v2-4-0-offline-1";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const BASE_PATH = "/kamivoca";

const PRECACHE_ROUTES = [
  `${BASE_PATH}/`,
  `${BASE_PATH}`,
  `${BASE_PATH}/quiz/review`,
  `${BASE_PATH}/quiz/unit-1`,
  `${BASE_PATH}/quiz/unit-2`,
  `${BASE_PATH}/quiz/unit-3`,
  `${BASE_PATH}/quiz/unit-4`,
  `${BASE_PATH}/quiz/unit-5`,
  `${BASE_PATH}/quiz/unit-6`,
  `${BASE_PATH}/quiz/unit-7`,
  `${BASE_PATH}/quiz/unit-8`,
  `${BASE_PATH}/quiz/unit-9`,
  `${BASE_PATH}/quiz/unit-10`,
  `${BASE_PATH}/quiz/unit-11`,
  `${BASE_PATH}/quiz/unit-12`,
  `${BASE_PATH}/quiz/unit-13`,
  `${BASE_PATH}/quiz/unit-14`,
  `${BASE_PATH}/quiz/unit-15`,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(async (cache) => {
      await cache.addAll(PRECACHE_ROUTES);
      await self.skipWaiting();
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((cacheName) => !cacheName.startsWith(CACHE_VERSION))
          .map((cacheName) => caches.delete(cacheName)),
      );
      await self.clients.claim();
    })(),
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return caches.match(`${BASE_PATH}/`);
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(BASE_PATH)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  const isStaticAsset =
    url.pathname.includes("/_next/static/") ||
    url.pathname.startsWith(`${BASE_PATH}/images/`) ||
    url.pathname.startsWith(`${BASE_PATH}/sounds/`) ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".jpeg") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".woff2");

  if (isStaticAsset) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});
