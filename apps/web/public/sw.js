// The team dashboard's service worker. Registered by the dashboard with the scope /dashboard, so
// the widget (/embed, /widget.js), the help center (/help) and the chat page (/chat) never pass
// through it. See docs/decisions/0029-installable-dashboard.md.
//
// It does four things and no more:
// - pages: the network, always; a small offline page when there is none. Pages are never kept,
//   because they hold conversations and contacts.
// - static files whose names carry a content hash (Next.js's own and the app icons): kept, and
//   served from the cache, since a hashed file never changes.
// - pushes: shown as notifications, and a click opens the conversation.
// - updates: a new version waits until the page asks it to take over.
// Everything else, the API, Supabase and Realtime among it, is left to the browser.

// The page registers this file as /sw.js?v=<build version>, so each deploy is a new worker that
// waits for the page's go-ahead. Development builds name files without hashes and change them
// on every save, so nothing is kept for them.
const DEVELOPMENT = new URL(self.location.href).searchParams.get("dev") === "1";

const OFFLINE_CACHE = "helpwren-offline-v1";
const STATIC_CACHE = "helpwren-static-v1";
const OFFLINE_URL = "/offline.html";
const STATIC_PREFIXES = ["/help/_assets/_next/static/", "/icons/"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(OFFLINE_CACHE).then((cache) => cache.add(OFFLINE_URL)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith("helpwren-"))
            .filter((name) => name !== OFFLINE_CACHE && name !== STATIC_CACHE)
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") void self.skipWaiting();
});

/** A page: the network, or the offline page when it cannot be reached. */
async function page(request) {
  try {
    return await fetch(request);
  } catch {
    const offline = await caches.match(OFFLINE_URL);
    return offline ?? Response.error();
  }
}

/** A file whose name changes whenever its content does: the cache first, then the network. */
async function hashedFile(request) {
  const cache = await caches.open(STATIC_CACHE);
  const kept = await cache.match(request);
  if (kept) return kept;
  const response = await fetch(request);
  if (response.ok && response.type === "basic") await cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    if (url.pathname === "/dashboard" || url.pathname.startsWith("/dashboard/")) {
      event.respondWith(page(request));
    }
    return;
  }
  if (!DEVELOPMENT && STATIC_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    event.respondWith(hashedFile(request));
  }
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    // Not ours to read: still say something, as browsers require for every push.
  }
  const title = typeof payload.title === "string" ? payload.title : "New message";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: typeof payload.body === "string" ? payload.body : "Open the inbox to read it.",
      tag: typeof payload.tag === "string" ? payload.tag : undefined,
      renotify: typeof payload.tag === "string",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      data: { url: typeof payload.url === "string" ? payload.url : "/dashboard/inbox" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url ?? "/dashboard/inbox", self.location.origin);
  // Only ever somewhere on the dashboard of this install.
  if (target.origin !== self.location.origin || !target.pathname.startsWith("/dashboard")) return;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const dashboard = windows.find((client) => {
        const { pathname } = new URL(client.url);
        return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
      });
      if (dashboard) {
        // The page moves to the conversation itself, keeping what it has already loaded.
        dashboard.postMessage({ type: "OPEN", url: target.pathname + target.search });
        return dashboard.focus();
      }
      return self.clients.openWindow(target.href);
    }),
  );
});
