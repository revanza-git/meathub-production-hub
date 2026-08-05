import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { MarketLayout } from "@/components/market/market-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/lib/market/cart";
import { DELIVERY_OPTIONS, PAYMENT_METHODS, vendorById } from "@/lib/market/data";
import { rupiah } from "@/lib/market/format";
import { commissionOf, saveOrder, makeTimeline, type Order, type SubOrder } from "@/lib/market/orders-store";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout Pesanan — MEATHUB" },
      { name: "description", content: "Konfirmasi alamat, pengiriman, dan metode pembayaran pesanan MEATHUB." },
      { property: "og:title", content: "Checkout Pesanan — MEATHUB" },
      { property: "og:description", content: "Konfirmasi alamat, pengiriman, dan pembayaran pesanan Anda." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

const SERVICE_FEE = 5000;

function CheckoutPage() {
  const nav = useNavigate();
  const { groups, notes, totals, clear } = useCart();
  const activeGroups = groups.filter((g) => g.lines.some((l) => l.selected));

  const [buyer, setBuyer] = useState({
    name: "Rizky Pratama",
    company: "PT Boga Rasa Nusantara",
    phone: "0812-8890-4471",
    address: "Jl. Kemang Raya No. 21, Jakarta Selatan 12730",
  });
  const [delivery, setDelivery] = useState<Record<string, string>>({});
  const [payment, setPayment] = useState<string>("qris");
  const [voucher, setVoucher] = useState("");
  const [discount, setDiscount] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const deliveryFor = (vendorId: string) =>
    DELIVERY_OPTIONS.find((d) => d.id === (delivery[vendorId] ?? "regular"))!;

  const subtotal = activeGroups.reduce((s, g) => s + g.subtotal, 0);
  const deliveryFee = useMemo(
    () =>
      activeGroups.reduce((s, g) => {
        const kg = g.lines
          .filter((l) => l.selected)
          .reduce((k, l) => {
            const v = l.product.variants.find((x) => x.id === l.variantId);
            return k + ((v?.weightGram ?? 1000) / 1000) * l.qty;
          }, 0);
        return s + (kg >= 20 ? 0 : deliveryFor(g.vendorId).fee);
      }, 0),
    [activeGroups, delivery],
  );
  const total = subtotal + deliveryFee + SERVICE_FEE - discount;

  if (activeGroups.length === 0) {
    return (
      <MarketLayout>
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <h1 className="font-display text-2xl font-bold text-ink">Tidak ada item terpilih</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pilih produk di keranjang terlebih dahulu untuk melanjutkan checkout.
          </p>
          <Link to="/keranjang">
            <Button className="mt-5">Kembali ke keranjang</Button>
          </Link>
        </div>
      </MarketLayout>
    );
  }

  function applyVoucher() {
    const code = voucher.trim().toUpperCase();
    if (code === "MEATHUB10") {
      setDiscount(Math.round(subtotal * 0.1));
      toast.success("Voucher MEATHUB10 diterapkan — hemat 10%");
    } else if (code === "ONGKIRGRATIS") {
      setDiscount(deliveryFee);
      toast.success("Voucher ongkir gratis diterapkan");
    } else {
      setDiscount(0);
      toast.error("Kode voucher tidak dikenali");
    }
  }

  function placeOrder() {
    if (!buyer.name || !buyer.phone || !buyer.address) {
      toast.error("Lengkapi nama, telepon, dan alamat pengiriman");
      return;
    }
    setSubmitting(true);
    const createdAt = new Date().toISOString();
    const orderId = `MH-${Date.now().toString().slice(-6)}`;
    const subOrders: SubOrder[] = activeGroups.map((g, i) => {
      const items = g.lines
        .filter((l) => l.selected)
        .map((l) => ({
          productId: l.product.id,
          name: l.product.name,
          variantLabel: l.variantLabel,
          qty: l.qty,
          unitPrice: l.unitPrice,
        }));
      const opt = deliveryFor(g.vendorId);
      return {
        id: `${orderId}-${i + 1}`,
        vendorId: g.vendorId,
        items,
        subtotal: g.subtotal,
        deliveryOption: opt.name,
        deliveryFee: opt.fee,
        note: notes[g.vendorId],
        status: "Menunggu Pembayaran",
        timeline: makeTimeline("Menunggu Pembayaran", createdAt),
        commission: commissionOf(g.subtotal),
        settlementStatus: "Tertunda",
      };
    });

    const order: Order = {
      id: orderId,
      createdAt,
      buyer,
      subOrders,
      subtotal,
      discount,
      deliveryFee,
      serviceFee: SERVICE_FEE,
      total,
      paymentMethod: PAYMENT_METHODS.find((m) => m.id === payment)?.name ?? "QRIS",
      paymentStatus: "PENDING",
      status: "Menunggu Pembayaran",
    };
    saveOrder(order);
    clear();
    nav({ to: "/bayar/$orderId", params: { orderId }, search: { metode: payment } });
  }

  return (
    <MarketLayout>
      <div className="mx-auto max-w-7xl px-4 py-6">
        <h1 className="mb-4 font-display text-2xl font-bold text-ink">Checkout</h1>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            <section className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-3 font-display text-lg font-bold text-ink">Alamat pengiriman</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id="nama" label="Nama penanggung jawab" value={buyer.name} onChange={(v) => setBuyer({ ...buyer, name: v })} />
                <Field id="perusahaan" label="Nama perusahaan" value={buyer.company} onChange={(v) => setBuyer({ ...buyer, company: v })} />
                <Field id="telepon" label="Nomor telepon" value={buyer.phone} onChange={(v) => setBuyer({ ...buyer, phone: v })} />
                <div className="sm:col-span-2">
                  <Label htmlFor="alamat" className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">
                    Alamat lengkap
                  </Label>
                  <Textarea id="alamat" rows={2} value={buyer.address} onChange={(e) => setBuyer({ ...buyer, address: e.target.value })} />
                </div>
              </div>
            </section>

            {activeGroups.map((g) => {
              const vendor = vendorById(g.vendorId);
              return (
                <section key={g.vendorId} className="rounded-xl border border-border bg-card p-4">
                  <h2 className="mb-2 font-semibold text-ink">{vendor.name}</h2>
                  <ul className="mb-3 space-y-1 text-sm">
                    {g.lines.filter((l) => l.selected).map((l) => (
                      <li key={l.key} className="flex justify-between gap-3">
                        <span className="min-w-0 truncate text-ink-soft">
                          {l.product.name} · {l.variantLabel} × {l.qty}
                        </span>
                        <span className="shrink-0">{rupiah(l.unitPrice * l.qty)}</span>
                      </li>
                    ))}
                  </ul>
                  <fieldset>
                    <legend className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Opsi pengiriman
                    </legend>
                    <RadioGroup
                      value={delivery[g.vendorId] ?? "regular"}
                      onValueChange={(v) => setDelivery((p) => ({ ...p, [g.vendorId]: v }))}
                      className="gap-2"
                    >
                      {DELIVERY_OPTIONS.map((d) => (
                        <label
                          key={d.id}
                          className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 text-sm"
                        >
                          <RadioGroupItem value={d.id} id={`${g.vendorId}-${d.id}`} />
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium text-ink">{d.name}</span>
                            <span className="block text-xs text-muted-foreground">{d.eta}</span>
                          </span>
                          <span className="shrink-0 text-sm font-medium">{rupiah(d.fee)}</span>
                        </label>
                      ))}
                    </RadioGroup>
                  </fieldset>
                  {notes[g.vendorId] ? (
                    <p className="mt-2 text-xs text-muted-foreground">Catatan: {notes[g.vendorId]}</p>
                  ) : null}
                </section>
              );
            })}

            <section className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-3 font-display text-lg font-bold text-ink">Metode pembayaran</h2>
              <RadioGroup value={payment} onValueChange={setPayment} className="grid gap-2 sm:grid-cols-2">
                {PAYMENT_METHODS.map((m) => (
                  <label key={m.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 text-sm">
                    <RadioGroupItem value={m.id} id={`pay-${m.id}`} />
                    <span className="flex-1 font-medium text-ink">{m.name}</span>
                    <Badge variant="outline" className="shrink-0 text-[10px]">{m.group}</Badge>
                  </label>
                ))}
              </RadioGroup>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Pembayaran bersifat simulasi. Tidak ada transaksi uang sungguhan pada demo ini.
              </p>
            </section>
          </div>

          <aside className="lg:sticky lg:top-24 lg:h-fit">
            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-3 font-display text-lg font-bold text-ink">Ringkasan pesanan</h2>
              <div className="mb-3 flex gap-2">
                <Input
                  value={voucher}
                  onChange={(e) => setVoucher(e.target.value)}
                  placeholder="Kode voucher"
                  aria-label="Kode voucher"
                />
                <Button variant="outline" onClick={applyVoucher}>Pakai</Button>
              </div>
              <dl className="space-y-1.5 text-sm">
                <Row label="Subtotal produk" value={rupiah(subtotal)} />
                <Row label="Ongkos kirim" value={deliveryFee === 0 ? "Gratis" : rupiah(deliveryFee)} />
                <Row label="Biaya layanan" value={rupiah(SERVICE_FEE)} />
                {discount > 0 && <Row label="Diskon voucher" value={`− ${rupiah(discount)}`} tone="text-success" />}
                <Row label="Total berat" value={`${totals.totalKg.toFixed(1)} kg`} />
              </dl>
              <div className="mt-3 flex justify-between border-t border-border pt-3">
                <span className="font-semibold text-ink">Total bayar</span>
                <span className="font-display text-xl font-bold text-maroon">{rupiah(total)}</span>
              </div>
              <Button className="mt-4 w-full" disabled={submitting} onClick={placeOrder}>
                {submitting ? "Memproses…" : "Buat pesanan & bayar"}
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </MarketLayout>
  );
}

function Field({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label htmlFor={id} className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
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
