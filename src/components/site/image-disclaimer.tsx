import { ImageIcon } from "lucide-react";
import { useLang } from "@/lib/i18n";

/** Subtle caption shown under every product / grade / insight image. */
export function ImageDisclaimer({ className = "" }: { className?: string }) {
  const { t } = useLang();
  return (
    <p
      className={`inline-flex items-center gap-1.5 text-[11px] italic leading-tight text-ash/80 ${className}`}
    >
      <ImageIcon className="h-3 w-3" aria-hidden="true" />
      {t("image.disclaimer")}
    </p>
  );
}
