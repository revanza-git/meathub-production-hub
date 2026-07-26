import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getMyRoles } from "@/lib/roles.functions";
import { listMasters, listProducts } from "@/lib/catalog.functions";
import { listVendorOffers, submitInventory, transitionOffer, upsertOffer } from "@/lib/offers.functions";

export const Route = createFileRoute("/_authenticated/partner/vendor/offers")({
  head: () => ({ meta: [{ title: "Offers Vendor — SBMEAT" }, { name: "robots", content: "noindex" }] }),
  component: VendorOffersPage,
});

const ZONES = ["JKT_INNER", "JKT_OUTER", "BODETABEK"] as const;

function VendorOffersPage() {
  const rolesFn = useServerFn(getMyRoles);
  const { data: roles, isLoading } = useQuery({ queryKey: ["my-roles"], queryFn: () => rolesFn() });
  if (isLoading) return <div className="p-8 text-sm text-muted-foreground">Memuat…</div>;
  const vendorMemberships = (roles?.memberships ?? []).filter((m) =>
    ["vendor_admin", "vendor_operator"].includes(m.role) && m.organization.status === "APPROVED",
  );
  if (vendorMemberships.length === 0) return <Navigate to="/partner" replace />;

  return (
    <AppShell title="SBMEAT Vendor" subtitle="Offers & inventory">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        {vendorMemberships.map((m) => (
          <VendorSection key={m.organization_id} vendorId={m.organization_id} vendorName={m.organization.display_name} />
        ))}
      </div>
    </AppShell>
  );
}

function VendorSection({ vendorId, vendorName }: { vendorId: string; vendorName: string }) {
  const qc = useQueryClient();
  const offersFn = useServerFn(listVendorOffers);
  const productsFn = useServerFn(listProducts);
  const upsertFn = useServerFn(upsertOffer);
  const transFn = useServerFn(transitionOffer);
  const [creating, setCreating] = useState(false);

  const offers = useQuery({ queryKey: ["vendor-offers", vendorId], queryFn: () => offersFn({ data: { vendor_id: vendorId } }) });
  const products = useQuery({ queryKey: ["products-active"], queryFn: () => productsFn({ data: { status: "ACTIVE" } }) });

  const trans = useMutation({
    mutationFn: (v: { id: string; to: "DRAFT" | "ACTIVE" | "SUSPENDED" | "ARCHIVED" }) => transFn({ data: v }),
    onSuccess: () => { toast.success("Status offer diperbarui"); qc.invalidateQueries({ queryKey: ["vendor-offers", vendorId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-lg font-semibold">{vendorName}</h2>
          <p className="text-xs text-muted-foreground">Kelola offer & inventory untuk vendor ini.</p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)} disabled={!products.data || products.data.length === 0}>
          + Offer baru
        </Button>
      </div>

      {creating ? (
        <OfferForm
          vendorId={vendorId}
          products={products.data ?? []}
          onCancel={() => setCreating(false)}
          onSaved={() => { setCreating(false); qc.invalidateQueries({ queryKey: ["vendor-offers", vendorId] }); }}
          save={(payload) => upsertFn({ data: payload })}
        />
      ) : null}

      {offers.isLoading ? <div className="text-sm text-muted-foreground">Memuat…</div> : null}
      <div className="grid gap-3">
        {(offers.data ?? []).map((o) => (
          <Card key={o.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{o.product?.name}</CardTitle>
                  <CardDescription>
                    {o.product?.sku} · {o.purchase_type} · Rp {Number(o.base_price_per_kg).toLocaleString("id-ID")}/kg · min {o.min_qty} step {o.qty_step}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{o.service_zones.join(",")}</Badge>
                  <Badge>{o.status}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {(["DRAFT", "ACTIVE", "SUSPENDED", "ARCHIVED"] as const).filter((s) => s !== o.status).map((s) => (
                  <Button key={s} size="sm" variant={s === "ACTIVE" ? "default" : "outline"}
                    disabled={trans.isPending} onClick={() => trans.mutate({ id: o.id, to: s })}>→ {s}</Button>
                ))}
              </div>
              <InventoryPanel offerId={o.id} latest={o.latest_inventory} />
            </CardContent>
          </Card>
        ))}
        {offers.data && offers.data.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            Belum ada offer.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function OfferForm({
  vendorId, products, onCancel, onSaved, save,
}: {
  vendorId: string;
  products: Awaited<ReturnType<typeof listProducts>>;
  onCancel: () => void; onSaved: () => void;
  save: (p: {
    vendor_id: string; product_id: string; purchase_type: "LOAF" | "CARTON" | "RETAIL";
    base_price_per_kg: number; min_qty: number; qty_step: number;
    service_zones: ("JKT_INNER" | "JKT_OUTER" | "BODETABEK")[];
  }) => Promise<unknown>;
}) {
  const [f, setF] = useState({
    product_id: products[0]?.id ?? "",
    purchase_type: "LOAF" as "LOAF" | "CARTON" | "RETAIL",
    price: "",
    min_qty: "1",
    qty_step: "1",
    zones: ["JKT_INNER", "JKT_OUTER", "BODETABEK"] as ("JKT_INNER" | "JKT_OUTER" | "BODETABEK")[],
  });
  const [busy, setBusy] = useState(false);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Offer baru</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label className="text-xs uppercase text-muted-foreground">Produk</Label>
            <Select value={f.product_id} onValueChange={(v) => setF({ ...f, product_id: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase text-muted-foreground">Purchase type</Label>
            <Select value={f.purchase_type} onValueChange={(v) => setF({ ...f, purchase_type: v as typeof f.purchase_type })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["LOAF", "CARTON", "RETAIL"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase text-muted-foreground">Harga dasar (Rp/kg)</Label>
            <Input type="number" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Min qty</Label>
              <Input type="number" step="0.01" value={f.min_qty} onChange={(e) => setF({ ...f, min_qty: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Step</Label>
              <Input type="number" step="0.01" value={f.qty_step} onChange={(e) => setF({ ...f, qty_step: e.target.value })} />
            </div>
          </div>
        </div>
        <div>
          <Label className="mb-1 block text-xs uppercase text-muted-foreground">Service zones</Label>
          <div className="flex flex-wrap gap-3">
            {ZONES.map((z) => (
              <label key={z} className="flex items-center gap-2 text-sm">
                <Checkbox checked={f.zones.includes(z)} onCheckedChange={(v) => {
                  setF({ ...f, zones: v ? Array.from(new Set([...f.zones, z])) : f.zones.filter((x) => x !== z) });
                }} />
                {z}
              </label>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>Batal</Button>
          <Button disabled={busy || !f.product_id || !f.price || f.zones.length === 0}
            onClick={async () => {
              try {
                setBusy(true);
                await save({
                  vendor_id: vendorId, product_id: f.product_id, purchase_type: f.purchase_type,
                  base_price_per_kg: Number(f.price), min_qty: Number(f.min_qty), qty_step: Number(f.qty_step),
                  service_zones: f.zones,
                });
                toast.success("Offer disimpan");
                onSaved();
              } catch (e) { toast.error(e instanceof Error ? e.message : "Gagal"); }
              finally { setBusy(false); }
            }}
          >Simpan</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function InventoryPanel({ offerId, latest }: {
  offerId: string; latest: { available_kg: number; on_hand_kg: number; as_of: string } | null | undefined;
}) {
  const qc = useQueryClient();
  const submitFn = useServerFn(submitInventory);
  const [on, setOn] = useState(latest ? String(latest.on_hand_kg) : "");
  const [av, setAv] = useState(latest ? String(latest.available_kg) : "");
  const [pack, setPack] = useState("");
  const mut = useMutation({
    mutationFn: () => submitFn({ data: {
      offer_id: offerId, on_hand_kg: Number(on), available_kg: Number(av),
      pack_count: pack ? Number(pack) : undefined,
    } }),
    onSuccess: () => { toast.success("Snapshot inventory tersimpan"); qc.invalidateQueries({ queryKey: ["vendor-offers"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const stale = useMemo(() => {
    if (!latest) return null;
    const mins = Math.floor((Date.now() - new Date(latest.as_of).getTime()) / 60000);
    return mins;
  }, [latest]);
  return (
    <div className="rounded-md border p-3">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-semibold uppercase tracking-widest text-muted-foreground">Inventory</span>
        {latest ? (
          <span className="text-muted-foreground">
            Terakhir: {Number(latest.available_kg).toLocaleString("id-ID")} / {Number(latest.on_hand_kg).toLocaleString("id-ID")} kg
            {" · "}{stale}m lalu
          </span>
        ) : <span className="text-destructive">Belum ada snapshot</span>}
      </div>
      <div className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
        <Input type="number" step="0.001" placeholder="On-hand kg" value={on} onChange={(e) => setOn(e.target.value)} />
        <Input type="number" step="0.001" placeholder="Available kg" value={av} onChange={(e) => setAv(e.target.value)} />
        <Input type="number" placeholder="Pack (optional)" value={pack} onChange={(e) => setPack(e.target.value)} />
        <Button size="sm" disabled={mut.isPending || !on || !av} onClick={() => mut.mutate()}>Simpan snapshot</Button>
      </div>
    </div>
  );
}
