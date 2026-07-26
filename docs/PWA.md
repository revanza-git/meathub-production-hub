# PWA — Installability & Offline Shell

The app ships **installable** by default and **offline-capable behind an opt-in flag**.

## What's live now

- `public/manifest.webmanifest` — name, colors, `display: "standalone"`, icons.
- `<link rel="manifest">` + `theme-color` + `apple-touch-icon` in the root head.
- `src/lib/pwa-register.ts` — guarded service-worker registrar that:
  - refuses to register in dev, iframe, Lovable preview, or with `?sw=off`;
  - unregisters any stale `/sw.js` in those contexts (kill-switch).

Users can **Add to Home Screen** on iOS and Android today. No cache, no stale-UI risk.

## Enabling the offline app shell

Offline support requires generating `/sw.js` with `vite-plugin-pwa` in `generateSW` mode. Not enabled by default — flip it on when you have a release window to smoke-test the cached shell.

Add to `vite.config.ts`:

```ts
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: { server: { entry: "server" } },
  vite: {
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: null,          // we register from src/lib/pwa-register.ts
        devOptions: { enabled: false },
        filename: "sw.js",
        manifest: false,               // we ship our own manifest.webmanifest
        workbox: {
          navigateFallback: "/",
          navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//],
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: { cacheName: "html", networkTimeoutSeconds: 3 },
            },
            {
              urlPattern: ({ url }) =>
                url.origin === self.location.origin && /\.(js|css|woff2?)$/.test(url.pathname),
              handler: "CacheFirst",
              options: {
                cacheName: "assets",
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
      }),
    ],
  },
});
```

Publish. `pwa-register.ts` then starts registering `/sw.js` on production hosts. Verify in Chrome DevTools → Application → Service Workers; toggle "Offline" and confirm the shell still renders.

## Cleanup — if a bad SW ships

Ship a same-path kill-switch worker (see the built-in PWA skill's `existing-broken-PWA` playbook). Don't just delete the source; returning browsers need a replacement worker at `/sw.js` to evict the old registration.

`?sw=off` on any page also forces immediate unregister — fastest per-user escape hatch during an incident.

## Push notifications

Not implemented. When added, use a dedicated `public/firebase-messaging-sw.js` — it lives outside the app-shell service worker and outside this cleanup scope.
