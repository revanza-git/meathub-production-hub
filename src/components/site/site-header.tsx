import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, Phone, Search, ShoppingCart, Truck, User, X } from "lucide-react";
import mark from "@/assets/meatlink-mark.png.asset.json";
import { useCart } from "@/lib/meatlink/cart";
import { CATEGORY_PAGES } from "@/lib/meatlink/categories";
import { CONTACT_EMAIL, waLink } from "@/lib/meatlink/config";
import { useShopMode } from "@/lib/meatlink/shop-mode";
import { useBi, useLang, type TKey } from "@/lib/i18n";
import { LanguageToggle } from "./language-toggle";

/** Compact link showing the active shopping mode; opens the mode picker. */
function ModeChip({ dark, onNavigate }: { dark: boolean; onNavigate?: () => void }) {
  const [mode] = useShopMode();
  const bi = useBi();
  const label =
    mode === "retail"
      ? bi("Mode: Ritel", "Mode: Retail")
      : mode === "bulk"
        ? bi("Mode: Bulk", "Mode: Bulk")
        : bi("Pilih mode belanja", "Choose shopping mode");
  return (
    <Link
      to="/belanja"
      onClick={onNavigate}
      className={`eyebrow inline-flex items-center gap-2 whitespace-nowrap border px-3 py-1.5 transition-colors ${
        dark
          ? "border-white/20 text-bone/80 hover:border-bone/50 hover:text-bone"
          : "border-line text-ash hover:border-ink hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );
}

const NAV = [
  { to: "/produk", key: "nav.products" },
  { to: "/promo", key: "nav.promo" },
  { to: "/request-quote", key: "nav.sourcing" },
  { to: "/insights", key: "nav.insights" },
  { to: "/network", key: "nav.network" },
  { to: "/about", key: "nav.about" },
  { to: "/contact", key: "nav.contact" },
] as const satisfies readonly { to: string; key: TKey }[];

export function Wordmark({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <Link to="/" className="flex items-center gap-3" aria-label="Meatlink.id home">
      <img
        src={mark.url}
        alt=""
        width={199}
        height={160}
        className={`h-10 w-auto ${tone === "dark" ? "invert" : ""}`}
      />
      <span className="sr-only">Meatlink.id</span>
      <span aria-hidden="true" className="leading-none">
        <span
          className={`block text-base font-semibold tracking-[0.22em] ${
            tone === "dark" ? "text-bone" : "text-ink"
          }`}
        >
          MEATLINK
          <span className="align-super text-[0.5rem] tracking-normal">.ID</span>
        </span>
        <span
          className={`mt-1.5 block text-[0.5rem] tracking-[0.18em] ${
            tone === "dark" ? "text-bone/55" : "text-ash"
          }`}
        >
          BETTER MEAT | BETTER CONNECTIONS
        </span>
      </span>
    </Link>
  );
}

/** Thin utility strip: coverage, support channels and the active service promise. */
function UtilityBar() {
  const { t } = useLang();
  return (
    <div className="hidden border-b border-white/10 bg-noir text-bone lg:block">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-2 text-[0.7rem] tracking-[0.12em] lg:px-8">
        <p className="inline-flex items-center gap-2 text-bone/70">
          <Truck className="h-3.5 w-3.5 text-crimson" aria-hidden="true" />
          {t("header.coverage")}
        </p>
        <div className="flex items-center gap-6 text-bone/70">
          <a
            href={waLink("Halo Meatlink, saya ingin bertanya soal produk.")}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 transition-colors hover:text-bone"
          >
            <Phone className="h-3.5 w-3.5" aria-hidden="true" />
            WHATSAPP +62 897-8872-745
          </a>
          <a href={`mailto:${CONTACT_EMAIL}`} className="transition-colors hover:text-bone">
            {CONTACT_EMAIL.toUpperCase()}
          </a>
          <LanguageToggle dark />
        </div>
      </div>
    </div>
  );
}

/** Category menu — the primary way into the catalog, Friboi-style. */
function CategoryMenu({ dark }: { dark: boolean }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className={`eyebrow inline-flex items-center gap-2 border px-4 py-3 transition-colors ${
          dark
            ? "border-white/25 text-bone hover:bg-white/10"
            : "border-ink/20 text-ink hover:bg-ink/5"
        }`}
      >
        <Menu className="h-4 w-4" aria-hidden="true" />
        {t("header.categories")}
        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-50 mt-2 w-64 border border-line bg-background shadow-xl">
          {CATEGORY_PAGES.map((c) => (
            <Link
              key={c.slug}
              to="/kategori/$slug"
              params={{ slug: c.slug }}
              onClick={() => setOpen(false)}
              className="block border-b border-line px-5 py-3 text-sm text-ink transition-colors last:border-b-0 hover:bg-ink/5"
            >
              <span className="block">{c.label}</span>
              <span className="mt-0.5 block text-xs text-ash">{c.tagline}</span>
            </Link>
          ))}
          <Link
            to="/produk"
            onClick={() => setOpen(false)}
            className="eyebrow block bg-ink px-5 py-3 text-bone"
          >
            {t("header.allProducts")}
          </Link>
        </div>
      ) : null}
    </div>
  );
}

/** Catalog search — always visible, routes into the catalog with the query applied. */
export function CatalogSearch({
  dark,
  onSubmitted,
  className = "",
}: {
  dark: boolean;
  onSubmitted?: () => void;
  className?: string;
}) {
  const navigate = useNavigate();
  const { t } = useLang();
  const [q, setQ] = useState("");

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmitted?.();
        void navigate({ to: "/produk", search: q.trim() ? { q: q.trim() } : {} });
      }}
      className={`flex w-full ${className}`}
    >
      <div className="relative flex-1">
        <Search
          className={`pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 ${
            dark ? "text-bone/50" : "text-ash"
          }`}
          aria-hidden="true"
        />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label={t("header.searchLabel")}
          placeholder={t("header.searchPlaceholder")}
          className={`w-full border py-3 pl-11 pr-4 text-sm outline-none transition-colors ${
            dark
              ? "border-white/20 bg-white/5 text-bone placeholder:text-bone/40 focus:border-bone/60"
              : "border-line bg-background text-ink placeholder:text-ash focus:border-ink"
          }`}
        />
      </div>
      <button
        type="submit"
        className="eyebrow bg-crimson px-6 py-3 text-bone transition-colors hover:bg-crimson-deep"
      >
        {t("header.search")}
      </button>
    </form>
  );
}

export function SiteHeader({ tone = "dark" }: { tone?: "light" | "dark" }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const dark = tone === "dark";
  const { count } = useCart();

  return (
    <header className="sticky top-0 z-50">
      <UtilityBar />

      <div
        className={`border-b ${
          dark ? "border-white/10 bg-noir/95 backdrop-blur" : "border-line bg-bone/95 backdrop-blur"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-5 py-4 lg:px-8">
          <Wordmark tone={tone} />

          <div className="hidden flex-1 items-center gap-3 lg:flex">
            <CategoryMenu dark={dark} />
            <CatalogSearch dark={dark} className="max-w-xl" />
          </div>

          <div className="hidden items-center gap-2 lg:flex">
            <Link
              to="/auth"
              className={`eyebrow inline-flex items-center gap-2 px-3 py-3 transition-colors ${
                dark ? "text-bone/80 hover:text-bone" : "text-ash hover:text-ink"
              }`}
            >
              <User className="h-5 w-5" aria-hidden="true" />
              {t("header.account")}
            </Link>
            <Link
              to="/keranjang"
              aria-label={`${t("header.cart")} (${count})`}
              className={`eyebrow relative inline-flex items-center gap-2 px-3 py-3 transition-colors ${
                dark ? "text-bone/80 hover:text-bone" : "text-ash hover:text-ink"
              }`}
            >
              <ShoppingCart className="h-5 w-5" aria-hidden="true" />
              {count > 0 ? (
                <span className="absolute -right-0.5 top-1.5 min-w-4 bg-crimson px-1 text-center text-[0.6rem] leading-4 text-bone">
                  {count}
                </span>
              ) : null}
            </Link>
          </div>

          <div className="ml-auto flex items-center gap-1 lg:hidden">
            <Link
              to="/keranjang"
              aria-label={`${t("header.cart")} (${count})`}
              className={`relative inline-flex h-11 w-11 items-center justify-center ${
                dark ? "text-bone" : "text-ink"
              }`}
            >
              <ShoppingCart className="h-6 w-6" aria-hidden="true" />
              {count > 0 ? (
                <span className="absolute right-1 top-1 min-w-4 bg-crimson px-1 text-center text-[0.6rem] leading-4 text-bone">
                  {count}
                </span>
              ) : null}
            </Link>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? t("header.closeMenu") : t("header.openMenu")}
              aria-expanded={open}
              className={`inline-flex h-11 w-11 items-center justify-center ${dark ? "text-bone" : "text-ink"}`}
            >
              {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

        </div>

        {/* Secondary navigation row */}
        <div className={`hidden border-t lg:block ${dark ? "border-white/10" : "border-line"}`}>
          <nav
            aria-label="Main"
            className="mx-auto flex max-w-7xl items-center gap-6 overflow-x-auto px-5 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:px-8"
          >
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`eyebrow shrink-0 whitespace-nowrap transition-colors ${
                  dark ? "text-bone/75 hover:text-bone" : "text-ash hover:text-ink"
                }`}
                activeProps={{ className: dark ? "text-bone" : "text-ink" }}
              >
                {t(item.key)}
              </Link>
            ))}
            <span className="ml-auto flex shrink-0 items-center gap-3">
              <ModeChip dark={dark} />
              <Link
                to="/supply"
                className={`eyebrow whitespace-nowrap transition-colors ${
                  dark ? "text-bone/55 hover:text-bone" : "text-ash hover:text-ink"
                }`}
              >
                {t("nav.sell")}
              </Link>
            </span>
          </nav>
        </div>
      </div>

      {open ? (
        <div className={`border-b lg:hidden ${dark ? "border-white/10 bg-noir" : "border-line bg-bone"}`}>
          <div className="mx-auto grid max-w-7xl gap-1 px-5 py-4">
            <CatalogSearch dark={dark} onSubmitted={() => setOpen(false)} className="mb-3" />
            <div className="mb-3 flex justify-end">
              <LanguageToggle dark={dark} />
            </div>
            <nav aria-label="Mobile" className="grid gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={`eyebrow py-3 ${dark ? "text-bone/80" : "text-ash"}`}
                >
                  {t(item.key)}
                </Link>
              ))}
            </nav>
            <div className="mt-3 grid gap-2">
              <ModeChip dark={dark} onNavigate={() => setOpen(false)} />
              <Link
                to="/keranjang"
                onClick={() => setOpen(false)}
                className={`eyebrow border px-5 py-3 text-center ${
                  dark ? "border-white/25 text-bone" : "border-ink/25 text-ink"
                }`}
              >
                {t("header.cart")} ({count})
              </Link>
              <Link
                to="/auth"
                onClick={() => setOpen(false)}
                className={`eyebrow border px-5 py-3 text-center ${
                  dark ? "border-white/25 text-bone" : "border-ink/25 text-ink"
                }`}
              >
                {t("header.account")}
              </Link>
              <Link
                to="/produk"
                onClick={() => setOpen(false)}
                className="eyebrow bg-crimson px-5 py-3 text-center text-bone"
              >
                {t("header.shopProducts")}
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
