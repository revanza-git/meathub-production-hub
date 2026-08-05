import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Trash2, BadgeCheck, ShoppingCart } from "lucide-react";
import { MarketLayout } from "@/components/market/market-layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/lib/market/cart";
import { vendorById } from "@/lib/market/data";
import { rupiah } from "@/lib/market/format";

export const Route = createFileRoute("/keranjang")({
  head: () => ({
    meta: [
      { title: "Keranjang Belanja — MEATHUB" },
      { name: "description", content: "Tinjau pesanan multi-vendor Anda sebelum checkout di MEATHUB." },
      { property: "og:title", content: "Keranjang Belanja — MEATHUB" },
      { property: "og:description", content: "Tinjau pesanan multi-vendor Anda sebelum checkout." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const nav = useNavigate();
  const { groups, full, setQty, remove, toggleSelect, selectVendor, notes, setNote, totals } = useCart();
  const selectedCount = full.filter((l) => l.selected).length;

  if (full.length === 0) {
    return (
      <MarketLayout>
        <div className="mx-auto max-w-2xl px-4 py-20 text-center">
          <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" aria-hidden="true" />
          <h1 className="mt-4 font-display text-2xl font-bold text-ink">Keranjang Anda kosong</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Telusuri katalog daging sapi grosir dari vendor terverifikasi MEATHUB.
          </p>
          <Link to="/produk" search={{}}>
            <Button className="mt-5">Mulai belanja</Button>
          </Link>
        </div>
      </MarketLayout>
    );
  }

  return (
    <MarketLayout>
      <div className="mx-auto max-w-7xl px-4 py-6">
        <h1 className="mb-4 font-display text-2xl font-bold text-ink">Keranjang belanja</h1>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            {groups.map((g) => {
              const vendor = vendorById(g.vendorId);
              const allSelected = g.lines.every((l) => l.selected);
              return (
                <section key={g.vendorId} className="rounded-xl border border-border bg-card">
                  <header className="flex items-center gap-2 border-b border-border px-4 py-3">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={(v) => selectVendor(g.vendorId, !!v)}
                      aria-label={`Pilih semua produk dari ${vendor.name}`}
                    />
                    <Link
                      to="/toko/$slug"
                      params={{ slug: vendor.slug }}
                      className="flex min-w-0 items-center gap-1 truncate font-semibold text-ink hover:text-maroon"
                    >
                      {vendor.name}
                      {vendor.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />}
                    </Link>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">{vendor.city}</span>
                  </header>

                  <ul className="divide-y divide-border">
                    {g.lines.map((l) => (
                      <li key={l.key} className="flex gap-3 p-4">
                        <Checkbox
                          checked={l.selected}
                          onCheckedChange={() => toggleSelect(l.key)}
                          aria-label={`Pilih ${l.product.name}`}
                          className="mt-1"
                        />
                        <img
                          src={l.product.image}
                          alt=""
                          aria-hidden="true"
                          className="h-16 w-16 shrink-0 rounded-lg object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <Link
                            to="/produk/$id"
                            params={{ id: l.product.id }}
                            className="line-clamp-2 text-sm font-medium text-ink hover:text-maroon"
                          >
                            {l.product.name}
                          </Link>
                          <div className="text-xs text-muted-foreground">{l.variantLabel}</div>
                          <div className="mt-1 font-semibold text-maroon">{rupiah(l.unitPrice)}</div>
                          <div className="mt-2 flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              aria-label="Kurangi jumlah"
                              onClick={() => setQty(l.key, l.qty - 1)}
                            >
                              −
                            </Button>
                            <input
                              className="h-7 w-14 rounded-md border border-input bg-background text-center text-sm"
                              value={l.qty}
                              aria-label={`Jumlah ${l.product.name}`}
                              onChange={(e) => setQty(l.key, Number(e.target.value) || 1)}
                            />
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              aria-label="Tambah jumlah"
                              onClick={() => setQty(l.key, l.qty + 1)}
                            >
                              +
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="ml-auto h-7 w-7 text-muted-foreground hover:text-destructive"
                              aria-label={`Hapus ${l.product.name}`}
                              onClick={() => remove(l.key)}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          </div>
                        </div>
                        <div className="hidden w-28 shrink-0 text-right font-semibold text-ink sm:block">
                          {rupiah(l.unitPrice * l.qty)}
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="border-t border-border p-4">
                    <label
                      htmlFor={`note-${g.vendorId}`}
                      className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted-foreground"
                    >
                      Catatan untuk vendor
                    </label>
                    <Textarea
                      id={`note-${g.vendorId}`}
                      rows={2}
                      value={notes[g.vendorId] ?? ""}
                      onChange={(e) => setNote(g.vendorId, e.target.value)}
                      placeholder="Contoh: potong steak 2,5 cm, kirim pagi sebelum jam 9."
                    />
                    <div className="mt-2 text-right text-sm">
                      Subtotal vendor:{" "}
                      <span className="font-display font-bold text-maroon">{rupiah(g.subtotal)}</span>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>

          <aside className="lg:sticky lg:top-24 lg:h-fit">
            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-3 font-display text-lg font-bold text-ink">Ringkasan belanja</h2>
              <dl className="space-y-1.5 text-sm">
                <Row label={`Subtotal (${selectedCount} item)`} value={rupiah(totals.subtotal)} />
                <Row label="Total berat" value={`${totals.totalKg.toFixed(1)} kg`} />
                <Row label="Estimasi hemat" value={`− ${rupiah(totals.discount)}`} tone="text-success" />
              </dl>
              <div className="mt-3 flex justify-between border-t border-border pt-3">
                <span className="font-semibold text-ink">Total</span>
                <span className="font-display text-xl font-bold text-maroon">{rupiah(totals.subtotal)}</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Ongkir dan biaya layanan dihitung pada halaman checkout.
              </p>
              <Button
                className="mt-4 w-full"
                disabled={selectedCount === 0}
                onClick={() => nav({ to: "/checkout" })}
              >
                Lanjut ke checkout
              </Button>
              <Link to="/produk" search={{}}>
                <Button variant="outline" className="mt-2 w-full">Lanjut belanja</Button>
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </MarketLayout>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={tone ?? "text-ink"}>{value}</dd>
    </div>
  );
}
