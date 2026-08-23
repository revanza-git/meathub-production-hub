import { Link } from "@tanstack/react-router";
import { ArrowRight, Mail } from "lucide-react";
import { CONTACT_EMAIL, waLink } from "@/lib/meatlink/config";
import { Wordmark } from "./site-header";
import { useLang } from "@/lib/i18n";

export function SiteFooter() {
  const { t } = useLang();
  return (
    <footer className="bg-noir text-bone">
      <div className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 md:flex-row md:items-center md:justify-between lg:px-8">
          <div className="flex items-start gap-4">
            <Mail className="mt-1 h-6 w-6 text-crimson" aria-hidden="true" />
            <div>
              <p className="font-display text-xl">{t("footer.helpTitle")}</p>
              <p className="mt-1 text-sm text-bone/60">
                {t("footer.helpBody")}
              </p>
            </div>
          </div>
          <Link
            to="/request-quote"
            className="eyebrow inline-flex items-center justify-center gap-2 bg-crimson px-6 py-4 text-bone transition-colors hover:bg-crimson-deep"
          >
            {t("footer.requestQuote")} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <Wordmark tone="dark" />
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-bone/60">
{t("footer.about")}
          </p>
        </div>

        <div>
          <h2 className="eyebrow text-crimson">{t("footer.buyers")}</h2>
          <ul className="mt-4 space-y-2 text-sm text-bone/70">
            <li>
              <Link to="/network" hash="buyers" className="hover:text-bone">
                {t("footer.howSourcing")}
              </Link>
            </li>
            <li>
              <Link to="/request-quote" className="hover:text-bone">
                {t("footer.requestQuoteLink")}
              </Link>
            </li>
            <li>
              <Link to="/insights" className="hover:text-bone">
                {t("footer.marketInsights")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="eyebrow text-crimson">{t("footer.suppliers")}</h2>
          <ul className="mt-4 space-y-2 text-sm text-bone/70">
            <li>
              <Link to="/network" hash="suppliers" className="hover:text-bone">
                {t("footer.whySupply")}
              </Link>
            </li>
            <li>
              <Link to="/supply" className="hover:text-bone">
                {t("footer.supply")}
              </Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-bone">
                {t("footer.aboutUs")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="eyebrow text-crimson">{t("footer.contact")}</h2>
          <ul className="mt-4 space-y-2 text-sm text-bone/70">
            <li>{CONTACT_EMAIL}</li>
            <li>
              <a
                href={waLink("Hi Meatlink, I'd like to talk about sourcing.")}
                target="_blank"
                rel="noreferrer noopener"
                className="hover:text-bone"
              >
                WhatsApp Business
              </a>
            </li>
            <li>Jakarta · Bali · Indonesia</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-xs text-bone/40 lg:px-8">
          <span>© 2026 Meatlink.id — Better Meat | Better Connections</span>
          <span>{t("footer.legal")}</span>
        </div>
      </div>
    </footer>
  );
}
