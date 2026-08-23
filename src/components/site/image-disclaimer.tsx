import { ImageIcon } from "lucide-react";
import { useLang } from "@/lib/i18n";

/** Subtle caption shown under every product / grade / insight image. */
export function ImageDisclaimer({ className = "" }: { className?: string }) {
  const { t } = useLang();
  return (
    <p
      className={`inline-flex items-center gap-1 text-[8px] font-normal italic leading-none text-ash/50 ${className}`}
    >
      <ImageIcon className="h-2 w-2" aria-hidden="true" />
      {t("image.disclaimer")}
    </p>
  );
}
