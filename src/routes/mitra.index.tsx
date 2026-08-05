import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { TrendingUp, Package, Wallet, Star, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { MarketLayout } from "@/components/market/market-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PRODUCTS, VENDORS } from "@/lib/market/data";
import { listOrders, commissionOf } from "@/lib/market/orders-store";
import { rupiah, tanggal } from "@/lib/market/format";

export const Route = createFileRoute("/mitra/")({
  head: () => ({
    meta: [
      { title: "Dasbor Vendor — MEATHUB" },
      { name: "description", content: "Kelola produk, pesanan masuk, dan pencairan dana sebagai vendor MEATHUB." },
      { property: "og:title", content: "Dasbor Vendor — MEATHUB" },
      { property: "og:description", content: "Kelola produk, pesanan masuk, dan pencairan dana vendor." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VendorDashboard,
});

const VENDOR = VENDORS[0];

function VendorDashboard() {
  const [products] = useState(() => PRODUCTS.filter((p) => p.vendorId === VENDOR.id));
  const subOrders = listOrders().flatMap((o) =>
    o.subOrders.filter((so) => so.vendorId === VENDOR.id).map((so) => ({ so, order: o })),
  );
  const omzet = subOrders.reduce((s, x) => s + x.so.subtotal, 0);
  const komisi = commissionOf(omzet);

  return (
    <MarketLayout>
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-bold text-ink">Dasbor vendor</h1>
            <p className="truncate text-sm text-muted-foreground">{VENDOR.name} · {VENDOR.city}</p>
          </div>
          <Button className="shrink-0 gap-2" onClick={() => toast.info("Form tambah produk tersedia pada versi berikutnya (demo).")}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Tambah produk
          </Button>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi icon={TrendingUp} label="Omzet 30 hari" value={rupiah(omzet)} />
          <Kpi icon={Package} label="Pesanan masuk" value={String(subOrders.length)} />
          <Kpi icon={Wallet} label="Estimasi cair" value={rupiah(omzet - komisi)} />
          <Kpi icon={Star} label="Rating toko" value={VENDOR.rating.toFixed(1)} />
        </dl>

        <Tabs defaultValue="pesanan" className="mt-6">
          <TabsList>
            <TabsTrigger value="pesanan">Pesanan</TabsTrigger>
            <TabsTrigger value="produk">Produk ({products.length})</TabsTrigger>
            <TabsTrigger value="payout">Pencairan</TabsTrigger>
          </TabsList>

          <TabsContent value="pesanan">
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-muted/60 text-left text-xs uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th scope="col" className="p-3">Sub-pesanan</th>
                    <th scope="col" className="p-3">Tanggal</th>
                    <th scope="col" className="p-3">Item</th>
                    <th scope="col" className="p-3">Nilai</th>
                    <th scope="col" className="p-3">Status</th>
                    <th scope="col" className="p-3">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {subOrders.map(({ so, order }) => (
                    <tr key={so.id}>
                      <td className="p-3 font-medium text-ink">{so.id}</td>
                      <td className="p-3 text-muted-foreground">{tanggal(order.createdAt)}</td>
                      <td className="p-3 text-muted-foreground">{so.items.length} item</td>
                      <td className="p-3">{rupiah(so.subtotal)}</td>
                      <td className="p-3"><Badge variant="outline">{so.status}</Badge></td>
                      <td className="p-3">
                        <Button size="sm" variant="outline" onClick={() => toast.success(`Pesanan ${so.id} dikonfirmasi (demo)`)}>
                          Konfirmasi
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="produk">
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-muted/60 text-left text-xs uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th scope="col" className="p-3">Produk</th>
                    <th scope="col" className="p-3">Harga</th>
                    <th scope="col" className="p-3">Stok</th>
                    <th scope="col" className="p-3">Terjual</th>
                    <th scope="col" className="p-3">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td className="p-3">
                        <Link to="/produk/$id" params={{ id: p.id }} className="font-medium text-ink hover:text-maroon">
                          {p.name}
                        </Link>
                      </td>
                      <td className="p-3">{rupiah(p.price)}</td>
                      <td className="p-3">
                        <span className={p.stock > 0 ? "text-success" : "text-destructive"}>{p.stock}</span>
                      </td>
                      <td className="p-3 text-muted-foreground">{p.sold}</td>
                      <td className="p-3">
                        <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => toast.info("Editor produk tersedia pada versi berikutnya (demo).")}>
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Ubah
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="payout">
            <div className="rounded-xl border border-border bg-card p-5">
              <dl className="grid gap-3 sm:grid-cols-3">
                <Kpi label="Omzet kotor" value={rupiah(omzet)} />
                <Kpi label="Komisi platform 5%" value={`− ${rupiah(komisi)}`} />
                <Kpi label="Dana bersih" value={rupiah(omzet - komisi)} />
              </dl>
              <p className="mt-4 text-sm text-muted-foreground">
                Pencairan dijadwalkan T+3 hari kerja setelah pesanan berstatus Terkirim. Status mitra saat
                ini: <strong className="text-ink">{VENDOR.settlementStatus}</strong>.
              </p>
              <Button className="mt-4" onClick={() => toast.success("Permintaan pencairan dikirim (demo)")}>
                Ajukan pencairan
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MarketLayout>
  );
}

function Kpi({ icon: Icon, label, value }: { icon?: typeof Package; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
        {Icon ? <Icon className="h-3.5 w-3.5 text-maroon" aria-hidden="true" /> : null}
        {label}
      </dt>
      <dd className="mt-1 font-display text-xl font-bold text-ink">{value}</dd>
    </div>
  );
}
