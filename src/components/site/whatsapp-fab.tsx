import { MessageCircle } from "lucide-react";
import { waLink } from "@/lib/meatlink/config";
import { useBi } from "@/lib/i18n";

/** Floating WhatsApp shortcut, visible on every public page. */
export function WhatsAppFab() {
  const bi = useBi();
  const label = bi("Chat WhatsApp", "Chat on WhatsApp");

  return (
    <a
      href={waLink(
        bi(
          "Halo Meatlink, saya ingin bertanya soal produk.",
          "Hi Meatlink, I'd like to ask about your products.",
        ),
      )}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={label}
      title={label}
      className="fixed bottom-20 right-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson sm:bottom-6 sm:right-6"
    >
      <MessageCircle className="h-7 w-7" aria-hidden="true" />
    </a>
  );
}
