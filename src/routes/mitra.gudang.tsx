import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Warehouse, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { MarketLayout } from "@/components/market/market-layout";
import { RoleNav } from "@/components/market/role-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { VENDORS } from "@/lib/market/data";
import { listOrders, submitVerification, cancelOrder, STATUS_TONE } from "@/lib/market/orders-store";
import { rupiah, tanggalJam } from "@/lib/market/format";
import { getConfig } from "@/lib/market/pricing";

export const Route = createFileRoute("/mitra/gudang")({
  head: () => ({
    meta: [
      { title: "Dasbor Gudang Vendor — MEATHUB" },
      { name: "description", content: "Antrean verifikasi fisik gudang: gramasi, tanggal potong, expired, dan foto barang." },
      { property: "og:title", content: "Dasbor Gudang Vendor — MEATHUB" },
      { property: "og:description", content: "Antrean verifikasi fisik gudang vendor MEATHUB." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WarehouseDashboard,
});

const VENDOR = VENDORS[0];

function WarehouseDashboard() {
  const router = useRouter();
  const config = getConfig();
  const [form, setForm] = useState<Record<string, { weight: string; slaughter: string; expiry: string; photos: string; notes: string }>>({});

  const queue = listOrders().flatMap((o) =>
    o.subOrders
      .filter((so) => so.vendorId === VENDOR.id)
      .map((so) => ({ order: o, so })),
  );
  const pending = queue.filter((q) => q.so.verification.status === "MENUNGGU");
  const done = queue.filter((q) => q.so.verification.status !== "MENUNGGU");

  const field = (id: string) =>
    form[id] ?? { weight: "", slaughter: "", expiry: "", photos: "3", notes: "" };
  const setField = (id: string, patch: Partial<ReturnType<typeof field>>) =>
    setForm((p) => ({ ...p, [id]: { ...field(id), ...patch } }));

  return (
    <MarketLayout>
      <div className="mx-auto max-w-5xl px-4 py-6">
        <RoleNav current="warehouse" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
              <Warehouse className="h-5 w-5 text-maroon" aria-hidden="true" /> Dasbor gudang
            </h1>
            <p className="text-sm text-muted-foreground">
              {VENDOR.name} · SLA verifikasi {config.warehouseVerificationHours} jam per PO
            </p>
          </div>
          <Link to="/mitra">
            <Button variant="outline" size="sm">Dasbor seller</Button>
          </Link>
        </div>

        <h2 className="mt-6 font-semibold text-ink">Antrean verifikasi ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Tidak ada PO yang menunggu verifikasi fisik.</p>
        ) : (
          <div className="mt-3 space-y-4">
            {pending.map(({ order, so }) => {
              const f = field(so.id);
              return (
                <section key={so.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-ink">PO {order.id} · {so.id}</div>
                      <div className="text-xs text-muted-foreground">
                        {order.buyer.company} · {tanggalJam(order.createdAt)}
                      </div>
                    </div>
                    <Badge variant="outline" className="shrink-0 gap-1">
                      <Clock className="h-3 w-3" aria-hidden="true" /> Batas {tanggalJam(so.verification.deadlineAt)}
                    </Badge>
                  </div>

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

                  <div className="mt-3 grid gap-3 sm:grid-cols-4">
                    <Num id={`w-${so.id}`} label="Gramasi aktual (kg)" value={f.weight} onChange={(v) => setField(so.id, { weight: v })} />
                    <Num id={`s-${so.id}`} label="Tanggal potong" value={f.slaughter} onChange={(v) => setField(so.id, { slaughter: v })} type="date" />
                    <Num id={`e-${so.id}`} label="Expired" value={f.expiry} onChange={(v) => setField(so.id, { expiry: v })} type="date" />
                    <Num id={`p-${so.id}`} label="Jumlah foto" value={f.photos} onChange={(v) => setField(so.id, { photos: v })} />
                  </div>
                  <Textarea
                    className="mt-2"
                    rows={2}
                    placeholder="Catatan kondisi barang"
                    value={f.notes}
                    onChange={(e) => setField(so.id, { notes: e.target.value })}
                    aria-label="Catatan kondisi barang"
                  />

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        const kg = Number(f.weight);
                        if (!Number.isFinite(kg) || kg <= 0) {
                          toast.error("Isi gramasi aktual.");
                          return;
                        }
                        if (!f.slaughter || !f.expiry) {
                          toast.error("Isi tanggal potong dan tanggal expired.");
                          return;
                        }
                        submitVerification(order.id, so.id, {
                          actualWeightKg: kg,
                          slaughterDate: f.slaughter,
                          expiryDate: f.expiry,
                          photoCount: Number(f.photos) || 0,
                          notes: f.notes,
                        });
                        toast.success("Verifikasi terkirim. Menunggu persetujuan pembeli.");
                        router.invalidate();
                      }}
                    >
                      Kirim hasil verifikasi
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive"
                      onClick={() => {
                        cancelOrder(order.id);
                        toast.success("PO ditandai batal (stok tidak tersedia).");
                        router.invalidate();
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

        <h2 className="mt-8 font-semibold text-ink">Riwayat verifikasi ({done.length})</h2>
        <div className="mt-3 space-y-2">
          {done.map(({ order, so }) => (
            <div key={so.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card p-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-ink">PO {order.id} · {so.id}</span>
                  <span className="block text-xs text-muted-foreground">
                    {so.verification.actualWeightKg ?? "—"} kg · exp {so.verification.expiryDate ?? "—"}
                  </span>
                </span>
              </span>
              <Badge variant="outline" className={STATUS_TONE[so.status] ?? ""}>{so.status}</Badge>
            </div>
          ))}
          {done.length === 0 && <p className="text-sm text-muted-foreground">Belum ada riwayat.</p>}
        </div>
      </div>
    </MarketLayout>
  );
}

function Num({
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
