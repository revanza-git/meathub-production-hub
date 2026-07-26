import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SBMEAT Meat Hub — Marketplace daging premium B2B Jabodetabek" },
      {
        name: "description",
        content:
          "SBMEAT Meat Hub menghubungkan importir/distributor daging premium dengan restoran, hotel, dan katering di Jabodetabek. Stok akurat, pembayaran aman, pengiriman lewat cold storage Kemayoran.",
      },
      { property: "og:title", content: "SBMEAT Meat Hub — Marketplace daging premium B2B" },
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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-ink text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-white/10 text-[10px] font-bold tracking-widest">
              SB
            </span>
            <div>
              <div className="font-display text-lg font-bold leading-none">SBMEAT</div>
              <div className="text-[10px] uppercase tracking-widest text-white/60">
                Meat Hub
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
              <Link to="/auth">Masuk</Link>
            </Button>
            <Button asChild className="bg-gold text-ink hover:bg-gold/90">
              <Link to="/auth" search={{ next: "/dashboard" }}>
                Mulai pesan
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="border-b bg-ink text-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-[11px] uppercase tracking-widest text-gold">
                <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                B2B • Jabodetabek
              </div>
              <h1 className="font-display text-4xl font-bold leading-tight md:text-5xl">
                Daging premium tanpa <span className="text-gold">tebak-tebakan</span> grade,
                stok, atau ongkir.
              </h1>
              <p className="max-w-lg text-base text-white/70">
                SBMEAT Meat Hub menghubungkan importir tangan pertama dengan restoran, hotel,
                dan katering di Jabodetabek — dengan konfirmasi berat aktual, pembayaran cash
                sebelum pengiriman, dan pelacakan lewat cold storage Kemayoran.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-maroon text-white hover:bg-maroon-dark">
                  <Link to="/auth" search={{ next: "/dashboard" }}>
                    Daftar sebagai pembeli
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
                >
                  <Link to="/auth" search={{ next: "/dashboard" }}>
                    Daftar sebagai vendor
                  </Link>
                </Button>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="space-y-4">
                  <Row label="Konfirmasi berat aktual" value="≤ 2 jam" />
                  <Row label="Akurasi stok" value="≥ 97%" />
                  <Row label="Keluar hub" value="≤ 24 jam" />
                  <Row label="Refund ke deposit" value="100% rekonsiliasi" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="mb-8 font-display text-2xl font-bold text-ink">
            Bagaimana bekerjanya
          </h2>
          <div className="grid gap-6 md:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.title} className="rounded-lg border bg-card p-5">
                <div className="text-[11px] font-semibold uppercase tracking-widest text-gold">
                  Langkah {i + 1}
                </div>
                <div className="mt-2 font-display text-base font-bold text-ink">{s.title}</div>
                <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t bg-gold-soft/60">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="mb-8 font-display text-2xl font-bold text-ink">Empat tier produk</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {TIERS.map((t) => (
                <div key={t.name} className="rounded-lg border bg-card p-5">
                  <div className="font-display text-base font-bold text-ink">{t.name}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{t.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-ink py-8 text-center text-xs text-white/50">
        © {new Date().getFullYear()} SBMEAT Meat Hub. Jabodetabek B2B.
      </footer>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 pb-3 last:border-b-0 last:pb-0">
      <span className="text-sm text-white/70">{label}</span>
      <span className="font-display text-sm font-bold text-gold">{value}</span>
    </div>
  );
}

const STEPS = [
  { title: "Cari & pilih", body: "Cari cut/brand/grade. Lihat harga landed, stok, dan estimasi ETA." },
  { title: "Konfirmasi berat", body: "Vendor konfirmasi berat aktual dalam 2 jam. Anda bisa batal sebelum bayar." },
  { title: "Bayar cash", body: "Pembayaran via deposit atau VA. Fulfillment mulai setelah pembayaran diterima." },
  { title: "Lacak & terima", body: "Barang masuk hub Kemayoran, kurir dispatch, Anda lacak sampai POD." },
];

const TIERS = [
  { name: "Commodity / Premium", body: "Platform pilih vendor terbaik berdasar harga landed & keandalan." },
  { name: "Super Premium", body: "Pilih brand dengan bukti sertifikasi asosiasi/award terverifikasi." },
  { name: "Undervalued — QC Verified", body: "Produk premium underpriced karena administrasi, dengan QC eksplisit." },
  { name: "SBMEAT Product Line", body: "House brand SBMEAT dengan standar marbling & pH terpajang." },
];
