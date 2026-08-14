import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell, Panel } from "@/components/app/app-shell";
import { supabase } from "@/integrations/supabase/client";
import {
  formatDate,
  formatKg,
  STATUS_CLASS,
  STATUS_HINT,
  STATUS_LABEL,
  TERM_LABEL,
  type BuyerOrder,
  type OrderStatus,
} from "@/lib/meatlink/orders";

export const Route = createFileRoute("/_authenticated/app/orders/$id")({
  component: OrderDetailPage,
});

type HistoryRow = {
  id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  created_at: string;
};

function OrderDetailPage() {
  const { id } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const [order, history] = await Promise.all([
        supabase.from("buyer_orders").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("buyer_order_status_history")
          .select("id, from_status, to_status, created_at")
          .eq("order_id", id)
          .order("created_at", { ascending: true }),
      ]);
      if (order.error) throw order.error;
      return {
        order: order.data as BuyerOrder | null,
        history: (history.data ?? []) as HistoryRow[],
      };
    },
  });

  const order = data?.order;

  return (
    <AppShell
      title={order ? `Order ${order.order_no}` : "Order"}
      intro="Status updates appear here as soon as our team acts on your order."
      actions={
        <Link to="/app/orders" className="eyebrow border border-ink/25 px-5 py-3 text-ink">
          Back to orders
        </Link>
      }
    >
      {isLoading ? (
        <p className="text-sm text-ash">Loading…</p>
      ) : !order ? (
        <Panel className="p-8">
          <p className="text-sm text-ash">Order not found.</p>
        </Panel>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Panel className="p-6 lg:col-span-2">
            <span className={`inline-flex border px-2 py-1 text-xs ${STATUS_CLASS[order.status]}`}>
              {STATUS_LABEL[order.status]}
            </span>
            <p className="mt-3 text-sm text-ash">{STATUS_HINT[order.status]}</p>

            <dl className="mt-8 grid gap-5 sm:grid-cols-2">
              <Detail label="Buyer" value={order.buyer_name} />
              <Detail label="Product" value={order.product_text} />
              <Detail label="Quantity" value={formatKg(order.qty_kg)} />
              <Detail label="Payment system" value={TERM_LABEL[order.payment_term]} />
              <Detail label="Delivery location" value={order.delivery_location ?? "—"} />
              <Detail label="Needed by" value={order.needed_by ?? "—"} />
              <Detail label="Submitted" value={formatDate(order.created_at)} />
              <Detail label="Last update" value={formatDate(order.updated_at)} />
            </dl>

            {order.buyer_notes ? (
              <div className="mt-8 border-t border-line pt-6">
                <p className="eyebrow text-ash">Your notes</p>
                <p className="mt-2 whitespace-pre-line text-sm text-ink">{order.buyer_notes}</p>
              </div>
            ) : null}
          </Panel>

          <Panel className="p-6">
            <p className="eyebrow text-ash">Status timeline</p>
            <ol className="mt-4 grid gap-4">
              {(data?.history ?? []).map((h) => (
                <li key={h.id} className="border-l-2 border-crimson/40 pl-4">
                  <p className="text-sm font-medium text-ink">{STATUS_LABEL[h.to_status]}</p>
                  <p className="text-xs text-ash">{formatDate(h.created_at)}</p>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      )}
    </AppShell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="eyebrow text-ash">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{value}</dd>
    </div>
  );
}
