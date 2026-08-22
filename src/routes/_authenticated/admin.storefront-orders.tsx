import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell, Panel, RoleGate } from "@/components/app/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/meatlink/orders";
import { formatIdr } from "@/lib/meatlink/inventory";
import { ORDER_STATUS_LABEL, PAY_METHOD_LABEL, type PayMethod } from "@/lib/meatlink/cart";
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

function OrdersTable() {
  const qc = useQueryClient();

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
      return { orders: orders ?? [], items: items ?? [] };
    },
  });

  async function updateStatus(id: string, status: StoreStatus) {
    const { error } = await supabase.from("storefront_orders").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Status updated.");
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
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground">{formatDate(o.created_at)}</p>
                <p className="mt-1">
                  Payment: {PAY_METHOD_LABEL[o.payment_method as PayMethod] ?? o.payment_method}
                </p>
                <p className="mt-1 text-lg font-semibold">{formatIdr(Number(o.total_idr))}</p>
                <label className="mt-4 block text-xs uppercase tracking-wide text-muted-foreground">
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
              </div>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
