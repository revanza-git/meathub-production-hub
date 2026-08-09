import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Star,
  BadgeCheck,
  Heart,
  ShoppingCart,
  Truck,
  ShieldCheck,
  Snowflake,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { MarketLayout } from "@/components/market/market-layout";
import { ProductCard } from "@/components/market/product-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PRODUCTS, REVIEWS, productById, vendorById, categoryBySlug } from "@/lib/market/data";
import { appFeePerKg } from "@/lib/market/pricing";
import { rupiah, beratLabel } from "@/lib/market/format";
import { useCart } from "@/lib/market/cart";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/produk/$id")({
  loader: ({ params }) => {
    const product = productById(params.id);
    if (!product) throw notFound();
    return { name: product.name, description: product.description, image: product.image };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Produk tidak tersedia — MEATHUB" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${loaderData.name} — MEATHUB`;
    return {
      meta: [
        { title },
        { name: "description", content: loaderData.description },
        { property: "og:title", content: title },
        { property: "og:description", content: loaderData.description },
      ],
    };
  },
  component: ProductDetail,
});

function ProductDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const product = productById(id)!;
  const vendor = vendorById(product.vendorId);
  const { add, wishlist, toggleWish, markViewed } = useCart();
  const [variantId, setVariantId] = useState(product.variants[1]?.id ?? product.variants[0].id);
  const [qty, setQty] = useState(product.moq);

  useEffect(() => {
    markViewed(product.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  const variant = product.variants.find((v) => v.id === variantId) ?? product.variants[0];
  const wished = wishlist.includes(product.id);
  const related = PRODUCTS.filter((p) => p.categorySlug === product.categorySlug && p.id !== product.id).slice(0, 4);
  const habis = variant.stock <= 0;

  const specs: [string, string][] = [
    ["Potongan", product.cut],
    ["Grade", product.grade],
    ["Asal", `${product.origin}${product.imported ? " (impor)" : " (lokal)"}`],
    ["Kondisi", product.frozen ? "Beku" : "Chilled / segar"],
    ["Kemasan", product.packaging],
    ["Suhu simpan", product.storageTemp],
    ["Masa simpan", product.shelfLife],
    ["Tanggal produksi", product.productionDate],
    ["Sertifikasi", product.halal ? "Halal MUI" : "—"],
    ["Minimum order", `${product.moq} ${product.unit}`],
  ];

  return (
    <MarketLayout>
      <div className="mx-auto max-w-7xl px-4 py-6">
        <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-maroon">Beranda</Link> /{" "}
          <Link to="/produk" search={{}} className="hover:text-maroon">Katalog</Link> /{" "}
          <Link to="/produk" search={{ kategori: product.categorySlug }} className="hover:text-maroon">
            {categoryBySlug(product.categorySlug)?.name}
          </Link>{" "}
          / <span className="text-ink">{product.name}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-6 md:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
            <div>
              <div className="overflow-hidden rounded-xl border border-border bg-muted">
                <img src={product.image} alt={product.name} className="aspect-square w-full object-cover" />
              </div>
              <div className="mt-2 flex gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-16 w-16 overflow-hidden rounded-lg border border-border">
                    <img src={product.image} alt="" aria-hidden="true" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            </div>

            <div className="min-w-0 space-y-4">
              <div className="flex flex-wrap gap-1.5">
                {product.halal && <Badge className="bg-success/15 text-success" variant="outline">Halal MUI</Badge>}
                {product.imported && <Badge variant="outline">Impor {product.origin}</Badge>}
                {product.frozen && <Badge variant="outline">Frozen</Badge>}
                <Badge variant="outline">Grade {product.grade}</Badge>
              </div>

              <h1 className="font-display text-2xl font-bold leading-tight text-ink sm:text-3xl">
                {product.name}
              </h1>

              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-accent text-accent" aria-hidden="true" />
                  <span className="font-semibold text-ink">{product.rating.toFixed(1)}</span>
                  ({product.reviewCount} ulasan)
                </span>
                <span aria-hidden="true">·</span>
                <span>{product.sold} terjual</span>
                <span aria-hidden="true">·</span>
                <span>Stok {variant.stock}</span>
              </div>

              <div className="rounded-xl bg-maroon/5 p-4">
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="font-display text-3xl font-bold text-maroon">{rupiah(variant.price)}</span>
                  {product.originalPrice && (
                    <span className="text-sm text-muted-foreground line-through">
                      {rupiah(product.originalPrice)}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Harga vendor. App fee MEATHUB {rupiah(appFeePerKg(product))}/kg ditambahkan di keranjang — tanpa PPN terpisah. Minimum order {product.moq} {product.unit}.
                </p>
              </div>

              <div>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Pilih ukuran kemasan
                </h2>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVariantId(v.id)}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                        v.id === variantId
                          ? "border-maroon bg-maroon/5 text-maroon"
                          : "border-border hover:border-maroon/40",
                      )}
                    >
                      <div className="font-semibold">{v.label}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {beratLabel(v.weightGram)} · {rupiah(v.price)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-sm leading-relaxed text-ink-soft">{product.description}</p>

              <div className="grid gap-2 sm:grid-cols-3">
                <InfoChip icon={Truck} text="Cold-chain Jabodetabek" />
                <InfoChip icon={Snowflake} text={product.storageTemp} />
                <InfoChip icon={ShieldCheck} text="Garansi kualitas 2 jam" />
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="mb-3 flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-maroon/10 font-display text-sm font-bold text-maroon">
                  {vendor.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <Link
                    to="/toko/$slug"
                    params={{ slug: vendor.slug }}
                    className="flex items-center gap-1 truncate font-semibold text-ink hover:text-maroon"
                  >
                    {vendor.name}
                    {vendor.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {vendor.city} · ⭐ {vendor.rating.toFixed(1)} · {vendor.responseTime}
                  </div>
                </div>
              </div>

              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Jumlah ({product.unit})
              </label>
              <div className="mb-3 flex items-center gap-2">
                <Button variant="outline" size="icon" aria-label="Kurangi" onClick={() => setQty((q) => Math.max(product.moq, q - 1))}>
                  −
                </Button>
                <input
                  className="h-9 w-20 rounded-md border border-input bg-background text-center text-sm"
                  value={qty}
                  aria-label="Jumlah pesanan"
                  onChange={(e) => setQty(Math.max(product.moq, Number(e.target.value) || product.moq))}
                />
                <Button variant="outline" size="icon" aria-label="Tambah" onClick={() => setQty((q) => q + 1)}>
                  +
                </Button>
              </div>

              <div className="mb-3 flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-display text-lg font-bold text-maroon">{rupiah(variant.price * qty)}</span>
              </div>

              <div className="space-y-2">
                <Button
                  className="w-full gap-2"
                  disabled={habis}
                  onClick={() => {
                    add(product.id, variant.id, qty);
                    toast.success("Ditambahkan ke keranjang");
                  }}
                >
                  <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                  {habis ? "Stok habis" : "Tambah ke keranjang"}
                </Button>
                <Button
                  variant="secondary"
                  className="w-full"
                  disabled={habis}
                  onClick={() => {
                    add(product.id, variant.id, qty);
                    nav({ to: "/checkout" });
                  }}
                >
                  Beli sekarang
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 gap-2" onClick={() => toggleWish(product.id)}>
                    <Heart className={cn("h-4 w-4", wished && "fill-maroon text-maroon")} aria-hidden="true" />
                    Wishlist
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => toast.info("Chat vendor tersedia pada versi berikutnya (demo).")}
                  >
                    <MessageSquare className="h-4 w-4" aria-hidden="true" /> Chat
                  </Button>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <Tabs defaultValue="spesifikasi" className="mt-10">
          <TabsList>
            <TabsTrigger value="spesifikasi">Spesifikasi</TabsTrigger>
            <TabsTrigger value="ulasan">Ulasan ({product.reviewCount})</TabsTrigger>
            <TabsTrigger value="pengiriman">Pengiriman</TabsTrigger>
          </TabsList>

          <TabsContent value="spesifikasi">
            <dl className="grid gap-x-8 gap-y-2 rounded-xl border border-border bg-card p-5 text-sm sm:grid-cols-2">
              {specs.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-border/60 py-1.5">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-right font-medium text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </TabsContent>

          <TabsContent value="ulasan">
            <div className="space-y-3">
              {REVIEWS.map((r) => (
                <div key={r.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-ink">{r.author}</div>
                      <div className="text-xs text-muted-foreground">{r.company}</div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {Array.from({ length: r.rating }).map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-accent text-accent" aria-hidden="true" />
                      ))}
                      <span className="ml-1">{r.date}</span>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-ink-soft">{r.body}</p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="pengiriman">
            <div className="space-y-2 rounded-xl border border-border bg-card p-5 text-sm text-ink-soft">
              <p>Pengiriman cold-chain reguler Jabodetabek 1–2 hari kerja, same day sebelum pukul 21.00.</p>
              <p>Gratis ongkir untuk total pesanan ≥ 20 kg per vendor.</p>
              <p>Produk beku dikirim pada suhu {product.storageTemp} dengan boks berinsulasi dan dry ice.</p>
              <p>Klaim kualitas dapat diajukan maksimal 2 jam setelah barang diterima di lokasi Anda.</p>
            </div>
          </TabsContent>
        </Tabs>

        {related.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-3 font-display text-xl font-bold text-ink">Produk serupa</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </MarketLayout>
  );
}

function InfoChip({ icon: Icon, text }: { icon: typeof Truck; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-ink-soft">
      <Icon className="h-4 w-4 shrink-0 text-maroon" aria-hidden="true" />
      <span className="truncate">{text}</span>
    </div>
  );
}
