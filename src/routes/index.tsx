import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Truck, ShieldCheck, Snowflake, Store, Clock, BadgeCheck } from "lucide-react";
import { MarketLayout } from "@/components/market/market-layout";
import { ProductCard } from "@/components/market/product-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CATEGORIES, HERO_IMAGE, PRODUCTS, PROMOS, VENDORS } from "@/lib/market/data";
import { useCart } from "@/lib/market/cart";
import { productById } from "@/lib/market/data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MEATHUB — Marketplace Daging Sapi Grosir B2B Nasional" },
      {
        name: "description",
        content:
          "Belanja daging sapi lokal & impor dari vendor terverifikasi. Harga grosir HORECA, cold-chain nasional, pembayaran QRIS/VA, dan pelacakan pesanan multi-vendor.",
      },
      { property: "og:title", content: "MEATHUB — Marketplace Daging Sapi Grosir B2B" },
      {
        property: "og:description",
        content:
          "Marketplace daging sapi B2B: vendor terverifikasi, harga grosir, cold-chain nasional, pelacakan pesanan real-time.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { viewed } = useCart();
  const flash = PRODUCTS.filter((p) => p.flash).slice(0, 4);
  const best = PRODUCTS.filter((p) => p.bestSeller).slice(0, 8);
  const terbaru = [...PRODUCTS].slice(-8).reverse();
  const recent = viewed.map((id) => productById(id)).filter(Boolean).slice(0, 4);

  return (
    <MarketLayout>
      {/* Hero */}
      <section className="border-b border-border bg-maroon text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:items-center">
          <div className="min-w-0">
            <Badge variant="outline" className="border-accent/50 bg-accent/10 text-accent">
              Marketplace B2B · Nasional
            </Badge>
            <h1 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-5xl">
              Daging sapi grosir, langsung dari vendor terverifikasi
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
              Bandingkan harga {PRODUCTS.length}+ produk dari {VENDORS.length} vendor, pesan multi-vendor
              dalam satu keranjang, bayar QRIS atau Virtual Account, dan lacak pengiriman cold-chain
              sampai dapur Anda.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/produk" search={{}}>
                <Button size="lg" variant="secondary" className="gap-2">
                  Mulai belanja <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
              <Link to="/mitra/daftar">
                <Button size="lg" variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white">
                  Jadi vendor
                </Button>
              </Link>
            </div>
            <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { icon: BadgeCheck, label: "Vendor terverifikasi" },
                { icon: Snowflake, label: "Rantai dingin terjaga" },
                { icon: Truck, label: "Cold-chain nasional" },
                { icon: ShieldCheck, label: "Vendor terverifikasi" },
              ].map((f) => (
                <li key={f.label} className="flex items-start gap-2 text-xs text-white/80">
                  <f.icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                  {f.label}
                </li>
              ))}
            </ul>
          </div>
          <div className="overflow-hidden rounded-2xl border border-white/15">
            <img src={HERO_IMAGE} alt="Potongan daging sapi premium siap kirim" className="h-full w-full object-cover" />
          </div>
        </div>
      </section>

      {/* Kategori */}
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-4 flex items-end justify-between gap-3">
          <h2 className="font-display text-xl font-bold text-ink">Belanja per kategori</h2>
          <Link to="/produk" search={{}} className="shrink-0 text-sm text-maroon underline">
            Semua kategori
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7">
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              to="/produk"
              search={{ kategori: c.slug }}
              className="rounded-xl border border-border bg-card p-3 text-center transition-colors hover:border-maroon/40"
            >
              <span className="block text-2xl" aria-hidden="true">{c.icon}</span>
              <span className="mt-1 block text-[11px] font-medium leading-tight text-ink">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Promo */}
      <section className="mx-auto max-w-7xl px-4 pb-8">
        <div className="grid gap-3 md:grid-cols-3">
          {PROMOS.map((p) => (
            <div key={p.id} className="rounded-xl border border-accent/30 bg-accent/10 p-4">
              <h3 className="font-display text-base font-bold text-ink">{p.title}</h3>
              <p className="mt-1 text-xs text-ink-soft">{p.subtitle}</p>
              <Link to="/produk" search={{}}>
                <Button size="sm" variant="outline" className="mt-3">{p.cta}</Button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Flash sale */}
      {flash.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-8">
          <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="truncate font-display text-xl font-bold text-ink">Promo hari ini</h2>
              <Badge className="shrink-0 gap-1 bg-maroon text-white">
                <Clock className="h-3 w-3" aria-hidden="true" /> Berakhir 03:34
              </Badge>
            </div>
            <Link to="/produk" search={{ urut: "termurah" }} className="shrink-0 text-sm text-maroon underline">
              Lihat semua
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {flash.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Best seller */}
      <section className="mx-auto max-w-7xl px-4 pb-8">
        <div className="mb-4 flex items-end justify-between gap-3">
          <h2 className="font-display text-xl font-bold text-ink">Paling laris minggu ini</h2>
          <Link to="/produk" search={{ urut: "terlaris" }} className="shrink-0 text-sm text-maroon underline">
            Lihat semua
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {best.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Vendor pilihan */}
      <section className="border-y border-border bg-card/50">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="font-display text-xl font-bold text-ink">Vendor pilihan</h2>
            <Link to="/produk" search={{}} className="shrink-0 text-sm text-maroon underline">
              Semua vendor
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {VENDORS.map((v) => (
              <Link
                key={v.id}
                to="/toko/$slug"
                params={{ slug: v.slug }}
                className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-maroon/40"
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-maroon/10 font-display text-sm font-bold text-maroon">
                  {v.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="truncate font-semibold text-ink">{v.name}</span>
                    {v.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {v.city} · ⭐ {v.rating.toFixed(1)} · {v.productCount} produk
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-ink-soft">{v.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Produk terbaru */}
      <section className="mx-auto max-w-7xl px-4 py-8">
        <h2 className="mb-4 font-display text-xl font-bold text-ink">Produk terbaru</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {terbaru.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Terakhir dilihat */}
      {recent.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-8">
          <h2 className="mb-4 font-display text-xl font-bold text-ink">Terakhir Anda lihat</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {recent.map((p) => (
              <ProductCard key={p!.id} product={p!} compact />
            ))}
          </div>
        </section>
      )}

      {/* CTA vendor */}
      <section className="mx-auto max-w-7xl px-4 pb-12">
        <div className="grid gap-4 rounded-2xl border border-border bg-maroon p-6 text-white md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
              <Store className="h-6 w-6 shrink-0 text-accent" aria-hidden="true" />
              Punya pasokan daging? Jual di MEATHUB
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-white/80">
              Gratis biaya pendaftaran, komisi transparan 5%, pencairan dana T+3 hari kerja, dan akses ke
              ribuan pembeli HORECA aktif di seluruh Indonesia.
            </p>
          </div>
          <Link to="/mitra/daftar" className="shrink-0">
            <Button size="lg" variant="secondary" className="gap-2">
              Daftar vendor <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
        </div>
      </section>
    </MarketLayout>
  );
}
