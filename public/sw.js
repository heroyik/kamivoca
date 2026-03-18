const CACHE_VERSION = "kamivoca-v3-0-0-offline-4";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const BASE_PATH = "/kamivoca";
const OFFLINE_ASSET_MANIFEST = `${BASE_PATH}/offline-assets.json`;

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

async function getOfflineAssetUrls() {
  try {
    const response = await fetch(OFFLINE_ASSET_MANIFEST, { cache: "no-store" });
    if (!response.ok) return [];

    const assets = await response.json();
    if (!Array.isArray(assets)) return [];

    return assets.filter((asset) => typeof asset === "string" && asset.startsWith(`${BASE_PATH}/`));
  } catch {
    return [];
  }
}

async function warmShellCache() {
  const cache = await caches.open(SHELL_CACHE);
  const assetUrls = await getOfflineAssetUrls();
  const urlsToCache = Array.from(new Set([...PRECACHE_ROUTES, OFFLINE_ASSET_MANIFEST, ...assetUrls]));
  await cache.addAll(urlsToCache);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      await warmShellCache();
      await self.skipWaiting();
    })(),
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

async function matchShellRoute(pathname) {
  const shellCache = await caches.open(SHELL_CACHE);
  const normalizedPath = pathname.replace(/\/+$/, "") || BASE_PATH;
  const candidates = [
    pathname,
    normalizedPath,
    `${normalizedPath}/`,
    `${normalizedPath}.html`,
  ];

  for (const candidate of candidates) {
    const cached = await shellCache.match(candidate);
    if (cached) return cached;
  }

  return shellCache.match(`${BASE_PATH}/`);
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

async function navigateResponse(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const shellCache = await caches.open(SHELL_CACHE);
      await shellCache.put(request.url, response.clone());
    }
    return response;
  } catch {
    const url = new URL(request.url);
    return matchShellRoute(url.pathname);
  }
}

async function isOfflineReady() {
  const manifestResponse = await caches.match(OFFLINE_ASSET_MANIFEST);
  if (!manifestResponse) return false;

  try {
    const assets = await manifestResponse.json();
    if (!Array.isArray(assets)) return false;

    const checks = [BASE_PATH, `${BASE_PATH}/`, ...assets];
    const matches = await Promise.all(checks.map((url) => caches.match(url)));
    return matches.every(Boolean);
  } catch {
    return false;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(BASE_PATH)) return;

  if (request.mode === "navigate") {
    event.respondWith(navigateResponse(request));
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

self.addEventListener("message", (event) => {
  if (event.data?.type !== "OFFLINE_STATUS") return;

  event.waitUntil(
    (async () => {
      const ready = await isOfflineReady();
      event.ports[0]?.postMessage({ ready });
    })(),
  );
});
