import { ImageIcon } from "lucide-react";
import { useLang } from "@/lib/i18n";

/** Subtle caption shown under every product / grade / insight image. */
export function ImageDisclaimer({ className = "" }: { className?: string }) {
  const { t } = useLang();
  return (
    <p
      className={`inline-flex items-center gap-1 text-[9px] font-normal italic leading-tight text-ash/60 ${className}`}
    >
      <ImageIcon className="h-2.5 w-2.5" aria-hidden="true" />
      {t("image.disclaimer")}
    </p>
  );
}
