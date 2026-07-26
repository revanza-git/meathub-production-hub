import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Search,
  ShoppingCart,
  Heart,
  MessageCircle,
  ChevronRight,
  Truck,
  BadgeCheck,
  Package,
  Handshake,
  Sparkles,
  Star,
  Menu,
} from "lucide-react";
import heroMeat from "@/assets/hero-meat.jpg";
import productSlice from "@/assets/product-slice.jpg";
import productRibs from "@/assets/product-ribs.jpg";
import productTenderloin from "@/assets/product-tenderloin.jpg";
import productOxtail from "@/assets/product-oxtail.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MEATHUB — Belanja Daging Premium B2B Online Jabodetabek" },
      {
        name: "description",
        content:
          "MEATHUB: toko daging premium B2B online. Best seller, harga transparan, quote final berdasarkan berat aktual, gratis ongkir min. order tertentu, kirim dari Hub MEATHUB.",
      },
      { property: "og:title", content: "MEATHUB — Belanja Daging Premium B2B Online" },
      {
        property: "og:description",
        content:
          "Belanja daging premium untuk restoran, hotel, dan katering. Halal, higienis, dan pengiriman cold-chain terlacak.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-[#f5f2e6] font-[family-name:var(--font-body-alt)] text-ink">
      {/* Promo bar */}
      <div className="bg-maroon-dark text-warm-white">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2 text-center text-[12px] font-semibold tracking-wide">
          <Sparkles className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
          <span>Super Value Deals — Hemat lebih banyak! · Gratis ongkir min. order 20 kg</span>
        </div>
      </div>

      {/* Header with search + cart */}
      <header className="sticky top-0 z-30 border-b border-line/60 bg-[#f5f2e6]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:gap-6 md:py-4">
          <Link to="/" className="flex shrink-0 items-center gap-3" aria-label="MEATHUB beranda">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-maroon-dark font-headline text-[10px] font-bold tracking-widest text-warm-white shadow-sm md:h-11 md:w-11">
              MH
            </span>
            <div className="hidden leading-tight sm:block">
              <div className="font-[family-name:var(--font-serif)] text-lg font-bold text-maroon-dark md:text-xl">
                MEATHUB
              </div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-ink-soft">
                Meat Hub · B2B
              </div>
            </div>
          </Link>

          {/* Search */}
          <div className="relative flex-1">
            <label htmlFor="search" className="sr-only">
              Cari daging, cut, brand
            </label>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
              aria-hidden="true"
            />
            <input
              id="search"
              type="search"
              placeholder="Cari daging, cut, brand..."
              className="h-11 w-full rounded-full border border-line bg-white pl-10 pr-4 text-sm text-ink placeholder:text-ink-soft focus:border-maroon-dark focus:outline-none focus:ring-2 focus:ring-maroon-dark/20"
            />
          </div>

          <div className="flex shrink-0 items-center gap-1 md:gap-2">
            <Link
              to="/auth"
              search={{ next: "/dashboard" }}
              aria-label="Wishlist"
              className="hidden h-10 w-10 place-items-center rounded-full text-ink-soft transition-colors hover:bg-maroon-dark/5 hover:text-maroon-dark sm:grid"
            >
              <Heart className="h-5 w-5" />
            </Link>
            <Link
              to="/auth"
              search={{ next: "/buyer/cart" }}
              aria-label="Keranjang"
              className="relative grid h-10 w-10 place-items-center rounded-full text-ink-soft transition-colors hover:bg-maroon-dark/5 hover:text-maroon-dark"
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-maroon-dark px-1 text-[10px] font-bold text-warm-white">
                0
              </span>
            </Link>
            <Button
              asChild
              size="sm"
              className="ml-1 hidden bg-maroon-dark text-warm-white hover:bg-maroon md:inline-flex"
            >
              <Link to="/auth">Masuk</Link>
            </Button>
          </div>
        </div>

        {/* Category chip strip */}
        <div className="border-t border-line/60 bg-[#f5f2e6]">
          <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-2 text-sm">
            <button className="flex shrink-0 items-center gap-1.5 rounded-full bg-maroon-dark px-3 py-1.5 text-xs font-semibold text-warm-white">
              <Menu className="h-3.5 w-3.5" aria-hidden="true" />
              Kategori
            </button>
            {NAV_CATEGORIES.map((c) => (
              <a
                key={c}
                href="#produk"
                className="shrink-0 rounded-full border border-transparent px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-maroon-dark/20 hover:bg-white hover:text-maroon-dark"
              >
                {c}
              </a>
            ))}
          </div>
        </div>
      </header>

      <main>
        {/* Hero — ecommerce banner style */}
        <section className="px-4 py-6 md:py-8">
          <div className="mx-auto max-w-7xl">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-maroon-dark via-maroon to-[#3d1010] shadow-[0_25px_60px_-25px_rgba(90,26,26,0.5)]">
              <div className="grid items-center gap-6 lg:grid-cols-2">
                <div className="px-6 py-10 md:px-12 md:py-14 lg:py-16">
                  <span className="inline-flex items-center gap-2 rounded-full bg-gold/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-gold">
                    <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    Halal · Murah · Berkualitas
                  </span>
                  <h1 className="mt-5 font-[family-name:var(--font-serif)] text-4xl leading-[1.05] text-warm-white md:text-5xl lg:text-6xl">
                    Daging Beku &{" "}
                    <em className="italic text-gold">Frozen Food</em> Premium
                  </h1>
                  <p className="mt-4 max-w-md text-sm leading-relaxed text-warm-white/85 md:text-base">
                    MEATHUB — marketplace daging premium B2B untuk restoran, hotel, dan
                    katering. Stok akurat, quote final transparan, kirim cold-chain dari
                    Hub MEATHUB.
                  </p>
                  <div className="mt-7 flex flex-wrap items-center gap-3">
                    <Button
                      asChild
                      size="lg"
                      className="rounded-full bg-gold px-7 py-6 text-sm font-bold text-maroon-dark shadow-lg hover:bg-gold-bright"
                    >
                      <Link to="/auth" search={{ next: "/dashboard" }}>
                        <ShoppingCart className="mr-2 h-4 w-4" aria-hidden="true" />
                        Belanja Sekarang
                      </Link>
                    </Button>
                    <a
                      href="https://wa.me/6281234567890?text=Halo%2C+saya+ingin+memesan."
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-warm-white/40 bg-warm-white/5 px-6 py-3 text-sm font-semibold text-warm-white transition-colors hover:bg-warm-white hover:text-maroon-dark"
                    >
                      <MessageCircle className="h-4 w-4" aria-hidden="true" />
                      Chat WhatsApp
                    </a>
                  </div>
                </div>
                <div className="relative hidden aspect-[5/4] lg:block">
                  <img
                    src={heroMeat}
                    alt="Potongan ribeye premium dengan rempah segar"
                    width={1200}
                    height={900}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-maroon-dark/40" />
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* Best Seller — ecommerce card grid */}
        <section id="best-seller" className="px-4 py-10 md:py-14">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-end justify-between gap-4">
              <div className="flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-gold" aria-hidden="true" />
                <div>
                  <h2 className="font-[family-name:var(--font-serif)] text-2xl font-bold text-ink md:text-3xl">
                    Best Seller
                  </h2>
                  <p className="text-sm text-ink-soft">Produk terlaris pilihan pelanggan</p>
                </div>
              </div>
              <Link
                to="/auth"
                search={{ next: "/dashboard" }}
                className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-maroon-dark hover:underline md:inline-flex"
              >
                Lihat Semua <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
              {BEST_SELLERS.map((p) => (
                <ProductCard key={p.name} product={p} />
              ))}
            </div>
          </div>
        </section>

        {/* Product catalog — grouped by pack size */}
        <section id="produk" className="bg-white px-4 py-12 md:py-16 scroll-mt-24">
          <div className="mx-auto max-w-7xl space-y-12">
            {CATALOG.map((group) => (
              <div key={group.title}>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-maroon-dark">
                      {group.pack}
                    </p>
                    <h3 className="mt-1 font-[family-name:var(--font-serif)] text-2xl font-bold text-ink md:text-3xl">
                      {group.title}
                    </h3>
                  </div>
                  <Link
                    to="/auth"
                    search={{ next: "/dashboard" }}
                    className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-maroon-dark hover:underline md:inline-flex"
                  >
                    Lihat Semua <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
                  {group.items.map((p) => (
                    <ProductCard key={p.name} product={p} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Trust strip — moved below catalog */}
        <section className="bg-ivory px-4 py-12 md:py-16">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-3 md:grid-cols-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="flex items-center gap-3 rounded-xl border border-line bg-white p-4"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-maroon-dark/10 text-maroon-dark">
                  {f.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-ink">{f.title}</p>
                  <p className="truncate text-[11px] text-ink-soft">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA — split persona cards */}
        <section id="kemitraan" className="px-4 py-14 md:py-20 scroll-mt-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 text-center">
              <span className="inline-block rounded-full border border-maroon-dark/20 bg-maroon-dark/5 px-4 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-maroon-dark">
                Kemitraan MEATHUB
              </span>
              <h2 className="mt-4 font-[family-name:var(--font-serif)] text-3xl leading-tight text-ink md:text-5xl">
                Siap standardisasi pengadaan<br className="hidden md:block" /> daging Anda?
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm text-ink-soft md:text-base">
                Pilih jalur yang sesuai. Onboarding gratis, tanpa biaya bulanan — bayar hanya saat transaksi berjalan.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {/* Buyer card */}
              <div className="group relative overflow-hidden rounded-2xl bg-maroon-dark p-8 text-warm-white shadow-[0_25px_60px_-30px_rgba(90,26,26,0.6)] md:p-10">
                <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gold/15 blur-2xl" />
                <div className="relative">
                  <span className="inline-block rounded-full bg-gold/20 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-gold">
                    Untuk Pembeli
                  </span>
                  <h3 className="mt-4 font-[family-name:var(--font-serif)] text-2xl md:text-3xl">
                    Restoran, hotel, katering & retailer
                  </h3>
                  <ul className="mt-6 space-y-3 text-sm text-warm-white/90">
                    {[
                      "Harga final transparan berdasarkan berat aktual",
                      "Multi-vendor terverifikasi dalam satu invoice",
                      "Cold-chain door-to-door se-Jabodetabek",
                      "Term pembayaran fleksibel & rekap pengadaan",
                    ].map((t) => (
                      <li key={t} className="flex items-start gap-2">
                        <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    asChild
                    size="lg"
                    className="mt-8 rounded-full bg-gold px-7 py-6 text-sm font-bold text-maroon-dark hover:bg-gold-bright"
                  >
                    <Link to="/auth" search={{ next: "/dashboard" }}>Daftar sebagai pembeli →</Link>
                  </Button>
                </div>
              </div>

              {/* Vendor card */}
              <div className="group relative overflow-hidden rounded-2xl border border-maroon-dark/15 bg-warm-white p-8 shadow-[0_25px_60px_-30px_rgba(90,26,26,0.25)] md:p-10">
                <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-maroon-dark/5 blur-2xl" />
                <div className="relative">
                  <span className="inline-block rounded-full bg-maroon-dark/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-maroon-dark">
                    Untuk Vendor
                  </span>
                  <h3 className="mt-4 font-[family-name:var(--font-serif)] text-2xl text-ink md:text-3xl">
                    RPH, importir & distributor bersertifikasi
                  </h3>
                  <ul className="mt-6 space-y-3 text-sm text-ink-soft">
                    {[
                      "Akses ribuan pembeli B2B aktif",
                      "Kelola stok, offer & konfirmasi berat real-time",
                      "Settlement T+3 otomatis via Lovable Cloud",
                      "Reputasi & reliability score untuk visibilitas premium",
                    ].map((t) => (
                      <li key={t} className="flex items-start gap-2">
                        <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-maroon-dark" />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="mt-8 rounded-full border-maroon-dark bg-transparent px-7 py-6 text-sm font-bold text-maroon-dark hover:bg-maroon-dark hover:text-warm-white"
                  >
                    <Link to="/auth" search={{ next: "/dashboard" }}>Daftar sebagai vendor →</Link>
                  </Button>
                </div>
              </div>
            </div>

            {/* Reassurance strip */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs text-ink-soft">
              <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-maroon-dark" /> Onboarding &lt; 24 jam</span>
              <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-maroon-dark" /> Tanpa biaya bulanan</span>
              <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-maroon-dark" /> Support dedicated 7 hari</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line/60 bg-[#f5f2e6] py-8 text-center text-xs text-ink-soft">
        <p>© {new Date().getFullYear()} MEATHUB Meat Hub · Jabodetabek B2B Marketplace</p>
      </footer>

      {/* Floating WhatsApp */}
      <a
        href="https://wa.me/6281234567890?text=Halo%2C+saya+ingin+memesan."
        target="_blank"
        rel="noreferrer"
        aria-label="Chat WhatsApp"
        className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105"
      >
        <MessageCircle className="h-6 w-6" aria-hidden="true" />
      </a>
    </div>
  );
}

type Product = {
  name: string;
  price: string;
  oldPrice?: string;
  discount?: number;
  category: string;
  stock: string;
  rating: number;
  reviews: number;
  image: string;
  badge?: "Best Seller" | "Baru" | "Promo";
};

function ProductCard({ product: p }: { product: Product }) {
  return (
    <Link
      to="/auth"
      search={{ next: "/dashboard" }}
      className="group flex flex-col overflow-hidden rounded-xl border border-line bg-white transition-all hover:-translate-y-0.5 hover:border-maroon-dark/30 hover:shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden bg-[#f5f2e6]">
        {p.badge && (
          <span className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-md bg-maroon-dark px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-warm-white shadow-sm">
            <Star className="h-3 w-3 fill-gold text-gold" aria-hidden="true" /> {p.badge}
          </span>
        )}
        {p.discount ? (
          <span className="absolute right-2 top-2 z-10 rounded-md bg-gold px-2 py-1 text-[11px] font-bold text-maroon-dark shadow-sm">
            -{p.discount}%
          </span>
        ) : null}
        <img
          src={p.image}
          alt={p.name}
          width={800}
          height={800}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col p-3 md:p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
          {p.category}
        </p>
        <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-ink group-hover:text-maroon-dark md:text-[15px]">
          {p.name}
        </h3>
        <div className="mt-1 flex items-center gap-1 text-[11px] text-ink-soft">
          <Star className="h-3 w-3 fill-gold text-gold" aria-hidden="true" />
          <span className="font-semibold text-ink">{p.rating.toFixed(1)}</span>
          <span>({p.reviews})</span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-[family-name:var(--font-serif)] text-base font-bold text-maroon-dark md:text-lg">
            {p.price}
          </span>
          {p.oldPrice && (
            <span className="text-xs text-ink-soft line-through">{p.oldPrice}</span>
          )}
        </div>
        <p className="mt-1 text-[11px] text-ink-soft">Stok: {p.stock}</p>
        <button
          type="button"
          className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg border border-maroon-dark bg-white px-3 py-2 text-xs font-bold text-maroon-dark transition-colors group-hover:bg-maroon-dark group-hover:text-warm-white"
        >
          <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />+ Keranjang
        </button>
      </div>
    </Link>
  );
}

const NAV_CATEGORIES = [
  "Semua Produk",
  "Daging Sapi",
  "Tenderloin",
  "Sirloin",
  "Ribs & Buntut",
  "Slice & Yakiniku",
  "Frozen Food",
  "Promo",
];

const FEATURES = [
  {
    icon: <Truck className="h-5 w-5" />,
    title: "Cold-Chain Delivery",
    body: "Kurir instan & armada terintegrasi",
  },
  {
    icon: <BadgeCheck className="h-5 w-5" />,
    title: "Halal & Higienis",
    body: "Verified grade & sertifikat halal",
  },
  {
    icon: <Package className="h-5 w-5" />,
    title: "Vacuum Sealed",
    body: "Packaging rapi menjaga freshness",
  },
  {
    icon: <Handshake className="h-5 w-5" />,
    title: "Harga B2B Transparan",
    body: "Quote final berdasarkan berat aktual",
  },
];


const BEST_SELLERS: Product[] = [
  {
    name: "Tenderloin Steak Premium 1 KG",
    category: "Daging Sapi",
    price: "Rp285.000",
    oldPrice: "Rp320.000",
    discount: 11,
    stock: "25 kg",
    rating: 4.9,
    reviews: 45,
    image: productTenderloin,
    badge: "Best Seller",
  },
  {
    name: "Beef Slice Low Fat 1 KG",
    category: "Daging Sapi",
    price: "Rp130.000",
    oldPrice: "Rp145.000",
    discount: 10,
    stock: "40 kg",
    rating: 4.8,
    reviews: 62,
    image: productSlice,
    badge: "Best Seller",
  },
  {
    name: "Buntut Sapi Fresh 1 KG",
    category: "Daging Sapi",
    price: "Rp150.000",
    stock: "18 kg",
    rating: 4.7,
    reviews: 28,
    image: productOxtail,
    badge: "Best Seller",
  },
  {
    name: "Daging Teriyaki Marinated 1 KG",
    category: "Daging Sapi",
    price: "Rp150.000",
    oldPrice: "Rp165.000",
    discount: 9,
    stock: "22 kg",
    rating: 4.8,
    reviews: 37,
    image: productRibs,
    badge: "Promo",
  },
];

const CATALOG: {
  title: string;
  pack: string;
  items: Product[];
}[] = [
  {
    title: "Daging Sapi Segar Kemasan 1 Kg",
    pack: "Meat Pack · 1 kg",
    items: [
      {
        name: "Daging Slice Low Fat 1 KG",
        category: "Daging Sapi",
        price: "Rp130.000",
        stock: "40 kg",
        rating: 4.8,
        reviews: 62,
        image: productSlice,
      },
      {
        name: "Daging Teriyaki 1 KG",
        category: "Daging Sapi",
        price: "Rp150.000",
        stock: "22 kg",
        rating: 4.7,
        reviews: 37,
        image: productRibs,
      },
      {
        name: "Tenderloin Steak 1 KG",
        category: "Daging Sapi",
        price: "Rp285.000",
        stock: "25 kg",
        rating: 4.9,
        reviews: 45,
        image: productTenderloin,
        badge: "Best Seller",
      },
      {
        name: "Buntut Sapi 1 KG",
        category: "Daging Sapi",
        price: "Rp150.000",
        stock: "18 kg",
        rating: 4.7,
        reviews: 28,
        image: productOxtail,
      },
    ],
  },
  {
    title: "Daging Sapi Segar Kemasan 500 Gram",
    pack: "Meat Pack · 500 g",
    items: [
      {
        name: "Beef Slice AUS 500 GR",
        category: "Daging Sapi",
        price: "Rp84.000",
        oldPrice: "Rp95.000",
        discount: 11,
        stock: "60 pcs",
        rating: 4.8,
        reviews: 52,
        image: productSlice,
        badge: "Promo",
      },
      {
        name: "Daging Teriyaki 500 GR",
        category: "Daging Sapi",
        price: "Rp79.000",
        stock: "35 pcs",
        rating: 4.6,
        reviews: 24,
        image: productRibs,
      },
      {
        name: "Tenderloin 500 GR",
        category: "Daging Sapi",
        price: "Rp145.000",
        stock: "20 pcs",
        rating: 4.9,
        reviews: 31,
        image: productTenderloin,
      },
      {
        name: "Buntut Sapi 500 GR",
        category: "Daging Sapi",
        price: "Rp79.000",
        stock: "28 pcs",
        rating: 4.7,
        reviews: 19,
        image: productOxtail,
      },
    ],
  },
];
