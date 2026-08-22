import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import { AppShell, Panel } from "@/components/app/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { formatIdr } from "@/lib/meatlink/inventory";
import { ORDER_STATUS_LABEL, PAY_METHOD_LABEL, useCart, type PayMethod } from "@/lib/meatlink/cart";
import { formatDate } from "@/lib/meatlink/orders";
import { OrderTimeline, type TimelineEvent } from "@/components/meatlink/order-timeline";
import { DeliveryPanel } from "@/components/meatlink/delivery-panel";

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
  subtotal_idr: number;
  discount_idr: number | null;
  coupon_code: string | null;
  credit_term_days: number | null;
  due_date: string | null;
  paid_at: string | null;
  total_idr: number;
  created_at: string;
  courier_name: string | null;
  tracking_no: string | null;
  eta_date: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  buyer_confirmed_at: string | null;
  storefront_order_items: ItemRow[];
};

const SELECT_COLUMNS =
  "id, order_no, access_token, status, payment_method, subtotal_idr, discount_idr, coupon_code, credit_term_days, due_date, paid_at, total_idr, created_at, courier_name, tracking_no, eta_date, shipped_at, delivered_at, buyer_confirmed_at, storefront_order_items(slug, product_name, qty_kg, unit_price_idr, line_total_idr)";

function dueBadge(order: OrderRow) {
  if (!order.due_date || order.paid_at) return null;
  const due = new Date(`${order.due_date}T00:00:00`);
  const days = Math.ceil((due.getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { label: `Jatuh tempo lewat ${Math.abs(days)} hari`, tone: "overdue" as const };
  if (days <= 3) return { label: `Jatuh tempo ${days} hari lagi`, tone: "soon" as const };
  return { label: `Jatuh tempo ${formatDate(order.due_date)}`, tone: "ok" as const };
}

function StoreOrdersPage() {
  const { add } = useCart();
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["my-store-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("storefront_orders")
        .select(SELECT_COLUMNS)
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
      intro="Riwayat pesanan katalog Anda, lengkap dengan status pengiriman, konfirmasi terima, dan tagihan tempo."
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
          {data.map((o) => {
            const badge = dueBadge(o);
            const open = openId === o.id;
            return (
              <Panel key={o.id} className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-display text-lg text-ink">{o.order_no}</p>
                    <p className="mt-1 text-xs text-ash">
                      {formatDate(o.created_at)} · {PAY_METHOD_LABEL[o.payment_method]}
                      {o.credit_term_days ? ` · Tempo ${o.credit_term_days} hari` : ""}
                    </p>
                    {badge ? (
                      <span
                        className={`mt-2 inline-flex border px-2 py-1 text-[11px] ${
                          badge.tone === "overdue"
                            ? "border-crimson text-crimson"
                            : badge.tone === "soon"
                              ? "border-ink/40 text-ink"
                              : "border-line text-ash"
                        }`}
                      >
                        {badge.label}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <span className="inline-flex border border-line px-2 py-1 text-xs text-ink">
                      {ORDER_STATUS_LABEL[o.status] ?? o.status}
                    </span>
                    <p className="mt-2 font-display text-xl text-ink">{formatIdr(o.total_idr)}</p>
                    {o.discount_idr && Number(o.discount_idr) > 0 ? (
                      <p className="mt-1 text-xs text-ash">
                        Diskon {formatIdr(Number(o.discount_idr))}
                        {o.coupon_code ? ` · ${o.coupon_code}` : ""}
                      </p>
                    ) : null}
                  </div>
                </div>

                <ul className="mt-5 divide-y divide-line border-y border-line text-sm">
                  {o.storefront_order_items.map((i, idx) => (
                    <li
                      key={`${o.id}-${idx}`}
                      className="flex items-center justify-between gap-4 py-3"
                    >
                      <span className="min-w-0 flex-1 truncate text-ink">{i.product_name}</span>
                      <span className="text-xs text-ash">{Number(i.qty_kg)} kg</span>
                      <span className="w-32 text-right text-ink">{formatIdr(i.line_total_idr)}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : o.id)}
                    className="eyebrow inline-flex items-center gap-2 border border-ink/25 px-5 py-3 text-ink"
                    aria-expanded={open}
                  >
                    {open ? "Tutup detail" : "Detail & pengiriman"}
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
                    />
                  </button>
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
                  <Link
                    to="/app/invoice/$orderNo"
                    params={{ orderNo: o.order_no }}
                    className="eyebrow border border-ink/25 px-5 py-3 text-ink"
                  >
                    {o.buyer_confirmed_at ? "Tanda terima" : "Faktur"}
                  </Link>
                </div>

                {open ? <OrderDetail order={o} onChanged={() => refetch()} /> : null}
              </Panel>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

function OrderDetail({ order, onChanged }: { order: OrderRow; onChanged: () => void }) {
  const { data: events } = useQuery({
    queryKey: ["my-store-order-timeline", order.order_no],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("ml_track_order", {
        _order_no: order.order_no,
        _token: order.access_token,
      });
      if (error) throw error;
      const payload = data as unknown as { timeline?: TimelineEvent[] } | null;
      return payload?.timeline ?? [];
    },
  });

  return (
    <div className="mt-2">
      {order.credit_term_days ? (
        <div className="mt-6 border border-line p-6">
          <h3 className="eyebrow text-ash">Tagihan tempo</h3>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-ash">Termin</dt>
              <dd className="text-ink">TOP {order.credit_term_days} hari</dd>
            </div>
            <div>
              <dt className="text-xs text-ash">Jatuh tempo</dt>
              <dd className="text-ink">
                {order.due_date ? formatDate(order.due_date) : "Menunggu konfirmasi"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ash">Subtotal</dt>
              <dd className="text-ink">{formatIdr(Number(order.subtotal_idr))}</dd>
            </div>
            <div>
              <dt className="text-xs text-ash">Status pelunasan</dt>
              <dd className="text-ink">
                {order.paid_at ? `Lunas ${formatDate(order.paid_at)}` : "Belum lunas"}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}

      <DeliveryPanel
        orderNo={order.order_no}
        token={order.access_token}
        status={order.status}
        courier={order.courier_name}
        trackingNo={order.tracking_no}
        etaDate={order.eta_date}
        shippedAt={order.shipped_at}
        deliveredAt={order.delivered_at}
        confirmedAt={order.buyer_confirmed_at}
        onConfirmed={onChanged}
      />

      <OrderTimeline events={events ?? []} />
    </div>
  );
}
