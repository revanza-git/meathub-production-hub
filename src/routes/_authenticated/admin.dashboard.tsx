import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell, Panel, RoleGate } from "@/components/app/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { formatIdr, formatQty, DEFAULT_LOW_STOCK_KG } from "@/lib/meatlink/inventory";
import { ORDER_STATUS_LABEL } from "@/lib/meatlink/cart";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Operations dashboard — Meatlink admin" },
      {
        name: "description",
        content: "Daily storefront sales, order pipeline and low-stock alerts for the Meatlink team.",
      },
      { property: "og:title", content: "Operations dashboard — Meatlink admin" },
      {
        property: "og:description",
        content: "Sales today, last 7 and 30 days, open orders and inventory running low.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminDashboardPage,
});

function AdminDashboardPage() {
  return (
    <AppShell
      title="Operations dashboard"
      intro="Sales, order pipeline and stock that needs attention — refreshed on every visit."
    >
      <RoleGate allow="admin">
        <DashboardBody />
      </RoleGate>
    </AppShell>
  );
}

function daysAgo(n: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function DashboardBody() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const [orders, inventory] = await Promise.all([
        supabase
          .from("storefront_orders")
          .select("id, order_no, status, total_idr, created_at, paid_at, payment_proof_url, buyer_name")
          .gte("created_at", daysAgo(30))
          .order("created_at", { ascending: false }),
        supabase
          .from("admin_inventory")
          .select("id, name, origin, qty_on_hand_kg, is_active")
          .eq("is_active", true)
          .lte("qty_on_hand_kg", DEFAULT_LOW_STOCK_KG)
          .order("qty_on_hand_kg", { ascending: true })
          .limit(20),
      ]);
      if (orders.error) throw orders.error;
      if (inventory.error) throw inventory.error;
      return { orders: orders.data ?? [], lowStock: inventory.data ?? [] };
    },
  });

  if (isLoading) return <Panel className="p-6 text-sm text-ash">Loading dashboard…</Panel>;

  const orders = data?.orders ?? [];
  const paid = orders.filter((o) => o.paid_at || ["PAID", "PROCESSING", "SHIPPED", "COMPLETED"].includes(o.status));
  const sum = (list: typeof orders) => list.reduce((t, o) => t + Number(o.total_idr ?? 0), 0);
  const since = (iso: string, list: typeof orders) => list.filter((o) => o.created_at >= iso);

  const cards = [
    { label: "Sales today", value: formatIdr(sum(since(daysAgo(0), paid))), sub: `${since(daysAgo(0), paid).length} paid orders` },
    { label: "Last 7 days", value: formatIdr(sum(since(daysAgo(7), paid))), sub: `${since(daysAgo(7), paid).length} paid orders` },
    { label: "Last 30 days", value: formatIdr(sum(paid)), sub: `${paid.length} paid orders` },
    {
      label: "Awaiting action",
      value: String(orders.filter((o) => ["NEW", "AWAITING_PAYMENT", "PAID", "PROCESSING"].includes(o.status)).length),
      sub: "orders open in the pipeline",
    },
  ];

  const proofs = orders.filter((o) => o.payment_proof_url && !o.paid_at);

  return (
    <div className="grid gap-6">
      <div className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-card p-6">
            <p className="eyebrow text-ash">{c.label}</p>
            <p className="mt-3 font-display text-3xl text-ink">{c.value}</p>
            <p className="mt-2 text-xs text-ash">{c.sub}</p>
          </div>
        ))}
      </div>

      <Panel className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl text-ink">Payment proofs to verify</h2>
          <Link to="/admin/storefront-orders" className="eyebrow text-ink hover:text-crimson">
            Open storefront orders
          </Link>
        </div>
        {proofs.length === 0 ? (
          <p className="mt-3 text-sm text-ash">No unverified payment proofs.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line text-sm">
            {proofs.map((o) => (
              <li key={o.id} className="flex flex-wrap justify-between gap-3 py-3">
                <span className="text-ink">
                  {o.order_no} · {o.buyer_name}
                </span>
                <span className="text-ash">
                  {ORDER_STATUS_LABEL[o.status] ?? o.status} · {formatIdr(Number(o.total_idr))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl text-ink">Low stock ({DEFAULT_LOW_STOCK_KG} kg or less)</h2>
          <Link to="/admin/inventory" className="eyebrow text-ink hover:text-crimson">
            Manage inventory
          </Link>
        </div>
        {(data?.lowStock ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-ash">Every active item is above the low-stock threshold.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line text-sm">
            {(data?.lowStock ?? []).map((i) => (
              <li key={i.id} className="flex flex-wrap justify-between gap-3 py-3">
                <span className="text-ink">
                  {i.name} <span className="text-ash">· {i.origin}</span>
                </span>
                <span className="text-crimson">{formatQty(Number(i.qty_on_hand_kg ?? 0))}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
