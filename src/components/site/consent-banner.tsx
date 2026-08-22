import { useEffect, useState } from "react";
import {
  CONSENT_EVENT,
  GA_MEASUREMENT_ID,
  initAnalytics,
  readConsent,
  setConsent,
} from "@/lib/analytics";

/** Cookie/analytics consent bar. Renders only when a GA4 ID is configured and no choice was made. */
export function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    initAnalytics();
    if (!GA_MEASUREMENT_ID) return;
    const sync = () => setVisible(readConsent() === null);
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Persetujuan cookie analitik"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-line bg-noir/95 px-5 py-4 backdrop-blur lg:px-8"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-bone/75">
          Kami memakai cookie analitik untuk mengukur kunjungan halaman dan memperbaiki katalog.
          Tidak ada iklan personal. Anda bisa menolak tanpa kehilangan fungsi apa pun.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setConsent("denied")}
            className="border border-line px-4 py-2 text-xs uppercase tracking-widest text-bone/80 transition-colors hover:bg-bone/10"
          >
            Tolak
          </button>
          <button
            type="button"
            onClick={() => setConsent("granted")}
            className="bg-crimson px-4 py-2 text-xs uppercase tracking-widest text-bone transition-opacity hover:opacity-90"
          >
            Terima
          </button>
        </div>
      </div>
    </div>
  );
}
