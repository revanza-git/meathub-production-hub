import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Building2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { PageHero, SiteLayout } from "@/components/site/site-layout";
import { useBi } from "@/lib/i18n";
import { setShopMode, useShopMode, type ShopMode } from "@/lib/meatlink/shop-mode";

export const Route = createFileRoute("/belanja")({
  component: ShopModePage,
  head: () => ({
    meta: [
      { title: "Pilih Mode Belanja — Meatlink.id" },
      {
        name: "description",
        content:
          "Belanja bulk (B2B) untuk bisnis — loaf, karton hingga tonase — atau belanja ritel untuk kebutuhan pribadi. Satu platform Meatlink.id.",
      },
      { property: "og:title", content: "Pilih Mode Belanja — Meatlink.id" },
      {
        property: "og:description",
        content:
          "Belanja bulk (B2B) untuk bisnis — loaf, karton hingga tonase — atau belanja ritel untuk kebutuhan pribadi.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://meatlink.id/belanja" }],
  }),
});

function ShopModePage() {
  const bi = useBi();
  const navigate = useNavigate();
  const [mode] = useShopMode();

  function choose(next: ShopMode) {
    setShopMode(next);
    toast.success(
      next === "retail"
        ? bi("Mode ritel aktif — menampilkan produk yang bisa dibeli eceran.", "Retail mode on — showing products available for retail.")
        : bi("Mode bulk aktif — menampilkan seluruh katalog B2B.", "Bulk mode on — showing the full B2B catalogue."),
    );
    void navigate({
      to: "/produk",
      search: next === "retail" ? { unit: ["RETAIL"] } : {},
    });
  }

  return (
    <SiteLayout>
      <PageHero
        eyebrow={bi("Mode belanja", "Shopping mode")}
        title={bi(
          "Pilih cara berbelanja Anda.",
          "Choose how you want to shop.",
        )}
        intro={bi(
          "Satu platform, dua cara belanja. Bulk untuk kebutuhan bisnis dalam jumlah besar, ritel untuk kebutuhan pribadi atau sampel produk.",
          "One platform, two ways to shop. Bulk for large business volumes, retail for personal needs or product samples.",
        )}
      />

      <section className="mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-20">
        <div className="grid gap-6 md:grid-cols-2">
          <ModeCard
            active={mode === "bulk"}
            icon={<Building2 className="h-6 w-6" aria-hidden="true" />}
            eyebrow={bi("Untuk bisnis", "For businesses")}
            title={bi("Belanja Bulk", "Bulk Shopping")}
            subtitle="B2B"
            description={bi(
              "Untuk restoran, hotel, katering, dan reseller yang membutuhkan pasokan rutin dalam jumlah besar.",
              "For restaurants, hotels, caterers, and resellers needing regular large-volume supply.",
            )}
            units={[
              bi("Loaf", "Loaf"),
              bi("Karton", "Carton"),
              bi("Tonase", "Ton"),
            ]}
            features={[
              bi("Harga bertingkat per volume pembelian", "Tiered pricing by purchase volume"),
              bi("Term of Payment untuk akun terverifikasi", "Term of Payment for verified accounts"),
              bi("Seluruh katalog tersedia", "Full catalogue available"),
            ]}
            cta={bi("Belanja bulk", "Shop bulk")}
            primary
            onClick={() => choose("bulk")}
          />
          <ModeCard
            active={mode === "retail"}
            icon={<ShoppingBag className="h-6 w-6" aria-hidden="true" />}
            eyebrow={bi("Untuk konsumen", "For consumers")}
            title={bi("Belanja Ritel", "Retail Shopping")}
            subtitle="B2C"
            description={bi(
              "Untuk pembelian pribadi, masak di rumah, atau mencoba sampel produk sebelum belanja dalam jumlah besar.",
              "For personal purchases, home cooking, or sampling a product before committing to bulk.",
            )}
            units={[bi("Ritel (kemasan kecil)", "Retail (small packs)")]}
            features={[
              bi("Kemasan praktis ±500 g – 1 kg", "Practical ±500 g – 1 kg packs"),
              bi("Tanpa minimum order besar", "No large minimum order"),
              bi(
                "Khusus produk bertanda “Ritel” di katalog",
                "Only products tagged “Retail” in the catalogue",
              ),
            ]}
            cta={bi("Belanja ritel", "Shop retail")}
            primary={false}
            onClick={() => choose("retail")}
          />
        </div>

        <p className="mt-8 text-center text-xs text-ash">
          {bi(
            "Pilihan ini tersimpan di perangkat Anda dan bisa diubah kapan saja lewat menu di bagian atas halaman.",
            "Your choice is saved on this device and can be changed anytime from the menu at the top of the page.",
          )}
        </p>
      </section>
    </SiteLayout>
  );
}

function ModeCard({
  active,
  icon,
  eyebrow,
  title,
  subtitle,
  description,
  units,
  features,
  cta,
  primary,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  subtitle: string;
  description: string;
  units: string[];
  features: string[];
  cta: string;
  primary: boolean;
  onClick: () => void;
}) {
  const bi = useBi();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`group flex flex-col border bg-card p-8 text-left transition-colors lg:p-10 ${
        active ? "border-crimson" : "border-line hover:border-crimson/50"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className={`eyebrow ${primary ? "text-crimson" : "text-ash"}`}>{eyebrow}</p>
        <span className={active ? "text-crimson" : "text-ash"}>{icon}</span>
      </div>
      <h2 className="mt-5 font-display text-3xl leading-tight text-ink lg:text-4xl">
        {title} <span className="text-ash">({subtitle})</span>
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-ash">{description}</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {units.map((u) => (
          <span
            key={u}
            className="eyebrow border border-line px-3 py-1.5 text-ink"
          >
            {u}
          </span>
        ))}
      </div>

      <ul className="mt-6 grid gap-2 text-sm text-ash">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 bg-crimson" />
            {f}
          </li>
        ))}
      </ul>

      <span
        className={`eyebrow mt-8 inline-flex w-fit items-center gap-2 px-6 py-4 transition-colors ${
          primary
            ? "bg-crimson text-bone group-hover:bg-crimson-deep"
            : "border border-ink/25 text-ink group-hover:border-ink"
        }`}
      >
        {cta}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
      </span>
      {active ? (
        <span className="mt-3 text-xs uppercase tracking-[0.16em] text-crimson">
          {bi("Mode aktif saat ini", "Currently active")}
        </span>
      ) : null}
    </button>
  );
}
