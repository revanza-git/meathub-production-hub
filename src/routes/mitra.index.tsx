import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { TrendingUp, Package, Wallet, Star, Plus, Pencil, Clock, Truck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { MarketLayout } from "@/components/market/market-layout";
import { RoleNav } from "@/components/market/role-nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PRODUCTS, VENDORS } from "@/lib/market/data";
import {
  listVendorSubOrders,
  submitVendorConfirmation,
  markDispatched,
  markDelivered,
  cancelOrder,
  STATUS_TONE,
} from "@/lib/market/orders-store";
import { rupiah, tanggal, tanggalJam } from "@/lib/market/format";
import { getConfig } from "@/lib/market/pricing";

export const Route = createFileRoute("/mitra/")({
  head: () => ({
    meta: [
      { title: "Dasbor Vendor — MEATHUB" },
      { name: "description", content: "Konfirmasi PO, kirim dari cold storage sendiri, dan ajukan pencairan sebagai vendor MEATHUB." },
      { property: "og:title", content: "Dasbor Vendor — MEATHUB" },
      { property: "og:description", content: "Konfirmasi PO, pengiriman, dan pencairan dana vendor." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VendorDashboard,
});

const VENDOR = VENDORS[0];

type ConfirmForm = { weight: string; slaughter: string; expiry: string; photos: string; notes: string };
type ShipForm = { courier: string; trackingNo: string };

function VendorDashboard() {
  const config = getConfig();
  const [products] = useState(() => PRODUCTS.filter((p) => p.vendorId === VENDOR.id));
  const [confirmForm, setConfirmForm] = useState<Record<string, ConfirmForm>>({});
  const [shipForm, setShipForm] = useState<Record<string, ShipForm>>({});

  // Orders live in localStorage; re-read after every mutation (SSR starts from seed data).
  const [rows, setRows] = useState(() => listVendorSubOrders(VENDOR.id));
  const refresh = useCallback(() => setRows(listVendorSubOrders(VENDOR.id)), []);
  useEffect(() => { refresh(); }, [refresh]);
  const omzet = rows.reduce((s, x) => s + x.so.subtotal, 0);
  const appFee = rows.reduce((s, x) => s + x.so.appFee, 0);

  const perluKonfirmasi = rows.filter((r) => r.so.status === "Menunggu Konfirmasi Vendor");
  const perluDikirim = rows.filter(
    (r) => r.so.status === "Diproses & Dikirim" && !r.so.shipment?.dispatchedAt,
  );
  const dalamPerjalanan = rows.filter(
    (r) => r.so.status === "Diproses & Dikirim" && r.so.shipment?.dispatchedAt,
  );
  const menungguTerima = rows.filter((r) => r.so.status === "Cek Terima Pembeli");

  const cf = (id: string): ConfirmForm =>
    confirmForm[id] ?? { weight: "", slaughter: "", expiry: "", photos: "3", notes: "" };
  const setCf = (id: string, patch: Partial<ConfirmForm>) =>
    setConfirmForm((p) => ({ ...p, [id]: { ...cf(id), ...patch } }));
  const sf = (id: string): ShipForm => shipForm[id] ?? { courier: "Armada vendor", trackingNo: "" };
  const setSf = (id: string, patch: Partial<ShipForm>) =>
    setShipForm((p) => ({ ...p, [id]: { ...sf(id), ...patch } }));

  return (
    <MarketLayout>
      <div className="mx-auto max-w-6xl px-4 py-6">
        <RoleNav current="vendor" />
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-bold text-ink">Dasbor vendor</h1>
            <p className="truncate text-sm text-muted-foreground">
              {VENDOR.name} · SLA konfirmasi {config.vendorConfirmationHours} jam per PO
            </p>
          </div>
          <Button className="shrink-0 gap-2" onClick={() => toast.info("Form tambah produk tersedia pada versi berikutnya (demo).")}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Tambah produk
          </Button>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi icon={Clock} label="Perlu konfirmasi" value={String(perluKonfirmasi.length)} />
          <Kpi icon={Truck} label="Perlu dikirim" value={String(perluDikirim.length)} />
          <Kpi icon={TrendingUp} label="Omzet 30 hari" value={rupiah(omzet)} />
          <Kpi icon={Star} label="Rating toko" value={VENDOR.rating.toFixed(1)} />
        </dl>

        <Tabs defaultValue="konfirmasi" className="mt-6">
          <TabsList className="flex-wrap">
            <TabsTrigger value="konfirmasi">Perlu konfirmasi ({perluKonfirmasi.length})</TabsTrigger>
            <TabsTrigger value="kirim">Perlu dikirim ({perluDikirim.length})</TabsTrigger>
            <TabsTrigger value="terima">Menunggu terima ({dalamPerjalanan.length + menungguTerima.length})</TabsTrigger>
            <TabsTrigger value="produk">Produk ({products.length})</TabsTrigger>
            <TabsTrigger value="payout">Pencairan</TabsTrigger>
          </TabsList>

          <TabsContent value="konfirmasi">
            {perluKonfirmasi.length === 0 ? (
              <Empty text="Tidak ada PO yang menunggu konfirmasi stok." />
            ) : (
              <div className="space-y-4">
                {perluKonfirmasi.map(({ order, so }) => {
                  const f = cf(so.id);
                  return (
                    <section key={so.id} className="rounded-xl border border-border bg-card p-4">
                      <Head order={order.id} sub={so.id} company={order.buyer.company} at={order.createdAt} />
                      <Badge variant="outline" className="mt-2 gap-1">
                        <Clock className="h-3 w-3" aria-hidden="true" /> Batas {tanggalJam(so.verification.deadlineAt)}
                      </Badge>
                      <Items so={so} />
                      <div className="mt-3 grid gap-3 sm:grid-cols-4">
                        <Field id={`w-${so.id}`} label="Gramasi aktual (kg)" value={f.weight} onChange={(v) => setCf(so.id, { weight: v })} />
                        <Field id={`s-${so.id}`} label="Tanggal potong" type="date" value={f.slaughter} onChange={(v) => setCf(so.id, { slaughter: v })} />
                        <Field id={`e-${so.id}`} label="Expired" type="date" value={f.expiry} onChange={(v) => setCf(so.id, { expiry: v })} />
                        <Field id={`p-${so.id}`} label="Jumlah foto" value={f.photos} onChange={(v) => setCf(so.id, { photos: v })} />
                      </div>
                      <Textarea
                        className="mt-2"
                        rows={2}
                        placeholder="Catatan kondisi barang"
                        value={f.notes}
                        onChange={(e) => setCf(so.id, { notes: e.target.value })}
                        aria-label="Catatan kondisi barang"
                      />
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            const kg = Number(f.weight);
                            if (!Number.isFinite(kg) || kg <= 0) return toast.error("Isi gramasi aktual.");
                            if (!f.slaughter || !f.expiry) return toast.error("Isi tanggal potong dan tanggal expired.");
                            submitVendorConfirmation(order.id, so.id, {
                              actualWeightKg: kg,
                              slaughterDate: f.slaughter,
                              expiryDate: f.expiry,
                              photoCount: Number(f.photos) || 0,
                              notes: f.notes,
                            });
                            toast.success("Konfirmasi terkirim. Menunggu persetujuan pembeli.");
                            refresh();
                          }}
                        >
                          Kirim konfirmasi
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive"
                          onClick={() => {
                            cancelOrder(order.id);
                            toast.success("PO ditandai batal (stok tidak tersedia).");
                            refresh();
                          }}
                        >
                          Stok tidak tersedia — batalkan
                        </Button>
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="kirim">
            {perluDikirim.length === 0 ? (
              <Empty text="Tidak ada PO terbayar yang menunggu pengiriman." />
            ) : (
              <div className="space-y-4">
                {perluDikirim.map(({ order, so }) => {
                  const f = sf(so.id);
                  return (
                    <section key={so.id} className="rounded-xl border border-border bg-card p-4">
                      <Head order={order.id} sub={so.id} company={order.buyer.company} at={order.createdAt} />
                      <p className="mt-1 text-xs text-muted-foreground">Kirim ke: {order.buyer.address}</p>
                      <Items so={so} />
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <Field id={`c-${so.id}`} label="Armada / kurir" value={f.courier} onChange={(v) => setSf(so.id, { courier: v })} />
                        <Field id={`t-${so.id}`} label="Nomor resi / surat jalan" value={f.trackingNo} onChange={(v) => setSf(so.id, { trackingNo: v })} />
                      </div>
                      <Button
                        className="mt-3"
                        size="sm"
                        onClick={() => {
                          if (!f.courier.trim()) return toast.error("Isi armada atau kurir pengirim.");
                          markDispatched(order.id, so.id, { courier: f.courier.trim(), trackingNo: f.trackingNo.trim() });
                          toast.success("Sub-PO ditandai dikirim.");
                          refresh();
                        }}
                      >
                        Tandai dikirim
                      </Button>
                    </section>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="terima">
            {dalamPerjalanan.length + menungguTerima.length === 0 ? (
              <Empty text="Tidak ada pengiriman berjalan." />
            ) : (
              <div className="space-y-3">
                {dalamPerjalanan.map(({ order, so }) => (
                  <div key={so.id} className="rounded-xl border border-border bg-card p-4">
                    <Head order={order.id} sub={so.id} company={order.buyer.company} at={order.createdAt} />
                    <p className="mt-1 text-xs text-muted-foreground">
                      {so.shipment?.courier} · resi {so.shipment?.trackingNo || "—"} · berangkat{" "}
                      {so.shipment?.dispatchedAt ? tanggalJam(so.shipment.dispatchedAt) : "—"}
                    </p>
                    <Button
                      className="mt-3"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        markDelivered(order.id, so.id);
                        toast.success("Barang ditandai sampai. Pembeli masuk masa cek terima.");
                        refresh();
                      }}
                    >
                      Tandai barang sampai
                    </Button>
                  </div>
                ))}
                {menungguTerima.map(({ order, so }) => (
                  <div key={so.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-4 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block text-ink">PO {order.id} · {so.id}</span>
                        <span className="block text-xs text-muted-foreground">
                          Menunggu konfirmasi terima pembeli (auto-confirm {config.autoConfirmDays} hari)
                        </span>
                      </span>
                    </span>
                    <Badge variant="outline" className={STATUS_TONE[so.status] ?? ""}>{so.status}</Badge>
                  </div>
                ))}
              </div>
            )}
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
                <Kpi icon={Package} label="Omzet vendor" value={rupiah(omzet)} />
                <Kpi icon={Wallet} label="App fee dibayar pembeli" value={rupiah(appFee)} />
                <Kpi icon={Wallet} label="Dana diterima vendor" value={rupiah(omzet)} />
              </dl>
              <p className="mt-4 text-sm text-muted-foreground">
                Harga vendor dibayar penuh — app fee MEATHUB ditanggung pembeli di luar harga vendor. Pencairan
                dapat diajukan setelah pembeli menekan Done atau setelah auto-confirm, lalu disetujui admin. Status
                mitra saat ini: <strong className="text-ink">{VENDOR.settlementStatus}</strong>.
              </p>
              <Button className="mt-4" onClick={() => toast.success("Permintaan pencairan dikirim, menunggu persetujuan admin (demo)")}>
                Ajukan pencairan
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MarketLayout>
  );
}

function Head({ order, sub, company, at }: { order: string; sub: string; company: string; at: string }) {
  return (
    <div className="min-w-0">
      <div className="font-semibold text-ink">PO {order} · {sub}</div>
      <div className="text-xs text-muted-foreground">{company} · {tanggal(at)}</div>
    </div>
  );
}

function Items({ so }: { so: { items: { productId: string; name: string; variantLabel: string; qty: number; unitPrice: number; weightKg: number }[] } }) {
  return (
    <ul className="mt-3 divide-y divide-border text-sm">
      {so.items.map((it) => (
        <li key={it.productId} className="flex justify-between gap-3 py-2">
          <span className="min-w-0 truncate text-ink-soft">
            {it.name} · {it.variantLabel} × {it.qty} ({it.weightKg.toFixed(1)} kg)
          </span>
          <span className="shrink-0">{rupiah(it.unitPrice * it.qty)}</span>
        </li>
      ))}
    </ul>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">{text}</p>;
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <Label htmlFor={id} className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
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
