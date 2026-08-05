import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Circle, Truck, MapPin, Receipt } from "lucide-react";
import { toast } from "sonner";
import { MarketLayout } from "@/components/market/market-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getOrder, STATUS_TONE } from "@/lib/market/orders-store";
import { vendorById } from "@/lib/market/data";
import { rupiah, tanggalJam } from "@/lib/market/format";

export const Route = createFileRoute("/akun/pesanan/$id")({
  head: () => ({
    meta: [
      { title: "Detail Pesanan — MEATHUB" },
      { name: "description", content: "Rincian pesanan, status pengiriman per vendor, dan invoice MEATHUB." },
      { property: "og:title", content: "Detail Pesanan — MEATHUB" },
      { property: "og:description", content: "Rincian pesanan dan status pengiriman per vendor." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderDetail,
});

function OrderDetail() {
  const { id } = Route.useParams();
  const order = getOrder(id);

  if (!order) {
    return (
      <MarketLayout>
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <h1 className="font-display text-2xl font-bold text-ink">Pesanan tidak ditemukan</h1>
          <Link to="/akun/pesanan">
            <Button className="mt-4">Kembali ke daftar pesanan</Button>
          </Link>
        </div>
      </MarketLayout>
    );
  }

  return (
    <MarketLayout>
      <div className="mx-auto max-w-4xl px-4 py-6">
        <nav aria-label="Breadcrumb" className="mb-3 text-xs text-muted-foreground">
          <Link to="/akun" className="hover:text-maroon">Akun</Link> /{" "}
          <Link to="/akun/pesanan" className="hover:text-maroon">Pesanan</Link> /{" "}
          <span className="text-ink">{order.id}</span>
        </nav>

        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold text-ink">Pesanan {order.id}</h1>
            <p className="text-sm text-muted-foreground">
              Dibuat {tanggalJam(order.createdAt)} · {order.paymentMethod}
            </p>
          </div>
          <Badge variant="outline" className={`shrink-0 ${STATUS_TONE[order.status] ?? ""}`}>
            {order.status}
          </Badge>
        </div>

        <section className="mt-4 rounded-xl border border-border bg-card p-4">
          <h2 className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <MapPin className="h-4 w-4 text-maroon" aria-hidden="true" /> Alamat pengiriman
          </h2>
          <p className="text-sm text-ink-soft">
            {order.buyer.name} · {order.buyer.phone}
            <br />
            {order.buyer.company}
            <br />
            {order.buyer.address}
          </p>
        </section>

        {order.subOrders.map((so) => {
          const vendor = vendorById(so.vendorId);
          return (
            <section key={so.id} className="mt-4 rounded-xl border border-border bg-card p-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <Link
                    to="/toko/$slug"
                    params={{ slug: vendor.slug }}
                    className="truncate font-semibold text-ink hover:text-maroon"
                  >
                    {vendor.name}
                  </Link>
                  <div className="text-xs text-muted-foreground">Sub-pesanan {so.id}</div>
                </div>
                <Badge variant="outline" className={`shrink-0 ${STATUS_TONE[so.status] ?? ""}`}>
                  {so.status}
                </Badge>
              </div>

              <ul className="mt-3 divide-y divide-border text-sm">
                {so.items.map((it) => (
                  <li key={it.productId} className="flex justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <Link to="/produk/$id" params={{ id: it.productId }} className="hover:text-maroon">
                        {it.name}
                      </Link>
                      <span className="block text-xs text-muted-foreground">
                        {it.variantLabel} × {it.qty}
                      </span>
                    </span>
                    <span className="shrink-0">{rupiah(it.unitPrice * it.qty)}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Truck className="h-3.5 w-3.5" aria-hidden="true" /> {so.deliveryOption} ·{" "}
                {so.deliveryFee === 0 ? "Gratis" : rupiah(so.deliveryFee)}
              </div>
              {so.note ? <p className="mt-1 text-xs text-muted-foreground">Catatan: {so.note}</p> : null}

              <ol className="mt-4 space-y-2">
                {so.timeline.map((t) => (
                  <li key={t.label} className="flex items-start gap-2 text-sm">
                    {t.done ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                    ) : (
                      <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden="true" />
                    )}
                    <span className={t.done ? "text-ink" : "text-muted-foreground"}>
                      {t.label}
                      <span className="block text-[11px] text-muted-foreground">{tanggalJam(t.at)}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          );
        })}

        <section className="mt-4 rounded-xl border border-border bg-card p-4">
          <h2 className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Receipt className="h-4 w-4 text-maroon" aria-hidden="true" /> Rincian pembayaran
          </h2>
          <dl className="space-y-1.5 text-sm">
            <Row label="Subtotal produk" value={rupiah(order.subtotal)} />
            <Row label="Ongkos kirim" value={order.deliveryFee === 0 ? "Gratis" : rupiah(order.deliveryFee)} />
            <Row label="Biaya layanan" value={rupiah(order.serviceFee)} />
            {order.discount > 0 && <Row label="Diskon" value={`− ${rupiah(order.discount)}`} tone="text-success" />}
          </dl>
          <div className="mt-2 flex justify-between border-t border-border pt-2">
            <span className="font-semibold text-ink">Total</span>
            <span className="font-display text-xl font-bold text-maroon">{rupiah(order.total)}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => toast.info("Invoice PDF tersedia pada versi berikutnya (demo).")}>
              Unduh invoice
            </Button>
            {order.status === "Menunggu Pembayaran" && (
              <Link to="/bayar/$orderId" params={{ orderId: order.id }} search={{ metode: "qris" }}>
                <Button size="sm">Bayar sekarang</Button>
              </Link>
            )}
            <Button variant="outline" size="sm" onClick={() => toast.info("Pengajuan komplain akan diproses tim MEATHUB (demo).")}>
              Ajukan komplain
            </Button>
          </div>
        </section>
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
