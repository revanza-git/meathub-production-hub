import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, Store, ShoppingBag, Wallet, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { MarketLayout } from "@/components/market/market-layout";
import { RoleNav } from "@/components/market/role-nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PRODUCTS, VENDORS } from "@/lib/market/data";
import {
  listOrders,
  adminForceCancel,
  adminExtendSla,
  STATUS_TONE,
  FLOW,
} from "@/lib/market/orders-store";
import { rupiah, tanggal, tanggalJam } from "@/lib/market/format";
import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getConfig, saveConfig, type PlatformConfig } from "@/lib/market/pricing";
import {
  listWithdrawals,
  decideWithdrawal,
  platformEscrowTotals,
  WITHDRAWAL_TONE,
  type WithdrawalRequest,
} from "@/lib/market/escrow";
import { VENDORS as ALL_VENDORS } from "@/lib/market/data";

export const Route = createFileRoute("/kelola")({
  head: () => ({
    meta: [
      { title: "Konsol Admin Marketplace — MEATHUB" },
      {
        name: "description",
        content: "Pantau vendor, transaksi, app fee, dan sengketa marketplace MEATHUB.",
      },
      { property: "og:title", content: "Konsol Admin Marketplace — MEATHUB" },
      {
        property: "og:description",
        content: "Pantau vendor, transaksi, app fee, dan sengketa marketplace.",
      },
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
        <RoleNav current="admin" />
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
            <TabsTrigger value="intervensi">Intervensi</TabsTrigger>
            <TabsTrigger value="sengketa">Sengketa ({sengketa.length})</TabsTrigger>
            <TabsTrigger value="penarikan">Dana & pencairan</TabsTrigger>
            <TabsTrigger value="konfigurasi">Konfigurasi</TabsTrigger>
          </TabsList>

          <TabsContent value="vendor">
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-muted/60 text-left text-xs uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th scope="col" className="p-3">
                      Vendor
                    </th>
                    <th scope="col" className="p-3">
                      Kota
                    </th>
                    <th scope="col" className="p-3">
                      Rating
                    </th>
                    <th scope="col" className="p-3">
                      Transaksi
                    </th>
                    <th scope="col" className="p-3">
                      Status
                    </th>
                    <th scope="col" className="p-3">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {VENDORS.map((v) => (
                    <tr key={v.id}>
                      <td className="p-3">
                        <Link
                          to="/toko/$slug"
                          params={{ slug: v.slug }}
                          className="font-medium text-ink hover:text-maroon"
                        >
                          {v.name}
                        </Link>
                      </td>
                      <td className="p-3 text-muted-foreground">{v.city}</td>
                      <td className="p-3">{v.rating.toFixed(1)}</td>
                      <td className="p-3 text-muted-foreground">
                        {v.transactions.toLocaleString("id-ID")}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">{v.settlementStatus}</Badge>
                      </td>
                      <td className="p-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toast.success(`${v.name} disetujui (demo)`)}
                        >
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
                    <th scope="col" className="p-3">
                      Pesanan
                    </th>
                    <th scope="col" className="p-3">
                      Tanggal
                    </th>
                    <th scope="col" className="p-3">
                      Vendor
                    </th>
                    <th scope="col" className="p-3">
                      Nilai
                    </th>
                    <th scope="col" className="p-3">
                      Komisi
                    </th>
                    <th scope="col" className="p-3">
                      Status
                    </th>
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
                      <td className="p-3">
                        <Badge variant="outline">{o.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="katalog">
            <div className="rounded-xl border border-border bg-card p-5 text-sm">
              <p className="text-ink-soft">
                {PRODUCTS.length} produk aktif dari {VENDORS.length} vendor. Produk baru masuk
                antrean moderasi sebelum tampil di katalog publik.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => toast.success("3 produk disetujui (demo)")}>
                  Setujui antrean
                </Button>
                <Link to="/produk" search={{}}>
                  <Button size="sm" variant="outline">
                    Buka katalog publik
                  </Button>
                </Link>
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
                  <li
                    key={o.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 font-semibold text-ink">
                        <ShieldAlert
                          className="h-4 w-4 shrink-0 text-destructive"
                          aria-hidden="true"
                        />
                        <span className="truncate">{o.id}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {tanggal(o.createdAt)} · {rupiah(o.total)}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => toast.success(`Sengketa ${o.id} diselesaikan (demo)`)}
                    >
                      Selesaikan
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="intervensi">
            <InterventionPanel />
          </TabsContent>

          <TabsContent value="penarikan">
            <WithdrawalQueue />
          </TabsContent>

          <TabsContent value="konfigurasi">
            <ConfigEditor />
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

/** Panel intervensi admin: batal paksa & perpanjang SLA, semuanya tercatat beralasan. */
function InterventionPanel() {
  const [reason, setReason] = useState<Record<string, string>>({});
  const [orders, setOrders] = useState(() => listOrders());
  const refresh = useCallback(() => setOrders(listOrders()), []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  const active = orders.filter((o) => FLOW.includes(o.status) && o.status !== "Selesai");

  if (active.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
        Tidak ada pesanan berjalan.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {active.map((o) => (
        <li key={o.id} className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-semibold text-ink">{o.id}</div>
              <div className="text-xs text-muted-foreground">
                {tanggal(o.createdAt)} · {rupiah(o.total)} · {o.subOrders.length} sub-PO
              </div>
            </div>
            <Badge variant="outline" className={STATUS_TONE[o.status] ?? ""}>
              {o.status}
            </Badge>
          </div>
          <Input
            className="mt-3"
            placeholder="Alasan intervensi (wajib)"
            value={reason[o.id] ?? ""}
            onChange={(e) => setReason((p) => ({ ...p, [o.id]: e.target.value }))}
            aria-label={`Alasan intervensi pesanan ${o.id}`}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const r = (reason[o.id] ?? "").trim();
                if (!r) return toast.error("Isi alasan intervensi.");
                adminExtendSla(o.id, 2, r);
                toast.success("SLA konfirmasi vendor diperpanjang 2 jam.");
                refresh();
              }}
            >
              Perpanjang SLA +2 jam
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive"
              onClick={() => {
                const r = (reason[o.id] ?? "").trim();
                if (!r) return toast.error("Isi alasan intervensi.");
                adminForceCancel(o.id, r);
                toast.success("Pesanan dibatalkan paksa.");
                refresh();
              }}
            >
              Batalkan paksa
            </Button>
          </div>
          {o.adminLog?.length ? (
            <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
              {o.adminLog.map((l) => (
                <li key={l.at}>
                  {tanggalJam(l.at)} · {l.action} — {l.reason}
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function vendorName(id: string) {
  return ALL_VENDORS.find((v) => v.id === id)?.name ?? id;
}

/** Rekonsiliasi dana mengendap + antrean persetujuan penarikan vendor. */
function WithdrawalQueue() {
  const [items, setItems] = useState<WithdrawalRequest[]>([]);
  const [totals, setTotals] = useState(() => ({
    held: 0,
    pendingRelease: 0,
    claimable: 0,
    processing: 0,
    paid: 0,
  }));
  const refresh = useCallback(() => {
    setItems(listWithdrawals());
    setTotals(platformEscrowTotals());
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          icon={Wallet}
          label="Dana ditahan"
          value={rupiah(totals.held + totals.pendingRelease)}
        />
        <Kpi
          icon={Wallet}
          label="Bisa dicairkan vendor"
          value={rupiah(Math.max(0, totals.claimable - totals.processing - totals.paid))}
        />
        <Kpi icon={Wallet} label="Menunggu persetujuan" value={rupiah(totals.processing)} />
        <Kpi icon={Wallet} label="Sudah dibayarkan" value={rupiah(totals.paid)} />
      </dl>

      {items.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
          Belum ada permintaan pencairan dari vendor.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {items.map((w) => (
            <li
              key={w.id}
              className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm"
            >
              <span className="min-w-0">
                <span className="block font-medium text-ink">
                  {rupiah(w.amount)} · {vendorName(w.vendorId)}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {w.bankAccount} · diajukan {tanggalJam(w.requestedAt)}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <Badge variant="outline" className={WITHDRAWAL_TONE[w.status]}>
                  {w.status.replaceAll("_", " ").toLowerCase()}
                </Badge>
                {w.status === "MENUNGGU_PERSETUJUAN" && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => {
                        decideWithdrawal(w.id, true);
                        toast.success("Penarikan disetujui & ditandai dibayarkan.");
                        refresh();
                      }}
                    >
                      Setujui & bayar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive"
                      onClick={() => {
                        decideWithdrawal(w.id, false, "Ditolak admin");
                        toast.success("Penarikan ditolak, dana kembali ke saldo vendor.");
                        refresh();
                      }}
                    >
                      Tolak
                    </Button>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const CONFIG_FIELDS: { key: keyof PlatformConfig; label: string; hint: string }[] = [
  { key: "appFeePerKg", label: "App fee per kg (Rp)", hint: "Berlaku untuk seluruh grade non-A5." },
  {
    key: "appFeePerKgA5",
    label: "App fee per kg A5 (Rp)",
    hint: "Otomatis dipakai bila grade produk A5/MB5+.",
  },
  {
    key: "vendorConfirmationHours",
    label: "SLA konfirmasi vendor (jam)",
    hint: "Lewat batas → PO batal otomatis.",
  },
  {
    key: "paymentExpiryHours",
    label: "Masa berlaku pembayaran (jam)",
    hint: "VA/QRIS kedaluwarsa setelah batas ini.",
  },
  {
    key: "buyerCheckHours",
    label: "SLA cek fisik pembeli (jam)",
    hint: "Lewat batas → dianggap sesuai.",
  },
  {
    key: "autoConfirmDays",
    label: "Auto-confirm tanpa respons (hari)",
    hint: "Default 14 hari, dana vendor cair.",
  },
  { key: "refundWorkingHours", label: "SLA refund (jam kerja)", hint: "Setelah retur disetujui." },
  {
    key: "payoutHoldDays",
    label: "Masa tahan dana vendor (hari)",
    hint: "Dihitung sejak pesanan Selesai.",
  },
  {
    key: "payoutMinWithdrawal",
    label: "Minimum penarikan vendor (Rp)",
    hint: "Penarikan wajib disetujui admin.",
  },
  { key: "freeDeliveryKg", label: "Gratis ongkir mulai (kg)", hint: "Per pesanan vendor." },
];

function ConfigEditor() {
  const [draft, setDraft] = useState<PlatformConfig>(() => getConfig());
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="font-semibold text-ink">Konfigurasi platform</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Semua parameter komersial dan SLA dapat diubah admin tanpa rilis ulang.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {CONFIG_FIELDS.map((f) => (
          <div key={f.key}>
            <Label
              htmlFor={`cfg-${f.key}`}
              className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground"
            >
              {f.label}
            </Label>
            <Input
              id={`cfg-${f.key}`}
              inputMode="numeric"
              value={String(draft[f.key])}
              onChange={(e) => setDraft({ ...draft, [f.key]: Number(e.target.value) || 0 })}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">{f.hint}</p>
          </div>
        ))}
      </div>
      <Button
        className="mt-4"
        onClick={() => {
          saveConfig(draft);
          toast.success("Konfigurasi platform disimpan.");
        }}
      >
        Simpan konfigurasi
      </Button>
    </div>
  );
}
