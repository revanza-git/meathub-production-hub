import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { BadgeCheck, Star, MapPin, Clock, Package } from "lucide-react";
import { MarketLayout } from "@/components/market/market-layout";
import { ProductCard } from "@/components/market/product-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PRODUCTS, REVIEWS, vendorBySlug } from "@/lib/market/data";

export const Route = createFileRoute("/toko/$slug")({
  loader: ({ params }) => {
    const vendor = vendorBySlug(params.slug);
    if (!vendor) throw notFound();
    return { name: vendor.name, description: vendor.description };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Toko tidak tersedia — MEATHUB" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${loaderData.name} — Vendor MEATHUB`;
    return {
      meta: [
        { title },
        { name: "description", content: loaderData.description },
        { property: "og:title", content: title },
        { property: "og:description", content: loaderData.description },
      ],
    };
  },
  component: StorePage,
});

function StorePage() {
  const { slug } = Route.useParams();
  const vendor = vendorBySlug(slug)!;
  const products = PRODUCTS.filter((p) => p.vendorId === vendor.id);

  return (
    <MarketLayout>
      <div className="bg-maroon text-white">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-white/10 font-display text-xl font-bold">
                {vendor.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h1 className="flex items-center gap-2 truncate font-display text-2xl font-bold">
                  {vendor.name}
                  {vendor.verified && <BadgeCheck className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />}
                </h1>
                <p className="mt-1 text-sm text-white/70">Bergabung sejak {vendor.since}</p>
              </div>
            </div>
            <Button variant="secondary" className="shrink-0">Ikuti toko</Button>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat icon={Star} label="Rating" value={vendor.rating.toFixed(1)} />
            <Stat icon={Package} label="Produk" value={String(vendor.productCount)} />
            <Stat icon={Clock} label="Respons" value={vendor.responseTime} />
            <Stat icon={MapPin} label="Lokasi" value={vendor.city} />
          </dl>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        <p className="max-w-3xl text-sm leading-relaxed text-ink-soft">{vendor.description}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="outline">{vendor.transactions.toLocaleString("id-ID")} transaksi</Badge>
          <Badge variant="outline">Status mitra: {vendor.settlementStatus}</Badge>
          {vendor.verified && <Badge className="bg-success/15 text-success" variant="outline">Terverifikasi</Badge>}
        </div>

        <section className="mt-8">
          <h2 className="mb-3 font-display text-xl font-bold text-ink">Produk toko ({products.length})</h2>
          {products.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada produk aktif.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-10">
          <h2 className="mb-3 font-display text-xl font-bold text-ink">Ulasan pembeli</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {REVIEWS.slice(0, 4).map((r) => (
              <div key={r.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-ink">{r.author}</div>
                    <div className="truncate text-xs text-muted-foreground">{r.company}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    {Array.from({ length: r.rating }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-accent text-accent" aria-hidden="true" />
                    ))}
                  </div>
                </div>
                <p className="mt-2 text-sm text-ink-soft">{r.body}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-8">
          <Link to="/produk" search={{}}>
            <Button variant="outline">Lihat semua vendor & produk</Button>
          </Link>
        </div>
      </div>
    </MarketLayout>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Star; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/10 p-3">
      <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-white/60">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {label}
      </dt>
      <dd className="mt-1 truncate font-display text-lg font-bold">{value}</dd>
    </div>
  );
}
