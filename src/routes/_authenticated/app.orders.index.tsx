import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell, Panel } from "@/components/app/app-shell";
import { supabase } from "@/integrations/supabase/client";
import {
  formatDate,
  formatKg,
  STATUS_CLASS,
  STATUS_LABEL,
  TERM_LABEL,
  type BuyerOrder,
} from "@/lib/meatlink/orders";

export const Route = createFileRoute("/_authenticated/app/orders/")({
  component: MyOrdersPage,
});

function MyOrdersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("buyer_orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as BuyerOrder[];
    },
  });

  return (
    <AppShell
      title="My orders"
      intro="Every order you submit, with its live status. No need to ask us for an update."
      actions={
        <Link to="/app/orders/new" className="eyebrow bg-crimson px-5 py-3 text-bone">
          New order
        </Link>
      }
    >
      {isLoading ? (
        <p className="text-sm text-ash">Loading orders…</p>
      ) : !data || data.length === 0 ? (
        <Panel className="p-10 text-center">
          <h2 className="font-display text-xl text-ink">No orders yet</h2>
          <p className="mt-2 text-sm text-ash">Submit your first order and track it here.</p>
          <Link to="/app/orders/new" className="eyebrow mt-6 inline-flex bg-crimson px-5 py-3 text-bone">
            Create an order
          </Link>
        </Panel>
      ) : (
        <Panel className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-[0.16em] text-ash">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {data.map((o) => (
                <tr key={o.id} className="border-b border-line/60 last:border-0 hover:bg-bone/60">
                  <td className="px-4 py-3">
                    <Link
                      to="/app/orders/$id"
                      params={{ id: o.id }}
                      className="font-medium text-ink underline underline-offset-4"
                    >
                      {o.order_no}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink">{o.product_text}</td>
                  <td className="px-4 py-3 text-ash">{formatKg(o.qty_kg)}</td>
                  <td className="px-4 py-3 text-ash">{TERM_LABEL[o.payment_term]}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex border px-2 py-1 text-xs ${STATUS_CLASS[o.status]}`}>
                      {STATUS_LABEL[o.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ash">{formatDate(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </AppShell>
  );
}
