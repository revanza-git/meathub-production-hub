import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell, Panel } from "@/components/app/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { formatIdr } from "@/lib/meatlink/inventory";
import { ORDER_STATUS_LABEL, PAY_METHOD_LABEL, useCart, type PayMethod } from "@/lib/meatlink/cart";
import { formatDate } from "@/lib/meatlink/orders";

export const Route = createFileRoute("/_authenticated/app/pesanan")({
  component: StoreOrdersPage,
});

type ItemRow = {
  slug: string | null;
  product_name: string;
  qty_kg: number;
  unit_price_idr: number;
  line_total_idr: number;
};

type OrderRow = {
  id: string;
  order_no: string;
  access_token: string;
  status: string;
  payment_method: PayMethod;
  total_idr: number;
  created_at: string;
  storefront_order_items: ItemRow[];
};

function StoreOrdersPage() {
  const { add } = useCart();

  const { data, isLoading } = useQuery({
    queryKey: ["my-store-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("storefront_orders")
        .select(
          "id, order_no, access_token, status, payment_method, total_idr, created_at, storefront_order_items(slug, product_name, qty_kg, unit_price_idr, line_total_idr)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as OrderRow[];
    },
  });

  function reorder(order: OrderRow) {
    const lines = order.storefront_order_items.filter((i) => i.slug);
    if (lines.length === 0) {
      toast.error("Item pesanan ini tidak tersedia untuk dipesan ulang.");
      return;
    }
    for (const i of lines) {
      add({
        slug: i.slug as string,
        name: i.product_name,
        price: Number(i.unit_price_idr),
        qty: Number(i.qty_kg),
      });
    }
    toast.success(`${lines.length} item ditambahkan ke keranjang.`);
  }

  return (
    <AppShell
      title="Pesanan toko"
      intro="Riwayat pesanan katalog Anda, lengkap dengan status pembayaran dan pesan ulang satu klik."
      actions={
        <Link to="/produk" className="eyebrow bg-crimson px-5 py-3 text-bone">
          Belanja katalog
        </Link>
      }
    >
      {isLoading ? (
        <p className="text-sm text-ash">Memuat pesanan…</p>
      ) : !data || data.length === 0 ? (
        <Panel className="p-10 text-center">
          <h2 className="font-display text-xl text-ink">Belum ada pesanan</h2>
          <p className="mt-2 text-sm text-ash">
            Pesanan yang Anda buat saat masuk ke akun ini akan muncul di sini.
          </p>
          <Link to="/produk" className="eyebrow mt-6 inline-flex bg-crimson px-5 py-3 text-bone">
            Lihat katalog
          </Link>
        </Panel>
      ) : (
        <div className="grid gap-5">
          {data.map((o) => (
            <Panel key={o.id} className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-display text-lg text-ink">{o.order_no}</p>
                  <p className="mt-1 text-xs text-ash">
                    {formatDate(o.created_at)} · {PAY_METHOD_LABEL[o.payment_method]}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-flex border border-line px-2 py-1 text-xs text-ink">
                    {ORDER_STATUS_LABEL[o.status] ?? o.status}
                  </span>
                  <p className="mt-2 font-display text-xl text-ink">{formatIdr(o.total_idr)}</p>
                </div>
              </div>

              <ul className="mt-5 divide-y divide-line border-y border-line text-sm">
                {o.storefront_order_items.map((i, idx) => (
                  <li key={`${o.id}-${idx}`} className="flex items-center justify-between gap-4 py-3">
                    <span className="min-w-0 flex-1 truncate text-ink">{i.product_name}</span>
                    <span className="text-xs text-ash">{Number(i.qty_kg)} kg</span>
                    <span className="w-32 text-right text-ink">{formatIdr(i.line_total_idr)}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  to="/pesanan/$orderNo"
                  params={{ orderNo: o.order_no }}
                  search={{ t: o.access_token }}
                  className="eyebrow border border-ink/25 px-5 py-3 text-ink"
                >
                  Lacak pesanan
                </Link>
                <button
                  type="button"
                  onClick={() => reorder(o)}
                  className="eyebrow bg-crimson px-5 py-3 text-bone transition-colors hover:bg-crimson-deep"
                >
                  Pesan ulang
                </button>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </AppShell>
  );
}
