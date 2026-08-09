import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, Store, ShoppingBag, Wallet, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { MarketLayout } from "@/components/market/market-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PRODUCTS, VENDORS } from "@/lib/market/data";
import { listOrders } from "@/lib/market/orders-store";
import { rupiah, tanggal } from "@/lib/market/format";

export const Route = createFileRoute("/kelola")({
  head: () => ({
    meta: [
      { title: "Konsol Admin Marketplace — MEATHUB" },
      { name: "description", content: "Pantau vendor, transaksi, app fee, dan sengketa marketplace MEATHUB." },
      { property: "og:title", content: "Konsol Admin Marketplace — MEATHUB" },
      { property: "og:description", content: "Pantau vendor, transaksi, app fee, dan sengketa marketplace." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminConsole,
});

function AdminConsole() {
  const orders = listOrders();
  const gmv = orders.filter((o) => o.paymentStatus === "PAID").reduce((s, o) => s + o.total, 0);
  const appFee = orders.filter((o) => o.paymentStatus === "PAID").reduce((s, o) => s + o.appFee, 0);
  const sengketa = orders.filter((o) => o.status === "Dalam Sengketa");

  return (
    <MarketLayout>
      <div className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="font-display text-2xl font-bold text-ink">Konsol admin marketplace</h1>
        <p className="text-sm text-muted-foreground">Ringkasan operasional MEATHUB (data demo).</p>

        <dl className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi icon={ShoppingBag} label="GMV terbayar" value={rupiah(gmv)} />
          <Kpi icon={Wallet} label="Pendapatan app fee" value={rupiah(appFee)} />
          <Kpi icon={Store} label="Vendor aktif" value={String(VENDORS.length)} />
          <Kpi icon={Users} label="Total pesanan" value={String(orders.length)} />
        </dl>

        <Tabs defaultValue="vendor" className="mt-6">
          <TabsList>
            <TabsTrigger value="vendor">Vendor</TabsTrigger>
            <TabsTrigger value="transaksi">Transaksi</TabsTrigger>
            <TabsTrigger value="katalog">Katalog</TabsTrigger>
            <TabsTrigger value="sengketa">Sengketa ({sengketa.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="vendor">
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-muted/60 text-left text-xs uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th scope="col" className="p-3">Vendor</th>
                    <th scope="col" className="p-3">Kota</th>
                    <th scope="col" className="p-3">Rating</th>
                    <th scope="col" className="p-3">Transaksi</th>
                    <th scope="col" className="p-3">Status</th>
                    <th scope="col" className="p-3">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {VENDORS.map((v) => (
                    <tr key={v.id}>
                      <td className="p-3">
                        <Link to="/toko/$slug" params={{ slug: v.slug }} className="font-medium text-ink hover:text-maroon">
                          {v.name}
                        </Link>
                      </td>
                      <td className="p-3 text-muted-foreground">{v.city}</td>
                      <td className="p-3">{v.rating.toFixed(1)}</td>
                      <td className="p-3 text-muted-foreground">{v.transactions.toLocaleString("id-ID")}</td>
                      <td className="p-3"><Badge variant="outline">{v.settlementStatus}</Badge></td>
                      <td className="p-3">
                        <Button size="sm" variant="outline" onClick={() => toast.success(`${v.name} disetujui (demo)`)}>
                          Setujui
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="transaksi">
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-muted/60 text-left text-xs uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th scope="col" className="p-3">Pesanan</th>
                    <th scope="col" className="p-3">Tanggal</th>
                    <th scope="col" className="p-3">Vendor</th>
                    <th scope="col" className="p-3">Nilai</th>
                    <th scope="col" className="p-3">Komisi</th>
                    <th scope="col" className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td className="p-3 font-medium text-ink">{o.id}</td>
                      <td className="p-3 text-muted-foreground">{tanggal(o.createdAt)}</td>
                      <td className="p-3 text-muted-foreground">{o.subOrders.length}</td>
                      <td className="p-3">{rupiah(o.total)}</td>
                      <td className="p-3">{rupiah(o.appFee)}</td>
                      <td className="p-3"><Badge variant="outline">{o.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="katalog">
            <div className="rounded-xl border border-border bg-card p-5 text-sm">
              <p className="text-ink-soft">
                {PRODUCTS.length} produk aktif dari {VENDORS.length} vendor. Produk baru masuk antrean
                moderasi sebelum tampil di katalog publik.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => toast.success("3 produk disetujui (demo)")}>Setujui antrean</Button>
                <Link to="/produk" search={{}}><Button size="sm" variant="outline">Buka katalog publik</Button></Link>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sengketa">
            {sengketa.length === 0 ? (
              <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
                Tidak ada sengketa aktif.
              </p>
            ) : (
              <ul className="space-y-2">
                {sengketa.map((o) => (
                  <li key={o.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 font-semibold text-ink">
                        <ShieldAlert className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
                        <span className="truncate">{o.id}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {tanggal(o.createdAt)} · {rupiah(o.total)}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="shrink-0" onClick={() => toast.success(`Sengketa ${o.id} diselesaikan (demo)`)}>
                      Selesaikan
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MarketLayout>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-maroon" aria-hidden="true" /> {label}
      </dt>
      <dd className="mt-1 font-display text-xl font-bold text-ink">{value}</dd>
    </div>
  );
}
