import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MarketLayout } from "@/components/market/market-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/lib/market/cart";
import { DELIVERY_OPTIONS, vendorById } from "@/lib/market/data";
import { rupiah } from "@/lib/market/format";
import {
  getConfig,
  lineAppFee,
  tierForKg,
  FEE_DISCLOSURE,
  TIER_SEGMENT,
} from "@/lib/market/pricing";

import {
  saveOrder,
  makeTimeline,
  newVerification,
  newReceipt,
  PAYMENT_PATH_LABEL,
  type Order,
  type PaymentPath,
  type SubOrder,
} from "@/lib/market/orders-store";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Kirim Purchase Order — MEATHUB" },
      {
        name: "description",
        content: "Kirim PO ke vendor, pilih pengiriman, dan tentukan jalur pembayaran CBD.",
      },
      { property: "og:title", content: "Kirim Purchase Order — MEATHUB" },
      {
        property: "og:description",
        content: "Kirim PO, pilih pengiriman, dan jalur pembayaran CBD.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

const PICKUP = {
  id: "pickup",
  name: "Ambil sendiri di gudang vendor",
  eta: "Sesuai jam operasional gudang",
  fee: 0,
} as const;
const SHIPPING_CHOICES = [...DELIVERY_OPTIONS, PICKUP];

function CheckoutPage() {
  const nav = useNavigate();
  const config = getConfig();
  const { groups, notes, clear } = useCart();
  const activeGroups = groups.filter((g) => g.lines.some((l) => l.selected));

  const [buyer, setBuyer] = useState({
    name: "Rizky Pratama",
    company: "PT Boga Rasa Nusantara",
    phone: "0812-8890-4471",
    address: "Jl. Kemang Raya No. 21, Jakarta Selatan 12730",
  });
  const [delivery, setDelivery] = useState<Record<string, string>>({});
  const paymentPath: PaymentPath = "CBD_VA";
  const [submitting, setSubmitting] = useState(false);

  const deliveryFor = (vendorId: string) =>
    SHIPPING_CHOICES.find((d) => d.id === (delivery[vendorId] ?? "regular")) ?? SHIPPING_CHOICES[0];

  const computed = useMemo(() => {
    const perVendor = activeGroups.map((g) => {
      const lines = g.lines.filter((l) => l.selected);
      const kg = lines.reduce((k, l) => {
        const v = l.product.variants.find((x) => x.id === l.variantId);
        return k + ((v?.weightGram ?? 1000) / 1000) * l.qty;
      }, 0);
      const appFee = lines.reduce((s, l) => {
        const v = l.product.variants.find((x) => x.id === l.variantId);
        return s + lineAppFee(l.product, v?.weightGram ?? 1000, l.qty, config);
      }, 0);
      const opt = deliveryFor(g.vendorId);
      return {
        group: g,
        lines,
        kg,
        appFee,
        option: opt,
        deliveryFee: kg >= config.freeDeliveryKg ? 0 : opt.fee,
      };
    });
    const subtotal = perVendor.reduce((s, v) => s + v.group.subtotal, 0);
    const appFee = perVendor.reduce((s, v) => s + v.appFee, 0);
    const deliveryFee = perVendor.reduce((s, v) => s + v.deliveryFee, 0);
    const totalKg = perVendor.reduce((s, v) => s + v.kg, 0);
    return {
      perVendor,
      subtotal,
      appFee,
      deliveryFee,
      totalKg,
      total: subtotal + appFee + deliveryFee,
    };
  }, [activeGroups, delivery, config]);

  const tier = tierForKg(computed.totalKg);

  if (activeGroups.length === 0) {
    return (
      <MarketLayout>
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <h1 className="font-display text-2xl font-bold text-ink">Tidak ada item terpilih</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pilih produk di keranjang terlebih dahulu untuk mengirim Purchase Order.
          </p>
          <Link to="/keranjang">
            <Button className="mt-5">Kembali ke keranjang</Button>
          </Link>
        </div>
      </MarketLayout>
    );
  }

  function submitPO() {
    if (!buyer.name || !buyer.phone || !buyer.address) {
      toast.error("Lengkapi nama, telepon, dan alamat pengiriman");
      return;
    }

    setSubmitting(true);
    const createdAt = new Date().toISOString();
    const orderId = `MH-${Date.now().toString().slice(-6)}`;

    const subOrders: SubOrder[] = computed.perVendor.map((v, i) => ({
      id: `${orderId}-${i + 1}`,
      vendorId: v.group.vendorId,
      items: v.lines.map((l) => {
        const variant = l.product.variants.find((x) => x.id === l.variantId);
        const gram = variant?.weightGram ?? 1000;
        return {
          productId: l.product.id,
          name: l.product.name,
          variantLabel: l.variantLabel,
          qty: l.qty,
          unitPrice: l.unitPrice,
          weightKg: (gram / 1000) * l.qty,
          appFee: lineAppFee(l.product, gram, l.qty, config),
        };
      }),
      subtotal: v.group.subtotal,
      appFee: v.appFee,
      deliveryOption: v.option.name,
      deliveryFee: v.deliveryFee,
      note: notes[v.group.vendorId],
      status: "Menunggu Konfirmasi Vendor",
      timeline: makeTimeline("Menunggu Konfirmasi Vendor", createdAt),
      verification: newVerification(createdAt),
      payoutStatus: "Menunggu Konfirmasi Terima",
      fundedBy: "MEATHUB",
    }));

    const order: Order = {
      id: orderId,
      createdAt,
      buyer,
      subOrders,
      subtotal: computed.subtotal,
      appFee: computed.appFee,
      discount: 0,
      deliveryFee: computed.deliveryFee,
      total: computed.total,
      totalKg: computed.totalKg,
      tier,
      paymentPath,
      paymentMethod: PAYMENT_PATH_LABEL[paymentPath],
      paymentStatus: "PENDING",
      status: "Menunggu Konfirmasi Vendor",
      receipt: newReceipt(),
    };
    saveOrder(order);
    clear();
    toast.success(
      `PO ${orderId} terkirim. Vendor wajib konfirmasi stok & gramasi dalam ${config.vendorConfirmationHours} jam.`,
    );
    nav({ to: "/akun/pesanan/$id", params: { id: orderId } });
  }

  return (
    <MarketLayout>
      <div className="mx-auto max-w-7xl px-4 py-6">
        <h1 className="mb-1 font-display text-2xl font-bold text-ink">Kirim Purchase Order</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          Dana baru keluar setelah vendor mengonfirmasi stok dan gramasi fisik, lalu Anda menyetujui
          hasilnya.
        </p>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <section className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-3 font-display text-lg font-bold text-ink">Alamat pengiriman</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  id="nama"
                  label="Nama penanggung jawab"
                  value={buyer.name}
                  onChange={(v) => setBuyer({ ...buyer, name: v })}
                />
                <Field
                  id="perusahaan"
                  label="Nama perusahaan"
                  value={buyer.company}
                  onChange={(v) => setBuyer({ ...buyer, company: v })}
                />
                <Field
                  id="telepon"
                  label="Nomor telepon"
                  value={buyer.phone}
                  onChange={(v) => setBuyer({ ...buyer, phone: v })}
                />
                <div className="sm:col-span-2">
                  <Label
                    htmlFor="alamat"
                    className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground"
                  >
                    Alamat lengkap
                  </Label>
                  <Textarea
                    id="alamat"
                    rows={2}
                    value={buyer.address}
                    onChange={(e) => setBuyer({ ...buyer, address: e.target.value })}
                  />
                </div>
              </div>
            </section>

            {computed.perVendor.map((v) => {
              const vendor = vendorById(v.group.vendorId);
              return (
                <section
                  key={v.group.vendorId}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <h2 className="mb-2 font-semibold text-ink">{vendor.name}</h2>
                  <ul className="mb-3 space-y-1 text-sm">
                    {v.lines.map((l) => (
                      <li key={l.key} className="flex justify-between gap-3">
                        <span className="min-w-0 truncate text-ink-soft">
                          {l.product.name} · {l.variantLabel} × {l.qty}
                        </span>
                        <span className="shrink-0">{rupiah(l.unitPrice * l.qty)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Berat: {v.kg.toFixed(1)} kg</span>
                    <span>App fee: {rupiah(v.appFee)}</span>
                    <span>
                      {v.deliveryFee === 0 ? "Ongkir gratis" : `Ongkir ${rupiah(v.deliveryFee)}`}
                    </span>
                  </div>
                  <fieldset>
                    <legend className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Metode pengiriman
                    </legend>
                    <RadioGroup
                      value={delivery[v.group.vendorId] ?? "regular"}
                      onValueChange={(val) =>
                        setDelivery((p) => ({ ...p, [v.group.vendorId]: val }))
                      }
                      className="gap-2"
                    >
                      {SHIPPING_CHOICES.map((d) => (
                        <label
                          key={d.id}
                          className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 text-sm"
                        >
                          <RadioGroupItem value={d.id} id={`${v.group.vendorId}-${d.id}`} />
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium text-ink">{d.name}</span>
                            <span className="block text-xs text-muted-foreground">{d.eta}</span>
                          </span>
                          <span className="shrink-0 text-sm font-medium">
                            {d.fee === 0 ? "Gratis" : rupiah(d.fee)}
                          </span>
                        </label>
                      ))}
                    </RadioGroup>
                  </fieldset>
                  {notes[v.group.vendorId] ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Catatan: {notes[v.group.vendorId]}
                    </p>
                  ) : null}
                </section>
              );
            })}

            <section className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-1 font-display text-lg font-bold text-ink">Pembayaran</h2>
              <p className="mb-3 text-xs text-muted-foreground">
                Bayar per pesanan setelah vendor mengonfirmasi stok. Tidak ada saldo atau deposit
                yang perlu Anda simpan di MEATHUB.
              </p>
              <div className="rounded-lg border border-border p-3 text-sm">
                <div className="font-medium text-ink">Virtual Account, QRIS, atau gerai retail</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Dana masuk ke rekening MEATHUB dan ditahan sampai Anda mengonfirmasi barang
                  diterima, baru diteruskan ke vendor.
                </p>
              </div>
            </section>
          </div>

          <aside className="lg:sticky lg:top-24 lg:h-fit">
            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-1 font-display text-lg font-bold text-ink">Landed price</h2>
              <div className="mb-3 flex items-center gap-2">
                <Badge variant="outline" className="border-maroon/30 text-maroon">
                  Tier {tier}
                </Badge>
                <span className="text-[11px] text-muted-foreground">{TIER_SEGMENT[tier]}</span>
              </div>
              <dl className="space-y-1.5 text-sm">
                <Row label="Harga vendor" value={rupiah(computed.subtotal)} />
                <Row
                  label={`App fee MEATHUB (${computed.totalKg.toFixed(1)} kg)`}
                  value={rupiah(computed.appFee)}
                />
                <Row
                  label="Ongkos kirim"
                  value={computed.deliveryFee === 0 ? "Gratis" : rupiah(computed.deliveryFee)}
                />
              </dl>
              <div className="mt-3 flex justify-between border-t border-border pt-3">
                <span className="font-semibold text-ink">Total landed</span>
                <span className="font-display text-xl font-bold text-maroon">
                  {rupiah(computed.total)}
                </span>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">{FEE_DISCLOSURE}</p>
              <Button className="mt-4 w-full" disabled={submitting} onClick={submitPO}>
                {submitting ? "Mengirim PO…" : "Kirim Purchase Order"}
              </Button>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Vendor wajib konfirmasi fisik dalam {config.vendorConfirmationHours} jam. Lewat
                batas → PO batal otomatis.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </MarketLayout>
  );
}

function PayOption({
  id,
  title,
  desc,
  badge,
}: {
  id: string;
  title: string;
  desc: string;
  badge: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 text-sm">
      <RadioGroupItem value={id} id={`path-${id}`} className="mt-1" />
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-ink">{title}</span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
      <Badge variant="outline" className="shrink-0 text-[10px]">
        {badge}
      </Badge>
    </label>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label
        htmlFor={id}
        className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground"
      >
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
