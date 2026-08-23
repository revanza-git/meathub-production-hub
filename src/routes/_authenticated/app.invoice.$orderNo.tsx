import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { type PayMethod } from "@/lib/meatlink/cart";
import { ORDER_STATUS_LABEL_I18N, PAY_METHOD_LABEL_I18N, useBi, useLabel } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/app/invoice/$orderNo")({
  component: InvoicePage,
});

type ItemRow = {
  product_name: string;
  qty_kg: number;
  unit_price_idr: number;
  line_total_idr: number;
};

type OrderRow = {
  order_no: string;
  status: string;
  payment_method: PayMethod;
  buyer_name: string;
  company: string | null;
  phone: string;
  email: string | null;
  address: string;
  city: string | null;
  subtotal_idr: number;
  discount_idr: number | null;
  coupon_code: string | null;
  total_idr: number;
  credit_term_days: number | null;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
  delivered_at: string | null;
  buyer_confirmed_at: string | null;
  storefront_order_items: ItemRow[];
};

function InvoicePage() {
  const { orderNo } = Route.useParams();
  const bi = useBi();
  const label = useLabel();

  const { data, isLoading } = useQuery({
    queryKey: ["buyer-invoice", orderNo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("storefront_orders")
        .select(
          "order_no, status, payment_method, buyer_name, company, phone, email, address, city, subtotal_idr, discount_idr, coupon_code, total_idr, credit_term_days, due_date, paid_at, created_at, delivered_at, buyer_confirmed_at, storefront_order_items(product_name, qty_kg, unit_price_idr, line_total_idr)",
        )
        .eq("order_no", orderNo)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as OrderRow | null;
    },
  });

  if (isLoading) return <p className="p-10 text-sm text-ash">{bi("Memuat faktur…", "Loading invoice…")}</p>;
  if (!data)
    return (
      <div className="p-10">
        <p className="text-sm text-ash">{bi("Faktur tidak ditemukan untuk akun ini.", "No invoice found for this account.")}</p>
        <Link to="/app/pesanan" className="eyebrow mt-4 inline-flex border border-ink/25 px-5 py-3 text-ink">
          {bi("Kembali ke pesanan", "Back to orders")}
        </Link>
      </div>
    );

  const discount = Number(data.discount_idr ?? 0);
  const completed = Boolean(data.buyer_confirmed_at);

  return (
    <main className="mx-auto max-w-3xl bg-background px-6 py-10 text-ink">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to="/app/pesanan" className="eyebrow border border-ink/25 px-5 py-3 text-ink">
          {bi("Kembali", "Back")}
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="eyebrow inline-flex items-center gap-2 bg-crimson px-5 py-3 text-bone"
        >
          <Printer className="h-4 w-4" /> {bi("Cetak / simpan PDF", "Print / save PDF")}
        </button>
      </div>

      <header className="mt-8 flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="font-display text-2xl">Meatlink.id</p>
          <p className="mt-1 text-xs text-ash">{bi("Pasokan daging premium B2B · Seluruh Indonesia", "Premium B2B meat supply · Across Indonesia")}</p>
        </div>
        <div className="text-right">
          <h1 className="font-display text-xl">
            {completed ? bi("Tanda Terima", "Receipt") : bi("Faktur", "Invoice")} {data.order_no}
          </h1>
          <p className="mt-1 text-xs text-ash">{bi("Tanggal", "Date")} {fmt.dateTime(data.created_at)}</p>
          <p className="text-xs text-ash">Status: {label(ORDER_STATUS_LABEL_I18N, data.status)}</p>
        </div>
      </header>

      <section className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="eyebrow text-ash">{bi("Ditagihkan kepada", "Billed to")}</h2>
          <p className="mt-2 text-sm">{data.buyer_name}</p>
          {data.company ? <p className="text-sm">{data.company}</p> : null}
          <p className="text-xs text-ash">
            {data.phone}
            {data.email ? ` · ${data.email}` : ""}
          </p>
          <p className="mt-2 text-sm text-ash">
            {data.address}
            {data.city ? `, ${data.city}` : ""}
          </p>
        </div>
        <div className="sm:text-right">
          <h2 className="eyebrow text-ash">{bi("Pembayaran", "Payment")}</h2>
          <p className="mt-2 text-sm">{label(PAY_METHOD_LABEL_I18N, data.payment_method)}</p>
          {data.credit_term_days ? (
            <p className="text-xs text-ash">
              TOP {data.credit_term_days} {bi("hari · jatuh tempo", "days · due")}{" "}
              {data.due_date ? fmt.dateTime(data.due_date) : "-"}
            </p>
          ) : null}
          <p className="text-xs text-ash">
            {data.paid_at ? `${bi("Lunas", "Paid")} ${fmt.dateTime(data.paid_at)}` : bi("Belum lunas", "Unpaid")}
          </p>
          {data.delivered_at ? (
            <p className="text-xs text-ash">{bi("Diterima", "Delivered")} {fmt.dateTime(data.delivered_at)}</p>
          ) : null}
        </div>
      </section>

      <table className="mt-8 w-full border-collapse text-sm">
        <thead>
          <tr className="border-y border-line text-left text-xs uppercase tracking-wide text-ash">
            <th className="py-3">{bi("Produk", "Product")}</th>
            <th className="py-3 text-right">Qty (kg)</th>
            <th className="py-3 text-right">{bi("Harga/kg", "Price/kg")}</th>
            <th className="py-3 text-right">{bi("Jumlah", "Amount")}</th>
          </tr>
        </thead>
        <tbody>
          {data.storefront_order_items.map((i, idx) => (
            <tr key={`${data.order_no}-${idx}`} className="border-b border-line">
              <td className="py-3">{i.product_name}</td>
              <td className="py-3 text-right">{Number(i.qty_kg)}</td>
              <td className="py-3 text-right">{fmt.money(Number(i.unit_price_idr))}</td>
              <td className="py-3 text-right">{fmt.money(Number(i.line_total_idr))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 ml-auto w-full max-w-xs text-sm">
        <div className="flex justify-between py-1">
          <span className="text-ash">Subtotal</span>
          <span>{fmt.money(Number(data.subtotal_idr))}</span>
        </div>
        {discount > 0 ? (
          <div className="flex justify-between py-1">
            <span className="text-ash">{bi("Diskon", "Discount")} {data.coupon_code ?? ""}</span>
            <span className="text-crimson">-{fmt.money(discount)}</span>
          </div>
        ) : null}
        <div className="mt-2 flex justify-between border-t border-line pt-3">
          <span className="eyebrow text-ash">Total</span>
          <span className="font-display text-xl">{fmt.money(Number(data.total_idr))}</span>
        </div>
      </div>

      <footer className="mt-10 border-t border-line pt-6 text-xs text-ash">
        {completed
          ? bi(
              `Pesanan dikonfirmasi diterima pembeli pada ${fmt.dateTime(data.buyer_confirmed_at as string)}. Dokumen ini berlaku sebagai tanda terima.`,
              `Order confirmed as received by the buyer on ${fmt.dateTime(data.buyer_confirmed_at as string)}. This document serves as a receipt.`,
            )
          : bi(
              "Dokumen ini dihasilkan otomatis dan sah tanpa tanda tangan. Ongkos kirim dikonfirmasi terpisah oleh tim Meatlink.",
              "This document is generated automatically and valid without a signature. Shipping costs are confirmed separately by the Meatlink team.",
            )}
      </footer>
    </main>
  );
}
