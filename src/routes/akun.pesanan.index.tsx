import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { MarketLayout } from "@/components/market/market-layout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listOrders, ORDER_STATUSES, STATUS_TONE, type OrderStatus } from "@/lib/market/orders-store";
import { vendorById } from "@/lib/market/data";
import { rupiah, tanggal } from "@/lib/market/format";

export const Route = createFileRoute("/akun/pesanan/")({
  head: () => ({
    meta: [
      { title: "Pesanan Saya — MEATHUB" },
      { name: "description", content: "Lacak status pesanan multi-vendor dan riwayat pembelian MEATHUB." },
      { property: "og:title", content: "Pesanan Saya — MEATHUB" },
      { property: "og:description", content: "Lacak status pesanan dan riwayat pembelian Anda." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrdersPage,
});

const TABS: (OrderStatus | "Semua")[] = [
  "Semua",
  "Menunggu Pembayaran",
  "Sedang Disiapkan",
  "Dalam Pengiriman",
  "Selesai",
  "Dibatalkan",
];

function OrdersPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Semua");
  const [q, setQ] = useState("");
  const orders = listOrders().filter((o) => {
    if (tab !== "Semua" && o.status !== tab) return false;
    if (q && !o.id.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <MarketLayout>
      <div className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="mb-4 font-display text-2xl font-bold text-ink">Pesanan saya</h1>

        <div className="mb-4 flex flex-col gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nomor pesanan"
              aria-label="Cari nomor pesanan"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => (
              <Button
                key={t}
                size="sm"
                variant={tab === t ? "default" : "outline"}
                onClick={() => setTab(t)}
              >
                {t}
              </Button>
            ))}
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <p className="font-display text-lg font-bold text-ink">Belum ada pesanan di kategori ini</p>
            <Link to="/produk" search={{}}>
              <Button className="mt-4">Mulai belanja</Button>
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {orders.map((o) => (
              <li key={o.id} className="rounded-xl border border-border bg-card p-4">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-ink">{o.id}</div>
                    <div className="text-xs text-muted-foreground">
                      {tanggal(o.createdAt)} · {o.paymentMethod}
                    </div>
                  </div>
                  <Badge variant="outline" className={`shrink-0 ${STATUS_TONE[o.status] ?? ""}`}>
                    {o.status}
                  </Badge>
                </div>

                <ul className="mt-3 space-y-2">
                  {o.subOrders.map((so) => (
                    <li key={so.id} className="rounded-lg bg-muted/50 p-3 text-sm">
                      <div className="mb-1 truncate text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        {vendorById(so.vendorId).name}
                      </div>
                      {so.items.map((it) => (
                        <div key={it.productId} className="flex justify-between gap-3">
                          <span className="min-w-0 truncate text-ink-soft">
                            {it.name} × {it.qty}
                          </span>
                          <span className="shrink-0">{rupiah(it.unitPrice * it.qty)}</span>
                        </div>
                      ))}
                    </li>
                  ))}
                </ul>

                <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <div className="min-w-0 text-sm">
                    Total: <span className="font-display font-bold text-maroon">{rupiah(o.total)}</span>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {o.status === "Menunggu Pembayaran" && (
                      <Link to="/bayar/$orderId" params={{ orderId: o.id }} search={{ metode: "qris" }}>
                        <Button size="sm">Bayar sekarang</Button>
                      </Link>
                    )}
                    <Link to="/akun/pesanan/$id" params={{ id: o.id }}>
                      <Button size="sm" variant="outline">Detail</Button>
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-[11px] text-muted-foreground">
          Status yang tersedia: {ORDER_STATUSES.join(" · ")}
        </p>
      </div>
    </MarketLayout>
  );
}
