import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell, Panel, RoleGate } from "@/components/app/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/meatlink/orders";
import { formatIdr } from "@/lib/meatlink/inventory";
import { useBi, useLabel, ORDER_STATUS_LABEL_I18N, PAY_METHOD_LABEL_I18N } from "@/lib/i18n";
import { notifyOrderEventAdmin } from "@/lib/meatlink/notify.functions";
import type { Database } from "@/integrations/supabase/types";
import { ReconciliationPanel } from "@/components/meatlink/reconciliation-panel";
import { Button } from "@/components/ui/button";

type StoreStatus = Database["public"]["Enums"]["ml_store_order_status"];

const STATUSES: StoreStatus[] = [
  "NEW",
  "AWAITING_PAYMENT",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "COMPLETED",
  "CANCELLED",
];

const STATUS_TONE: Record<StoreStatus, string> = {
  NEW: "border-ink/25 bg-ink/5 text-ink",
  AWAITING_PAYMENT: "border-amber-400/50 bg-amber-100/60 text-amber-900",
  PAID: "border-emerald-500/40 bg-emerald-100/60 text-emerald-900",
  PROCESSING: "border-sky-500/40 bg-sky-100/60 text-sky-900",
  SHIPPED: "border-indigo-500/40 bg-indigo-100/60 text-indigo-900",
  COMPLETED: "border-emerald-700/40 bg-emerald-700/10 text-emerald-900",
  CANCELLED: "border-crimson/40 bg-crimson/10 text-crimson",
};

export const Route = createFileRoute("/_authenticated/admin/storefront-orders")({
  head: () => ({
    meta: [
      { title: "Storefront orders — Meatlink admin" },
      {
        name: "description",
        content: "Every catalog order placed from the public Meatlink storefront, with status control.",
      },
      { property: "og:title", content: "Storefront orders — Meatlink admin" },
      {
        property: "og:description",
        content: "Catalog orders from the public storefront with payment method and status control.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminStorefrontOrdersPage,
});

function AdminStorefrontOrdersPage() {
  const bi = useBi();
  const [tab, setTab] = useState<"orders" | "reconciliation">("orders");
  return (
    <AppShell
      title={bi("Pesanan toko online", "Storefront orders")}
      intro={bi(
        "Pesanan yang masuk langsung dari katalog publik. Perbarui status seiring pembayaran dan pengiriman berjalan.",
        "Orders placed straight from the public catalog. Update status as payment and delivery progress.",
      )}
    >
      <RoleGate allow="admin">
        <div className="mb-6 flex gap-1 border-b border-line" role="tablist" aria-label={bi("Tampilan pesanan", "Order views")}>
          <Button role="tab" aria-selected={tab === "orders"} variant="ghost" onClick={() => setTab("orders")} className={tab === "orders" ? "border-b-2 border-crimson text-ink" : "text-ash"}>{bi("Daftar pesanan", "Orders")}</Button>
          <Button role="tab" aria-selected={tab === "reconciliation"} variant="ghost" onClick={() => setTab("reconciliation")} className={tab === "reconciliation" ? "border-b-2 border-crimson text-ink" : "text-ash"}>{bi("Rekonsiliasi", "Reconciliation")}</Button>
        </div>
        {tab === "orders" ? <OrdersTable /> : <ReconciliationPanel />}
      </RoleGate>
    </AppShell>
  );
}

/** Payment proofs live in a private bucket — open them through a short-lived signed URL. */
async function openProof(path: string, bi: (id: string, en: string) => string) {
  if (/^https?:\/\//i.test(path)) {
    window.open(path, "_blank", "noopener");
    return;
  }
  const { data, error } = await supabase.storage
    .from("payment-proofs")
    .createSignedUrl(path, 300);
  if (error || !data?.signedUrl) {
    toast.error(error?.message ?? bi("Bukti pembayaran tidak dapat dibuka.", "Payment proof could not be opened."));
    return;
  }
  window.open(data.signedUrl, "_blank", "noopener");
}

const inputClass =
  "w-full border border-line bg-card px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-crimson";
const btnClass =
  "eyebrow border border-line px-3 py-2 text-ink transition-colors hover:border-crimson hover:text-crimson";

function StatusPill({ status, label }: { status: StoreStatus; label: string }) {
  return (
    <span className={`inline-flex border px-2 py-1 text-[11px] uppercase tracking-[0.12em] ${STATUS_TONE[status]}`}>
      {label}
    </span>
  );
}

function OrdersTable() {
  const bi = useBi();
  const label = useLabel();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Record<string, { ref: string; note: string }>>({});
  const [ship, setShip] = useState<
    Record<string, { courier: string; tracking: string; eta: string }>
  >({});
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"" | StoreStatus>("");
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["admin-storefront-orders"],
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from("storefront_orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const ids = (orders ?? []).map((o) => o.id);
      const { data: items, error: itemsError } = ids.length
        ? await supabase.from("storefront_order_items").select("*").in("order_id", ids)
        : { data: [], error: null };
      if (itemsError) throw itemsError;
      const { data: events } = ids.length
        ? await supabase
            .from("storefront_order_events")
            .select("*")
            .in("order_id", ids)
            .order("created_at", { ascending: false })
        : { data: [] };
      return { orders: orders ?? [], items: items ?? [], events: events ?? [] };
    },
  });

  const orders = data?.orders ?? [];

  async function updateStatus(id: string, status: StoreStatus) {
    const d = draft[id];
    const { error } = await supabase.rpc("ml_update_store_order", {
      _order_id: id,
      _status: status,
      _payment_ref: d?.ref?.trim() || undefined,
      _note: d?.note?.trim() || undefined,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      status === "SHIPPED" || status === "COMPLETED"
        ? bi("Status diperbarui dan stok telah dikurangi.", "Status updated and stock deducted.")
        : bi("Status diperbarui.", "Status updated."),
    );
    if (status === "PAID" || status === "SHIPPED" || status === "COMPLETED") {
      const targetOrder = orders.find((o) => o.id === id);
      void notifyOrderEventAdmin({
        data: {
          orderNo: targetOrder?.order_no ?? "",
          event: status === "PAID" ? "paid" : status === "SHIPPED" ? "shipped" : "completed",
        },
      }).catch(() => undefined);
    }
    setDraft((prev) => ({ ...prev, [id]: { ref: "", note: "" } }));
    qc.invalidateQueries({ queryKey: ["admin-storefront-orders"] });
  }

  async function saveDelivery(id: string) {
    const s = ship[id];
    const { error } = await supabase.rpc("ml_set_store_delivery", {
      _order_id: id,
      _courier: s?.courier?.trim() || undefined,
      _tracking_no: s?.tracking?.trim() || undefined,
      _eta: s?.eta || undefined,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(bi("Detail pengiriman disimpan.", "Delivery details saved."));
    qc.invalidateQueries({ queryKey: ["admin-storefront-orders"] });
  }

  const counts = useMemo(() => {
    const map = new Map<StoreStatus, number>();
    for (const o of orders) map.set(o.status, (map.get(o.status) ?? 0) + 1);
    return map;
  }, [orders]);

  const openValue = useMemo(
    () =>
      orders
        .filter((o) => o.status !== "CANCELLED" && o.status !== "COMPLETED")
        .reduce((sum, o) => sum + Number(o.total_idr), 0),
    [orders],
  );

  const rows = orders.filter((o) => {
    if (filter && o.status !== filter) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return `${o.order_no} ${o.buyer_name} ${o.company ?? ""} ${o.phone} ${o.email ?? ""} ${o.city ?? ""}`
      .toLowerCase()
      .includes(q);
  });

  if (isLoading) return <Panel className="p-6 text-sm text-ash">{bi("Memuat pesanan…", "Loading orders…")}</Panel>;

  if (orders.length === 0) {
    return (
      <Panel className="p-10 text-center text-sm text-ash">
        {bi("Pesanan katalog akan muncul di sini setelah pembeli checkout.", "Catalog orders will appear here as soon as buyers check out.")}
      </Panel>
    );
  }

  return (
    <div className="grid gap-6">
      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Panel className="p-4">
          <p className="eyebrow text-ash">{bi("Total pesanan", "Total orders")}</p>
          <p className="mt-1 font-display text-2xl text-ink">{orders.length}</p>
        </Panel>
        <Panel className="p-4">
          <p className="eyebrow text-ash">{bi("Menunggu pembayaran", "Awaiting payment")}</p>
          <p className="mt-1 font-display text-2xl text-ink">
            {orders.filter((o) => o.payment_method !== "TERMS_REQUEST" && (o.status === "NEW" || o.status === "AWAITING_PAYMENT")).length}
          </p>
        </Panel>
        <Panel className="p-4">
          <p className="eyebrow text-ash">{bi("Pengajuan termin", "Terms requests")}</p>
          <p className="mt-1 font-display text-2xl text-ink">
            {orders.filter((o) => o.payment_method === "TERMS_REQUEST" && o.status === "NEW").length}
          </p>
        </Panel>
        <Panel className="p-4">
          <p className="eyebrow text-ash">{bi("Nilai berjalan", "Open value")}</p>
          <p className="mt-1 font-display text-2xl text-ink">{formatIdr(openValue)}</p>
        </Panel>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={bi("Cari no. pesanan, pembeli, kota", "Search order no., buyer, city")}
          className={`${inputClass} sm:max-w-xs`}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilter("")}
            className={`eyebrow border px-3 py-2 transition-colors ${
              filter === "" ? "border-crimson bg-crimson/5 text-crimson" : "border-line text-ash hover:text-ink"
            }`}
          >
            {bi("Semua", "All")} · {orders.length}
          </button>
          {STATUSES.filter((s) => counts.get(s)).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(filter === s ? "" : s)}
              className={`eyebrow border px-3 py-2 transition-colors ${
                filter === s ? "border-crimson bg-crimson/5 text-crimson" : "border-line text-ash hover:text-ink"
              }`}
            >
              {label(ORDER_STATUS_LABEL_I18N, s)} · {counts.get(s)}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <Panel className="p-10 text-center text-sm text-ash">
          {bi("Tidak ada pesanan yang cocok dengan filter.", "No orders match your filters.")}
        </Panel>
      ) : null}

      {rows.map((o) => {
        const lines = (data?.items ?? []).filter((i) => i.order_id === o.id);
        const events = (data?.events ?? []).filter((e) => e.order_id === o.id);
        const d = draft[o.id] ?? { ref: "", note: "" };
        const isOpen = open[o.id] ?? false;
        const sh =
          ship[o.id] ?? {
            courier: o.courier_name ?? "",
            tracking: o.tracking_no ?? "",
            eta: o.eta_date ?? "",
          };
        const waText = encodeURIComponent(
          `Halo ${o.buyer_name}, update pesanan Meatlink ${o.order_no}: status ${
            label(ORDER_STATUS_LABEL_I18N, o.status)
          }. Total ${formatIdr(Number(o.total_idr))}.`,
        );
        const waHref = `https://wa.me/${o.phone.replace(/\D/g, "").replace(/^0/, "62")}?text=${waText}`;
        return (
          <Panel key={o.id}>
            {/* Row header */}
            <button
              type="button"
              onClick={() => setOpen((p) => ({ ...p, [o.id]: !isOpen }))}
              aria-expanded={isOpen}
              className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-ink/[0.03]"
            >
              <div className="min-w-0">
                <p className="font-display text-base text-ink">
                  {o.order_no} <span className="text-ash">·</span> {o.buyer_name}
                </p>
                <p className="mt-0.5 truncate text-xs text-ash">
                  {[o.company, o.city, formatDate(o.created_at)].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-ash">{lines.length} {bi("item", "items")}</span>
                <span className="font-display text-lg text-ink">{formatIdr(Number(o.total_idr))}</span>
                {o.payment_method === "TERMS_REQUEST" && o.status === "NEW" ? <span className="text-xs font-medium text-crimson">{bi("Termin belum disetujui", "Terms not approved")}</span> : null}
                <StatusPill status={o.status} label={label(ORDER_STATUS_LABEL_I18N, o.status)} />
                <span className="eyebrow text-ash">{isOpen ? bi("Tutup", "Close") : bi("Detail", "Detail")}</span>
              </div>
            </button>

            {isOpen ? (
              <div className="grid gap-6 border-t border-line px-5 py-5 lg:grid-cols-[1.3fr_1fr]">
                {/* Left: buyer + lines + timeline */}
                <div className="grid gap-5">
                  <div>
                    <p className="eyebrow text-ash">{bi("Kontak & alamat", "Contact & address")}</p>
                    <p className="mt-2 text-sm text-ink">
                      {[o.company, o.phone, o.email].filter(Boolean).join(" · ")}
                    </p>
                    <p className="mt-1 text-sm text-ash">{[o.address, o.city].filter(Boolean).join(", ")}</p>
                    {o.notes ? <p className="mt-2 text-sm italic text-ash">{o.notes}</p> : null}
                    <a href={waHref} target="_blank" rel="noreferrer" className={`${btnClass} mt-3 inline-block`}>
                      {bi("Beri tahu via WhatsApp", "Notify on WhatsApp")}
                    </a>
                  </div>

                  <div>
                    <p className="eyebrow text-ash">{bi("Rincian pesanan", "Order lines")}</p>
                    <ul className="mt-2 divide-y divide-line text-sm">
                      {lines.map((i) => (
                        <li key={i.id} className="flex justify-between gap-4 py-2">
                          <span className="text-ink">
                            {i.product_name} <span className="text-ash">— {Number(i.qty_kg)} kg</span>
                          </span>
                          <span className="text-ink">{formatIdr(Number(i.line_total_idr))}</span>
                        </li>
                      ))}
                      <li className="flex justify-between gap-4 py-2 font-display text-base text-ink">
                        <span>{bi("Total", "Total")}</span>
                        <span>{formatIdr(Number(o.total_idr))}</span>
                      </li>
                    </ul>
                  </div>

                  {events.length ? (
                    <div>
                      <p className="eyebrow text-ash">{bi("Riwayat status", "Status history")}</p>
                      <ol className="mt-2 space-y-1.5 border-l border-line pl-4 text-xs text-ash">
                        {events.map((e) => (
                          <li key={e.id} className="relative">
                            <span className="absolute -left-[21px] top-1.5 h-1.5 w-1.5 rounded-full bg-crimson" />
                            <span className="text-ink">{label(ORDER_STATUS_LABEL_I18N, e.to_status)}</span>{" "}
                            · {formatDate(e.created_at)}
                            {e.note ? ` · ${e.note}` : ""}
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : null}
                </div>

                {/* Right: payment + status + delivery */}
                <div className="grid gap-5 lg:border-l lg:border-line lg:pl-6">
                  <div>
                    <p className="eyebrow text-ash">{bi("Pembayaran", "Payment")}</p>
                    <p className="mt-2 text-sm text-ink">{label(PAY_METHOD_LABEL_I18N, o.payment_method)}</p>
                    {o.payment_method === "TERMS_REQUEST" ? <p className="mt-2 text-xs text-ash">{bi("Pengajuan saja — belum ada tagihan, persetujuan kredit, atau jatuh tempo. Tindak lanjuti dengan pembeli lewat WhatsApp.", "Request only — no invoice, credit approval, or due date. Follow up with the buyer on WhatsApp.")}</p> : null}
                    {o.payment_ref ? (
                      <p className="mt-1 text-xs text-ash">{bi("Ref", "Ref")}: {o.payment_ref}</p>
                    ) : null}
                    {o.stock_deducted_at ? (
                      <p className="mt-1 text-xs text-ash">{bi("Stok telah dikurangi", "Stock deducted")}</p>
                    ) : null}
                    {o.payment_proof_url ? (
                      <button
                        type="button"
                        onClick={() => void openProof(o.payment_proof_url!, bi)}
                        className={`${btnClass} mt-3`}
                      >
                        {bi("Lihat bukti bayar", "View payment proof")}
                      </button>
                    ) : null}
                  </div>

                  <div className="grid gap-3">
                    <label className="block">
                      <span className="eyebrow text-ash">{bi("Referensi pembayaran", "Payment reference")}</span>
                      <input
                        value={d.ref}
                        onChange={(e) => setDraft((p) => ({ ...p, [o.id]: { ...d, ref: e.target.value } }))}
                        placeholder={bi("No. transaksi / bukti transfer", "Transaction no. / transfer proof")}
                        className={`${inputClass} mt-1.5`}
                      />
                    </label>
                    <label className="block">
                      <span className="eyebrow text-ash">{bi("Catatan internal", "Internal note")}</span>
                      <input
                        value={d.note}
                        onChange={(e) => setDraft((p) => ({ ...p, [o.id]: { ...d, note: e.target.value } }))}
                        className={`${inputClass} mt-1.5`}
                      />
                    </label>
                    <label className="block">
                      <span className="eyebrow text-ash">{bi("Status", "Status")}</span>
                      <select
                        value={o.status}
                        onChange={(e) => updateStatus(o.id, e.target.value as StoreStatus)}
                        className={`${inputClass} mt-1.5`}
                      >
                        {STATUSES.filter((s) => o.payment_method !== "TERMS_REQUEST" || s === "NEW" || s === "CANCELLED").map((s) => (
                          <option key={s} value={s}>
                            {label(ORDER_STATUS_LABEL_I18N, s)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <p className="text-[11px] text-ash">
                      {bi(
                        "Referensi & catatan ikut tersimpan saat status diubah.",
                        "Reference & note are saved together with the status change.",
                      )}
                    </p>
                  </div>

                  <div className="border-t border-line pt-4">
                    <p className="eyebrow text-ash">{bi("Pengiriman", "Delivery")}</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <input
                        value={sh.courier}
                        onChange={(e) => setShip((p) => ({ ...p, [o.id]: { ...sh, courier: e.target.value } }))}
                        placeholder={bi("Kurir / armada", "Courier / fleet")}
                        className={inputClass}
                      />
                      <input
                        value={sh.tracking}
                        onChange={(e) => setShip((p) => ({ ...p, [o.id]: { ...sh, tracking: e.target.value } }))}
                        placeholder={bi("No. resi", "Tracking no.")}
                        className={inputClass}
                      />
                      <input
                        type="date"
                        value={sh.eta}
                        onChange={(e) => setShip((p) => ({ ...p, [o.id]: { ...sh, eta: e.target.value } }))}
                        className={inputClass}
                      />
                      <button type="button" onClick={() => void saveDelivery(o.id)} className={btnClass}>
                        {bi("Simpan pengiriman", "Save delivery")}
                      </button>
                    </div>
                    {o.buyer_confirmed_at ? (
                      <p className="mt-2 text-xs text-ash">
                        {bi("Pembeli mengonfirmasi penerimaan", "Buyer confirmed receipt")}{" "}
                        {formatDate(o.buyer_confirmed_at)}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </Panel>
        );
      })}
    </div>
  );
}
