import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, Panel, RoleGate } from "@/components/app/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/meatlink/orders";
import { formatIdr } from "@/lib/meatlink/inventory";
import { ORDER_STATUS_LABEL, PAY_METHOD_LABEL, type PayMethod } from "@/lib/meatlink/cart";
import { notifyOrderEventAdmin } from "@/lib/meatlink/notify.functions";
import type { Database } from "@/integrations/supabase/types";

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
  return (
    <AppShell
      title="Storefront orders"
      intro="Orders placed straight from the public catalog. Update status as payment and delivery progress."
    >
      <RoleGate allow="admin">
        <OrdersTable />
      </RoleGate>
    </AppShell>
  );
}

/** Payment proofs live in a private bucket — open them through a short-lived signed URL. */
async function openProof(path: string) {
  if (/^https?:\/\//i.test(path)) {
    window.open(path, "_blank", "noopener");
    return;
  }
  const { data, error } = await supabase.storage
    .from("payment-proofs")
    .createSignedUrl(path, 300);
  if (error || !data?.signedUrl) {
    toast.error(error?.message ?? "Bukti pembayaran tidak dapat dibuka.");
    return;
  }
  window.open(data.signedUrl, "_blank", "noopener");
}

function OrdersTable() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Record<string, { ref: string; note: string }>>({});
  const [ship, setShip] = useState<
    Record<string, { courier: string; tracking: string; eta: string }>
  >({});

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
        ? "Status updated and stock deducted."
        : "Status updated.",
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
    toast.success("Delivery details saved.");
    qc.invalidateQueries({ queryKey: ["admin-storefront-orders"] });
  }

  if (isLoading) return <Panel>Loading orders…</Panel>;

  const orders = data?.orders ?? [];
  if (orders.length === 0) {
    return <Panel>Catalog orders will appear here as soon as buyers check out.</Panel>;
  }

  return (
    <div className="grid gap-4">
      {orders.map((o) => {
        const lines = (data?.items ?? []).filter((i) => i.order_id === o.id);
        const events = (data?.events ?? []).filter((e) => e.order_id === o.id);
        const d = draft[o.id] ?? { ref: "", note: "" };
        const sh =
          ship[o.id] ?? {
            courier: o.courier_name ?? "",
            tracking: o.tracking_no ?? "",
            eta: o.eta_date ?? "",
          };
        const waText = encodeURIComponent(
          `Halo ${o.buyer_name}, update pesanan Meatlink ${o.order_no}: status ${
            ORDER_STATUS_LABEL[o.status as StoreStatus] ?? o.status
          }. Total ${formatIdr(Number(o.total_idr))}.`,
        );
        const waHref = `https://wa.me/${o.phone.replace(/\D/g, "").replace(/^0/, "62")}?text=${waText}`;
        return (
          <Panel key={o.id}>
            <h2 className="text-base font-semibold">{o.order_no} · {o.buyer_name}</h2>
            <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
              <div>
                <p className="text-sm text-muted-foreground">
                  {[o.company, o.phone, o.email].filter(Boolean).join(" · ")}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {[o.address, o.city].filter(Boolean).join(", ")}
                </p>
                {o.notes ? <p className="mt-2 text-sm italic">{o.notes}</p> : null}
                <ul className="mt-4 divide-y text-sm">
                  {lines.map((i) => (
                    <li key={i.id} className="flex justify-between gap-4 py-2">
                      <span>
                        {i.product_name} — {Number(i.qty_kg)} kg
                      </span>
                      <span>{formatIdr(Number(i.line_total_idr))}</span>
                    </li>
                  ))}
                </ul>
                {events.length ? (
                  <ol className="mt-4 space-y-1 text-xs text-muted-foreground">
                    {events.map((e) => (
                      <li key={e.id}>
                        {formatDate(e.created_at)} — {ORDER_STATUS_LABEL[e.to_status as StoreStatus] ?? e.to_status}
                        {e.note ? ` · ${e.note}` : ""}
                      </li>
                    ))}
                  </ol>
                ) : null}
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground">{formatDate(o.created_at)}</p>
                <p className="mt-1">
                  Payment: {PAY_METHOD_LABEL[o.payment_method as PayMethod] ?? o.payment_method}
                </p>
                {o.payment_ref ? <p className="mt-1 text-xs">Ref: {o.payment_ref}</p> : null}
                {o.payment_proof_url ? (
                  <button
                    type="button"
                    onClick={() => void openProof(o.payment_proof_url!)}
                    className="mt-2 text-xs underline"
                  >
                    Lihat bukti pembayaran
                  </button>
                ) : null}
                <p className="mt-1 text-lg font-semibold">{formatIdr(Number(o.total_idr))}</p>
                {o.stock_deducted_at ? (
                  <p className="mt-1 text-xs text-muted-foreground">Stock deducted</p>
                ) : null}
                <label className="mt-4 block text-xs uppercase tracking-wide text-muted-foreground">
                  Payment reference
                  <input
                    value={d.ref}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, [o.id]: { ...d, ref: e.target.value } }))
                    }
                    placeholder="No. transaksi / bukti transfer"
                    className="mt-1 w-full rounded border bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="mt-3 block text-xs uppercase tracking-wide text-muted-foreground">
                  Internal note
                  <input
                    value={d.note}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, [o.id]: { ...d, note: e.target.value } }))
                    }
                    className="mt-1 w-full rounded border bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="mt-3 block text-xs uppercase tracking-wide text-muted-foreground">
                  Status
                  <select
                    value={o.status}
                    onChange={(e) => updateStatus(o.id, e.target.value as StoreStatus)}
                    className="mt-1 w-full rounded border bg-background px-3 py-2 text-sm"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {ORDER_STATUS_LABEL[s] ?? s}
                      </option>
                    ))}
                  </select>
                </label>
                <fieldset className="mt-4 border-t pt-4">
                  <legend className="text-xs uppercase tracking-wide text-muted-foreground">
                    Delivery
                  </legend>
                  <input
                    value={sh.courier}
                    onChange={(e) =>
                      setShip((p) => ({ ...p, [o.id]: { ...sh, courier: e.target.value } }))
                    }
                    placeholder="Kurir / armada"
                    className="mt-2 w-full rounded border bg-background px-3 py-2 text-sm"
                  />
                  <input
                    value={sh.tracking}
                    onChange={(e) =>
                      setShip((p) => ({ ...p, [o.id]: { ...sh, tracking: e.target.value } }))
                    }
                    placeholder="No. resi"
                    className="mt-2 w-full rounded border bg-background px-3 py-2 text-sm"
                  />
                  <input
                    type="date"
                    value={sh.eta}
                    onChange={(e) =>
                      setShip((p) => ({ ...p, [o.id]: { ...sh, eta: e.target.value } }))
                    }
                    className="mt-2 w-full rounded border bg-background px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => void saveDelivery(o.id)}
                    className="mt-2 rounded border px-3 py-2 text-xs uppercase tracking-wide"
                  >
                    Save delivery
                  </button>
                  {o.buyer_confirmed_at ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Buyer confirmed receipt {formatDate(o.buyer_confirmed_at)}
                    </p>
                  ) : null}
                </fieldset>
                <a
                  href={waHref}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block rounded border px-3 py-2 text-xs uppercase tracking-wide"
                >
                  Notify buyer on WhatsApp
                </a>
              </div>
            </div>
          </Panel>
        );
      })}

    </div>
  );
}
