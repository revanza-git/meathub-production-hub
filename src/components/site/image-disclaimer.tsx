import { ImageIcon } from "lucide-react";
import { useLang } from "@/lib/i18n";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type ImageDisclaimerVariant = "inline" | "overlay";

/** Shared class strings — exported so snapshot tests catch accidental size drift. */
export const IMAGE_DISCLAIMER_CLASSES: Record<ImageDisclaimerVariant, string> = {
  inline:
    "inline-flex items-center gap-1 text-[8px] sm:text-[9px] font-normal italic leading-none text-ash/50",
  overlay:
    "inline-flex items-center gap-1 rounded bg-background/50 px-1 py-0.5 sm:px-1.5 sm:py-1 text-[8px] sm:text-[9px] font-normal italic leading-none text-ash/50",
};

export const IMAGE_DISCLAIMER_ICON_CLASS = "h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0";

/** Subtle caption shown under/over every product, grade and insight image. */
export function ImageDisclaimer({
  className = "",
  variant = "inline",
}: {
  className?: string;
  variant?: ImageDisclaimerVariant;
}) {
  const { t } = useLang();
  const label = t("image.disclaimer");

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <p
            tabIndex={0}
            aria-label={label}
            className={`${IMAGE_DISCLAIMER_CLASSES[variant]} ${className}`}
          >
            <ImageIcon className={IMAGE_DISCLAIMER_ICON_CLASS} aria-hidden="true" />
            {label}
          </p>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-[11px] leading-snug">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
