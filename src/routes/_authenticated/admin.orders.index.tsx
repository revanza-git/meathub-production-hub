import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell, Panel, RoleGate } from "@/components/app/app-shell";
import { supabase } from "@/integrations/supabase/client";
import {
  ORDER_STATUSES,
  STATUS_CLASS,
  STATUS_LABEL,
  TERM_LABEL,
  formatDate,
  formatKg,
  type BuyerOrder,
  type OrderStatus,
} from "@/lib/meatlink/orders";
import { useBi } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/orders/")({
  component: AdminOrdersPage,
});

function AdminOrdersPage() {
  const bi = useBi();
  return (
    <AppShell
      title={bi("Konsol pesanan", "Order console")}
      intro={bi(
        "Setiap pesanan masuk, sistem pembayarannya, dan posisinya saat ini.",
        "Every incoming order, its payment system, and where it stands.",
      )}
    >
      <RoleGate allow="admin">
        <AdminOrdersBody />
      </RoleGate>
    </AppShell>
  );
}

function AdminOrdersBody() {
  const bi = useBi();
  const [status, setStatus] = useState<"" | OrderStatus>("");
  const [query, setQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("buyer_orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as BuyerOrder[];
    },
  });

  const rows = (data ?? []).filter(
    (o) =>
      (!status || o.status === status) &&
      `${o.order_no} ${o.buyer_name} ${o.product_text}`.toLowerCase().includes(query.toLowerCase()),
  );

  const counts = ORDER_STATUSES.map((s) => ({
    status: s,
    n: (data ?? []).filter((o) => o.status === s).length,
  }));

  return (
    <div className="grid gap-6">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {counts.map((c) => (
          <Panel key={c.status} className="p-4">
            <p className="eyebrow text-ash">{STATUS_LABEL[c.status]}</p>
            <p className="mt-1 text-2xl text-ink">{c.n}</p>
          </Panel>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={bi("Cari pesanan, pembeli, produk", "Search order, buyer, product")}
          className="border border-line bg-card px-4 py-3 text-sm text-ink outline-none focus:border-crimson"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as "" | OrderStatus)}
          className="border border-line bg-card px-4 py-3 text-sm text-ink outline-none focus:border-crimson"
        >
          <option value="">{bi("Semua status", "All statuses")}</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-sm text-ash">{bi("Memuat pesanan…", "Loading orders…")}</p>
      ) : rows.length === 0 ? (
        <Panel className="p-10 text-center text-sm text-ash">{bi("Tidak ada pesanan yang cocok dengan filter Anda.", "No orders match your filters.")}</Panel>
      ) : (
        <Panel className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-[0.16em] text-ash">
              <tr>
                <th className="px-4 py-3">{bi("Pesanan", "Order")}</th>
                <th className="px-4 py-3">{bi("Pembeli", "Buyer")}</th>
                <th className="px-4 py-3">{bi("Produk", "Product")}</th>
                <th className="px-4 py-3">{bi("Jumlah", "Qty")}</th>
                <th className="px-4 py-3">{bi("Termin", "Terms")}</th>
                <th className="px-4 py-3">{bi("Status", "Status")}</th>
                <th className="px-4 py-3">{bi("Dikirim", "Submitted")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      to="/admin/orders/$id"
                      params={{ id: o.id }}
                      className="text-ink underline underline-offset-4"
                    >
                      {o.order_no}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink">{o.buyer_name}</td>
                  <td className="px-4 py-3 text-ash">{o.product_text}</td>
                  <td className="px-4 py-3 text-ink">{formatKg(o.qty_kg)}</td>
                  <td className="px-4 py-3 text-ash">{TERM_LABEL[o.payment_term]}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex border px-2 py-1 text-xs ${STATUS_CLASS[o.status]}`}>
                      {STATUS_LABEL[o.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-ash">{formatDate(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </div>
  );
}
