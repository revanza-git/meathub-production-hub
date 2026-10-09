import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Panel } from "@/components/app/app-shell";
import { supabase } from "@/integrations/supabase/client";
import {
  formatDate,
  formatKg,
  STATUS_CLASS,
  STATUS_LABEL,
  TERM_LABEL,
  type BuyerOrder,
} from "@/lib/meatlink/orders";

import { useBi } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
export function BuyerSpecialOrders() {
  const bi = useBi();
  const { data, isLoading, error, refetch } = useQuery({
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
    <>
      {error ? <p role="alert" className="text-sm text-crimson">{bi("Les pesanan khusus belum dapat dimuat.", "Custom orders could not be loaded.")} <Button variant="link" onClick={() => void refetch()}>{bi("Coba lagi", "Try again")}</Button></p> : isLoading ? (
        <p className="text-sm text-ash">{bi("Memuat pesanan…", "Loading orders…")}</p>
      ) : !data || data.length === 0 ? (
        <Panel className="p-10 text-center">
          <h2 className="font-display text-xl text-ink">{bi("Belum ada pesanan khusus", "No custom orders yet")}</h2>
          <p className="mt-2 text-sm text-ash">{bi("Belum ada permintaan produk khusus.", "No custom product requests yet.")}</p>
          <Button asChild className="mt-6"><Link to="/request-quote">
            {bi("Minta penawaran", "Request a quote")}
          </Link></Button>
        </Panel>
      ) : (
        <Panel className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-[0.16em] text-ash">
              <tr>
                <th className="px-4 py-3">{bi("Pesanan", "Order")}</th>
                <th className="px-4 py-3">{bi("Produk", "Product")}</th>
                <th className="px-4 py-3">{bi("Jumlah", "Qty")}</th>
                <th className="px-4 py-3">{bi("Termin", "Terms")}</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">{bi("Dibuat", "Submitted")}</th>
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
    </>
  );
}
