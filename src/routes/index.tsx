import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, ShieldCheck, Truck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MEATHUB Meat Hub — Marketplace daging premium B2B Jabodetabek" },
      {
        name: "description",
        content:
          "MEATHUB Meat Hub menghubungkan importir/distributor daging premium dengan restoran, hotel, dan katering di Jabodetabek. Stok akurat, pembayaran aman, pengiriman lewat cold storage Kemayoran.",
      },
      { property: "og:title", content: "MEATHUB Meat Hub — Marketplace daging premium B2B" },
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
    <div className="min-h-screen bg-warm-white font-[family-name:var(--font-body-alt)] text-ink">
      <header className="sticky top-0 z-20 bg-maroon-dark text-warm-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-warm-white font-headline text-xs font-bold tracking-widest text-maroon-dark">
              MH
            </span>
            <div>
              <div className="font-headline text-lg font-bold leading-none tracking-tight text-warm-white">
                MEATHUB
              </div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-gold">
                Meat Hub
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              className="text-warm-white hover:bg-warm-white/10 hover:text-warm-white"
            >
              <Link to="/auth">Masuk</Link>
            </Button>
            <Button
              asChild
              className="bg-gold text-maroon-dark hover:bg-gold-bright hover:text-maroon-dark"
            >
              <Link to="/auth" search={{ next: "/dashboard" }}>
                Mulai pesan
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero — Maroon dominant with gold accents */}
        <section
          className="relative overflow-hidden px-4 py-16 md:py-24 lg:py-32"
          style={{
            background:
              "linear-gradient(135deg, var(--maroon-dark) 0%, var(--maroon) 55%, var(--burgundy-deep) 100%)",
          }}
        >
          <div className="pointer-events-none absolute -bottom-24 -right-24 select-none font-headline text-[160px] leading-none text-warm-white opacity-[0.06] md:text-[220px] lg:-right-16 lg:text-[280px]">
            B2B
          </div>

          <div className="relative z-10 mx-auto grid max-w-7xl gap-12 lg:grid-cols-12 lg:items-start">
            <div className="lg:col-span-7 flex flex-col space-y-8">
              <div className="fade-in-up" style={{ animationDelay: "0.05s" }}>
                <div className="flex items-center gap-4">
                  <span className="h-px w-12 bg-gold" />
                  <span className="text-xs font-bold uppercase tracking-[0.3em] text-gold">
                    B2B Premium Marketplace
                  </span>
                </div>
                <h1 className="mt-6 font-headline text-6xl leading-[0.85] tracking-tighter text-warm-white uppercase md:text-7xl lg:text-8xl">
                  Meat<span className="text-gold">hub</span>
                </h1>
              </div>

              <p
                className="max-w-xl text-xl leading-relaxed text-warm-white/90 md:text-2xl font-light fade-in-up"
                style={{ animationDelay: "0.15s" }}
              >
                Standardisasi baru distribusi daging di{" "}
                <span className="font-semibold text-warm-white">Jabodetabek</span>. Akurasi stok ≥97%
                dengan konfirmasi berat hanya dalam 2 jam.
              </p>

              <div
                className="flex flex-wrap gap-4 pt-2 fade-in-up"
                style={{ animationDelay: "0.25s" }}
              >
                <Button
                  asChild
                  size="lg"
                  className="bg-gold px-8 py-6 font-headline text-sm font-bold uppercase tracking-wider text-maroon-dark shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] hover:bg-gold-bright"
                >
                  <Link to="/auth" search={{ next: "/dashboard" }}>
                    Daftar sebagai pembeli
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-warm-white/40 bg-transparent px-8 py-6 font-headline text-sm font-bold uppercase tracking-wider text-warm-white hover:bg-warm-white hover:text-maroon-dark"
                >
                  <Link to="/auth" search={{ next: "/dashboard" }}>
                    Daftar sebagai vendor
                  </Link>
                </Button>
              </div>

              <div
                className="grid grid-cols-3 gap-6 border-t border-warm-white/15 pt-10 fade-in-up"
                style={{ animationDelay: "0.35s" }}
              >
                <Stat value="2 JAM" label="Konfirmasi Berat" />
                <Stat value="≥97%" label="Akurasi Stok" />
                <Stat value="COLD" label="Storage Kemayoran" />
              </div>
            </div>

            {/* Right: Editorial Tiers Grid */}
            <div
              className="relative z-10 grid grid-cols-2 gap-3 lg:col-span-5 fade-in-up"
              style={{ animationDelay: "0.45s" }}
            >
              <div className="col-span-2 flex h-44 items-end justify-between border-l-4 border-gold bg-maroon/60 p-6 backdrop-blur-sm transition-colors hover:bg-maroon/80">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gold">
                    Tier 01
                  </span>
                  <h3 className="mt-2 font-headline text-2xl uppercase leading-none text-warm-white">
                    Super Premium
                  </h3>
                </div>
                <ArrowRight className="h-7 w-7 text-gold opacity-80" />
              </div>

              <div className="flex h-56 flex-col justify-between border border-warm-white/15 bg-maroon-dark/50 p-5 transition-colors hover:border-gold/50">
                <h3 className="font-headline text-lg uppercase leading-tight text-warm-white">
                  Commodity & Premium
                </h3>
                <p className="text-xs leading-relaxed text-warm-white/80">
                  Volume dan kualitas seimbang untuk operasional skala besar.
                </p>
              </div>

              <div className="flex h-56 flex-col justify-between bg-gold p-5">
                <h3 className="font-headline text-lg uppercase leading-tight text-maroon-dark">
                  Undervalued QC
                </h3>
                <p className="text-[10px] font-bold uppercase tracking-tighter text-maroon-dark/80">
                  Limited Daily Deals
                </p>
              </div>

              <div className="col-span-2 flex items-center gap-4 border-t border-warm-white/15 bg-maroon-dark/50 p-5">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-gold font-headline text-sm font-bold text-maroon-dark">
                  MH
                </div>
                <div>
                  <h4 className="font-headline text-sm font-bold uppercase tracking-wider text-warm-white">
                    MEATHUB House
                  </h4>
                  <p className="text-[10px] uppercase tracking-wider text-gold">
                    Private Selected Cuts
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust bar — soft white */}
        <section className="border-b border-line bg-warm-white px-4 py-10 text-ink">
          <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-3">
            <TrustItem
              icon={<ShieldCheck className="h-6 w-6" />}
              title="100% Rekonsiliasi"
              body="Refund langsung ke deposit jika berat atau kualitas tidak sesuai konfirmasi."
            />
            <TrustItem
              icon={<Truck className="h-6 w-6" />}
              title="≤ 24 Jam Keluar Hub"
              body="Pesanan diproses dan dikirim dari cold storage Kemayoran dalam satu hari kerja."
            />
            <TrustItem
              icon={<CheckCircle2 className="h-6 w-6" />}
              title="Verifikasi Grade"
              body="Setiap potongan dilengkapi spesifikasi grade, brand, dan asal yang transparan."
            />
          </div>
        </section>

        {/* How it works — warm ivory / soft white */}
        <section className="bg-ivory px-4 py-16 text-ink md:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 flex items-end justify-between border-b border-ink/15 pb-6">
              <h2 className="font-headline text-3xl uppercase tracking-tight text-ink md:text-4xl">
                Bagaimana bekerjanya
              </h2>
              <span className="hidden text-[10px] font-bold uppercase tracking-[0.3em] text-ink-soft md:block">
                4 Langkah
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              {STEPS.map((s, i) => (
                <div
                  key={s.title}
                  className="group relative border border-ink/15 bg-warm-white p-6 transition-colors hover:border-maroon hover:shadow-md"
                >
                  <span className="absolute right-4 top-4 font-headline text-4xl text-maroon/10 transition-colors group-hover:text-maroon/40">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-maroon">
                    Langkah {i + 1}
                  </span>
                  <h3 className="mt-3 font-headline text-lg font-bold uppercase text-ink">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tiers detail — maroon dominant */}
        <section className="bg-maroon-dark px-4 py-16 md:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold">
                Product Line
              </span>
              <h2 className="mt-3 font-headline text-3xl uppercase tracking-tight text-warm-white md:text-4xl">
                Empat tier produk
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {TIERS.map((t, i) => (
                <div
                  key={t.name}
                  className={`flex flex-col justify-between border p-6 transition-transform hover:-translate-y-1 ${t.classes}`}
                >
                  <div>
                    <span className={`font-headline text-4xl ${t.numberClass}`}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3 className={`mt-4 font-headline text-lg font-bold uppercase ${t.titleClass}`}>
                      {t.name}
                    </h3>
                    <p className={`mt-2 text-sm leading-relaxed ${t.bodyClass}`}>{t.body}</p>
                  </div>
                  <div className={`mt-6 text-[10px] font-bold uppercase tracking-[0.25em] ${t.tagClass}`}>
                    {t.tag}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA — cream */}
        <section className="bg-cream px-4 py-16 md:py-24">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="font-headline text-4xl uppercase tracking-tight text-maroon-dark md:text-5xl">
              Siap standarisasi pengadaan daging?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-ink-soft">
              Bergabung sebagai pembeli atau vendor dan rasakan akurasi stok serta konfirmasi berat
              yang belum pernah ada di pasar B2B Jabodetabek.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Button
                asChild
                size="lg"
                className="bg-maroon-dark px-8 py-6 font-headline text-sm font-bold uppercase tracking-wider text-warm-white shadow-[0_10px_30px_-10px_rgba(0,0,0,0.4)] hover:bg-maroon"
              >
                <Link to="/auth" search={{ next: "/dashboard" }}>
                  Daftar sebagai pembeli
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-maroon-dark bg-transparent px-8 py-6 font-headline text-sm font-bold uppercase tracking-wider text-maroon-dark hover:bg-maroon-dark hover:text-warm-white"
              >
                <Link to="/auth" search={{ next: "/dashboard" }}>
                  Daftar sebagai vendor
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-maroon-dark py-10 text-center text-xs text-warm-white/60">
        <p>© {new Date().getFullYear()} MEATHUB Meat Hub. Jabodetabek B2B.</p>
      </footer>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-headline text-2xl text-warm-white md:text-3xl">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-gold">
        {label}
      </p>
    </div>
  );
}

function TrustItem({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="shrink-0 grid h-11 w-11 place-items-center rounded-full bg-maroon-dark text-gold">
        {icon}
      </div>
      <div>
        <h4 className="font-headline text-sm font-bold uppercase tracking-wider text-ink">
          {title}
        </h4>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">{body}</p>
      </div>
    </div>
  );
}

const STEPS = [
  {
    title: "Cari & pilih",
    body: "Cari cut/brand/grade. Lihat harga landed, stok, dan estimasi ETA.",
  },
  {
    title: "Konfirmasi berat",
    body: "Vendor konfirmasi berat aktual dalam 2 jam. Anda bisa batal sebelum bayar.",
  },
  {
    title: "Bayar cash",
    body: "Pembayaran via deposit atau VA. Fulfillment mulai setelah pembayaran diterima.",
  },
  {
    title: "Lacak & terima",
    body: "Barang masuk hub Kemayoran, kurir dispatch, Anda lacak sampai POD.",
  },
];

const TIERS = [
  {
    name: "Commodity / Premium",
    body: "Platform pilih vendor terbaik berdasar harga landed & keandalan.",
    tag: "Workhorse",
    classes: "border-warm-white/15 bg-maroon/40",
    numberClass: "text-warm-white/25",
    titleClass: "text-warm-white",
    bodyClass: "text-warm-white/80",
    tagClass: "text-gold",
  },
  {
    name: "Super Premium",
    body: "Pilih brand dengan bukti sertifikasi asosiasi/award terverifikasi.",
    tag: "Certified",
    classes: "border-cream bg-cream",
    numberClass: "text-maroon-dark/25",
    titleClass: "text-maroon-dark",
    bodyClass: "text-ink",
    tagClass: "text-burgundy",
  },
  {
    name: "Undervalued — QC Verified",
    body: "Produk premium underpriced karena administrasi, dengan QC eksplisit.",
    tag: "Daily Deals",
    classes: "border-gold bg-gold",
    numberClass: "text-maroon-dark/30",
    titleClass: "text-maroon-dark",
    bodyClass: "text-maroon-dark/85",
    tagClass: "text-burgundy-deep",
  },
  {
    name: "MEATHUB Product Line",
    body: "House brand MEATHUB dengan standar marbling & pH terpajang.",
    tag: "House Brand",
    classes: "border-gold/40 bg-burgundy-deep",
    numberClass: "text-gold/40",
    titleClass: "text-warm-white",
    bodyClass: "text-warm-white/85",
    tagClass: "text-gold",
  },
];
