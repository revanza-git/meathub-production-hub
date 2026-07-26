// Guarded service-worker registration wrapper.
// Follows the Lovable PWA skill:
// - never register in dev, preview, iframe, or with ?sw=off
// - support ?sw=off kill switch to unregister
// - only registers the generated /sw.js (from vite-plugin-pwa `generateSW`)
//   which we currently do NOT enable — leaving this wrapper ready for offline
//   support once the user opts in via `VITE_ENABLE_PWA=1` at build time.

const SW_PATH = "/sw.js";

function isPreviewHost(host: string): boolean {
  if (host === "lovableproject.com" || host.endsWith(".lovableproject.com")) return true;
  if (host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com")) return true;
  if (host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev")) return true;
  if (host.startsWith("id-preview--") || host.startsWith("preview--")) return true;
  return false;
}

async function unregisterAppSw() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(
      regs
        .filter((r) => r.active?.scriptURL.endsWith(SW_PATH) || r.installing?.scriptURL.endsWith(SW_PATH))
        .map((r) => r.unregister()),
    );
  } catch {
    /* ignore */
  }
}

export async function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const url = new URL(window.location.href);
  const inIframe = window.self !== window.top;
  const refused =
    !import.meta.env.PROD ||
    inIframe ||
    isPreviewHost(window.location.hostname) ||
    url.searchParams.get("sw") === "off";

  if (refused) {
    await unregisterAppSw();
    return;
  }

  // Only try to register if the build produced /sw.js
  try {
    const head = await fetch(SW_PATH, { method: "HEAD" });
    if (!head.ok) return;
    await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
  } catch {
    /* silently ignore — offline shell is optional */
  }
}
