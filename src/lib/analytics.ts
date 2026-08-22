/**
 * GA4 with Consent Mode v2.
 *
 * No tag is loaded and no cookie is written until the visitor accepts
 * analytics in the consent banner. Set VITE_GA4_MEASUREMENT_ID (G-XXXXXXX)
 * to activate; without it every call here is a no-op.
 */

export const GA_MEASUREMENT_ID: string =
  (import.meta.env.VITE_GA4_MEASUREMENT_ID as string | undefined) ?? "";

export const CONSENT_KEY = "meatlink.consent.v1";
export const CONSENT_EVENT = "meatlink-consent-changed";

export type ConsentChoice = "granted" | "denied";

type GtagFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GtagFn;
  }
}

function gtag(...args: unknown[]) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(args);
}

export function readConsent(): ConsentChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    return raw === "granted" || raw === "denied" ? raw : null;
  } catch {
    return null;
  }
}

export function setConsent(choice: ConsentChoice) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CONSENT_KEY, choice);
  } catch {
    /* storage blocked — consent stays session-only */
  }
  gtag("consent", "update", {
    analytics_storage: choice,
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  if (choice === "granted") loadTag();
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

let tagLoaded = false;

function loadTag() {
  if (tagLoaded || !GA_MEASUREMENT_ID || typeof document === "undefined") return;
  tagLoaded = true;
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(s);
  gtag("js", new Date());
  gtag("config", GA_MEASUREMENT_ID, { send_page_view: false, anonymize_ip: true });
}

/** Call once on mount: sets denied-by-default consent, loads the tag if already accepted. */
export function initAnalytics() {
  if (typeof window === "undefined" || !GA_MEASUREMENT_ID) return;
  gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    wait_for_update: 500,
  });
  if (readConsent() === "granted") {
    gtag("consent", "update", { analytics_storage: "granted" });
    loadTag();
  }
}

export function trackPageView(path: string, title?: string) {
  if (!GA_MEASUREMENT_ID || readConsent() !== "granted") return;
  loadTag();
  gtag("event", "page_view", {
    page_path: path,
    page_location: typeof window !== "undefined" ? window.location.href : undefined,
    page_title: title,
  });
}

export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  if (!GA_MEASUREMENT_ID || readConsent() !== "granted") return;
  loadTag();
  gtag("event", name, params);
}
