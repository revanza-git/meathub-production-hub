import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart,
  ShieldCheck,
  Package,
  Handshake,
  Truck,
  BadgeCheck,
  Search,
} from "lucide-react";
import heroMeat from "@/assets/hero-meat.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MEATHUB — Marketplace daging premium B2B Jabodetabek" },
      {
        name: "description",
        content:
          "MEATHUB menghubungkan importir daging premium dengan restoran, hotel, dan katering di Jabodetabek. Stok akurat, konfirmasi berat 2 jam, pengiriman dari hub Kemayoran.",
      },
      { property: "og:title", content: "MEATHUB — Marketplace daging premium B2B" },
      {
        property: "og:description",
        content:
          "Order daging premium dengan verifikasi grade, konfirmasi berat aktual, dan pengiriman terlacak dari hub Kemayoran.",
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
      {/* Top nav — light cream with dark text */}
      <header className="sticky top-0 z-20 border-b border-line/60 bg-[#f5f2e6]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-3" aria-label="MEATHUB beranda">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-maroon-dark font-headline text-[11px] font-bold tracking-widest text-warm-white shadow-sm">
              MH
            </span>
            <div className="leading-tight">
              <div className="font-[family-name:var(--font-serif)] text-xl font-bold text-maroon-dark">
                MEATHUB
              </div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-ink-soft">
                Meat Hub · B2B
              </div>
            </div>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <span className="text-sm font-semibold text-maroon-dark">Beranda</span>
            <span className="text-sm text-ink-soft">Produk</span>
            <span className="text-sm text-ink-soft">Cara Kerja</span>
            <span className="text-sm text-ink-soft">Kemitraan</span>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="text-ink hover:bg-ink/5">
              <Link to="/auth">Masuk</Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="bg-maroon-dark text-warm-white hover:bg-maroon"
            >
              <Link to="/auth" search={{ next: "/dashboard" }}>Daftar</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Split hero — image left, headline right */}
        <section className="px-4 py-14 md:py-20">
          <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="order-2 lg:order-1 fade-in-up">
              <div className="overflow-hidden rounded-2xl shadow-[0_25px_60px_-25px_rgba(90,26,26,0.35)]">
                <img
                  src={heroMeat}
                  alt="Potongan ribeye premium dengan rempah segar di atas papan slate"
                  width={1200}
                  height={900}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>

            <div className="order-1 lg:order-2 fade-in-up" style={{ animationDelay: "0.1s" }}>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-maroon-dark">
                MEATHUB · B2B
              </p>
              <h1 className="mt-4 font-[family-name:var(--font-serif)] text-5xl leading-[1.05] text-ink md:text-6xl lg:text-[64px]">
                Daging Sapi Premium,{" "}
                <em className="italic text-maroon-dark">Langsung</em> dari Hub Kemayoran
              </h1>
              <p className="mt-6 max-w-lg text-base leading-relaxed text-ink-soft md:text-lg">
                MEATHUB adalah marketplace daging premium untuk restoran, hotel, dan katering
                di Jabodetabek. Stok akurat, konfirmasi berat aktual dalam 2 jam, dan
                pengiriman terlacak dari cold storage Kemayoran.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Button
                  asChild
                  size="lg"
                  className="rounded-full bg-maroon-dark px-8 py-6 text-sm font-semibold text-warm-white hover:bg-maroon"
                >
                  <Link to="/auth" search={{ next: "/dashboard" }}>
                    <ShoppingCart className="mr-2 h-4 w-4" aria-hidden="true" />
                    Mulai Belanja
                  </Link>
                </Button>
                <Link
                  to="/auth"
                  search={{ next: "/dashboard" }}
                  className="text-sm font-semibold text-maroon-dark underline-offset-4 hover:underline"
                >
                  Daftar sebagai vendor →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Feature strip — maroon with cream cards */}
        <section className="bg-maroon-dark px-4 py-14">
          <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl bg-[#f5f2e6] p-6 shadow-sm transition-transform hover:-translate-y-1"
              >
                <div className="grid h-11 w-11 place-items-center rounded-full bg-maroon-dark/10 text-maroon-dark">
                  {f.icon}
                </div>
                <h3 className="mt-4 font-[family-name:var(--font-serif)] text-xl font-bold text-ink">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Product tiers on light bg */}
        <section className="px-4 py-16 md:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-maroon-dark">
                Product Line
              </p>
              <h2 className="mt-3 font-[family-name:var(--font-serif)] text-4xl text-ink md:text-5xl">
                Empat Tier Daging Premium
              </h2>
              <p className="mt-4 text-base text-ink-soft">
                Setiap tier punya standar grade, brand, dan verifikasi yang transparan —
                cocok untuk kebutuhan menu dan budget yang berbeda.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {TIERS.map((t, i) => (
                <div
                  key={t.name}
                  className="group flex flex-col overflow-hidden rounded-xl border border-line bg-white transition-shadow hover:shadow-lg"
                >
                  <div className="aspect-[4/3] bg-gradient-to-br from-maroon-dark to-burgundy-deep p-6 text-warm-white">
                    <span className="font-[family-name:var(--font-serif)] text-4xl text-gold">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.25em] text-gold">
                      {t.tag}
                    </p>
                    <h3 className="mt-2 font-[family-name:var(--font-serif)] text-2xl leading-tight text-warm-white">
                      {t.name}
                    </h3>
                  </div>
                  <div className="flex flex-1 flex-col justify-between p-5">
                    <p className="text-sm leading-relaxed text-ink-soft">{t.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works — cream continuous */}
        <section className="bg-ivory px-4 py-16 md:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-maroon-dark">
                Alur Pemesanan
              </p>
              <h2 className="mt-3 font-[family-name:var(--font-serif)] text-4xl text-ink md:text-5xl">
                Sederhana, Terlacak, Terverifikasi
              </h2>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-4">
              {STEPS.map((s, i) => (
                <div key={s.title} className="text-center">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-maroon-dark font-[family-name:var(--font-serif)] text-xl font-bold text-warm-white">
                    {i + 1}
                  </div>
                  <h3 className="mt-4 font-[family-name:var(--font-serif)] text-xl font-bold text-ink">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-4 py-16 md:py-24">
          <div className="mx-auto max-w-4xl rounded-2xl bg-maroon-dark px-8 py-14 text-center text-warm-white shadow-[0_25px_60px_-30px_rgba(90,26,26,0.6)]">
            <h2 className="font-[family-name:var(--font-serif)] text-4xl md:text-5xl">
              Siap standardisasi pengadaan daging Anda?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-warm-white/85">
              Bergabung sebagai pembeli atau vendor dan rasakan akurasi stok serta
              konfirmasi berat yang belum pernah ada di pasar B2B Jabodetabek.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button
                asChild
                size="lg"
                className="rounded-full bg-gold px-8 py-6 text-sm font-semibold text-maroon-dark hover:bg-gold-bright"
              >
                <Link to="/auth" search={{ next: "/dashboard" }}>Daftar sebagai pembeli</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full border-warm-white/40 bg-transparent px-8 py-6 text-sm font-semibold text-warm-white hover:bg-warm-white hover:text-maroon-dark"
              >
                <Link to="/auth" search={{ next: "/dashboard" }}>Daftar sebagai vendor</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line/60 bg-[#f5f2e6] py-8 text-center text-xs text-ink-soft">
        <p>© {new Date().getFullYear()} MEATHUB Meat Hub · Jabodetabek B2B Marketplace</p>
      </footer>
    </div>
  );
}

const FEATURES = [
  {
    icon: <Truck className="h-5 w-5" />,
    title: "Integrasi Ojek Online",
    body: "Kurir instan & armada cold-chain terintegrasi dari hub Kemayoran.",
  },
  {
    icon: <BadgeCheck className="h-5 w-5" />,
    title: "Halal & Higienis",
    body: "Setiap potongan diverifikasi grade, brand, dan sertifikat halal.",
  },
  {
    icon: <Package className="h-5 w-5" />,
    title: "Packaging Rapi & Aman",
    body: "Vacuum-sealed dan dikemas cold-chain untuk menjaga freshness.",
  },
  {
    icon: <Handshake className="h-5 w-5" />,
    title: "Peluang Kemitraan",
    body: "Program vendor & distributor terbuka untuk importir tangan pertama.",
  },
];

const STEPS = [
  { title: "Cari & Pilih", body: "Cari cut, brand, grade. Lihat harga landed & ETA." },
  { title: "Konfirmasi Berat", body: "Vendor konfirmasi berat aktual dalam 2 jam." },
  { title: "Bayar Aman", body: "Pembayaran via deposit atau VA. Refund otomatis." },
  { title: "Lacak & Terima", body: "Dispatch dari hub Kemayoran, lacak sampai POD." },
];

const TIERS = [
  {
    name: "Commodity / Premium",
    tag: "Workhorse",
    body: "Platform memilih vendor terbaik berdasarkan harga landed dan keandalan.",
  },
  {
    name: "Super Premium",
    tag: "Certified",
    body: "Brand dengan sertifikasi asosiasi atau award terverifikasi.",
  },
  {
    name: "Undervalued QC",
    tag: "Daily Deals",
    body: "Produk premium underpriced karena administrasi, dengan QC eksplisit.",
  },
  {
    name: "MEATHUB House",
    tag: "House Brand",
    body: "House brand MEATHUB dengan standar marbling & pH terpajang.",
  },
];

// Icon aliases retained for tree-shaking hints
void Search;
void ShieldCheck;
