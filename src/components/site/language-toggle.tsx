import { Globe } from "lucide-react";
import { useLang, type Lang } from "@/lib/i18n";

const OPTIONS: { value: Lang; label: string }[] = [
  { value: "id", label: "ID" },
  { value: "en", label: "EN" },
];

/** Compact ID / EN switch used in the header utility bar and mobile menu. */
export function LanguageToggle({
  dark = true,
  className = "",
  showIcon = true,
}: {
  dark?: boolean;
  className?: string;
  showIcon?: boolean;
}) {
  const { lang, setLang, t } = useLang();

  return (
    <div
      className={`inline-flex items-center gap-2 ${className}`}
      role="group"
      aria-label={t("lang.label")}
    >
      {showIcon ? (
        <Globe
          className={`h-3.5 w-3.5 ${dark ? "text-bone/60" : "text-ash"}`}
          aria-hidden="true"
        />
      ) : null}
      <div className={`inline-flex border ${dark ? "border-white/20" : "border-ink/20"}`}>
        {OPTIONS.map((o) => {
          const active = lang === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => setLang(o.value)}
              aria-pressed={active}
              lang={o.value}
              className={`px-2.5 py-1 text-[0.7rem] tracking-[0.12em] transition-colors ${
                active
                  ? "bg-crimson text-bone"
                  : dark
                    ? "text-bone/60 hover:text-bone"
                    : "text-ash hover:text-ink"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
