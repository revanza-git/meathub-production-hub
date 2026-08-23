import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell, Panel, RoleGate } from "@/components/app/app-shell";
import { supabase } from "@/integrations/supabase/client";

import { downloadCsv, toCsv } from "@/lib/meatlink/csv";
import { useBi, useFormat, useLang } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  head: () => ({
    meta: [
      { title: "Laporan & ekspor — Meatlink admin" },
      {
        name: "description",
        content:
          "Ringkasan penjualan, pembayaran, nilai stok, dan piutang tempo Meatlink lengkap dengan ekspor CSV.",
      },
      { property: "og:title", content: "Laporan & ekspor — Meatlink admin" },
      {
        property: "og:description",
        content: "Penjualan, pembayaran, stok, dan piutang tempo dalam satu laporan.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminReportsPage,
});

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

const REVENUE_STATUSES = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED", "COMPLETED"];

function AdminReportsPage() {
  const bi = useBi();
  const fmt = useFormat();
  const { lang } = useLang();
  const locale = lang === "en" ? "en-GB" : "id-ID";
  const today = new Date();
  const monthAgo = new Date(today.getTime() - 29 * 86400000);
  const [from, setFrom] = useState(isoDate(monthAgo));
  const [to, setTo] = useState(isoDate(today));

  const range = useMemo(
    () => ({
      start: new Date(`${from}T00:00:00`).toISOString(),
      end: new Date(`${to}T23:59:59.999`).toISOString(),
    }),
    [from, to],
  );

  const ordersQuery = useQuery({
    queryKey: ["admin-report-orders", range.start, range.end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("storefront_orders")
        .select(
          "id, order_no, created_at, paid_at, status, payment_method, payment_channel, payment_ref, buyer_name, company, phone, email, city, subtotal_idr, discount_idr, coupon_code, total_idr, courier_name, tracking_no, due_date, credit_term_days, delivered_at, buyer_confirmed_at",
        )
        .gte("created_at", range.start)
        .lte("created_at", range.end)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const itemsQuery = useQuery({
    queryKey: ["admin-report-items", range.start, range.end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("storefront_order_items")
        .select(
          "product_name, slug, category, qty_kg, unit_price_idr, line_total_idr, created_at, storefront_orders!inner(order_no, status, created_at)",
        )
        .gte("created_at", range.start)
        .lte("created_at", range.end);
      if (error) throw error;
      return data ?? [];
    },
  });

  const inventoryQuery = useQuery({
    queryKey: ["admin-report-inventory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_inventory")
        .select(
          "name, slug, brand, origin, category, condition, qty_on_hand_kg, sale_price_idr, markup_idr, is_active, is_published, updated_at",
        )
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const orders = ordersQuery.data ?? [];
  const paidOrders = orders.filter((o) => REVENUE_STATUSES.includes(o.status));
  const revenue = paidOrders.reduce((s, o) => s + Number(o.total_idr), 0);
  const discounts = orders.reduce((s, o) => s + Number(o.discount_idr ?? 0), 0);
  const stockValue = (inventoryQuery.data ?? []).reduce(
    (s, i) => s + Number(i.qty_on_hand_kg) * (Number(i.sale_price_idr) + Number(i.markup_idr)),
    0,
  );

  const receivables = orders.filter(
    (o) =>
      o.payment_method === "TOP" &&
      !o.paid_at &&
      !["CANCELLED", "EXPIRED"].includes(o.status as string),
  );
  const receivableTotal = receivables.reduce((s, o) => s + Number(o.total_idr), 0);
  const overdue = receivables.filter((o) => o.due_date && new Date(o.due_date) < new Date());

  function guard(rows: unknown[]) {
    if (rows.length === 0) {
      toast.error(bi("Tidak ada data pada rentang tanggal ini.", "No data in this date range."));
      return false;
    }
    return true;
  }

  function exportSales() {
    if (!guard(orders)) return;
    downloadCsv(
      `meatlink-${bi("penjualan", "sales")}-${from}-${to}.csv`,
      toCsv(
        orders.map((o) => ({
          [bi("order_no", "Order No")]: o.order_no,
          [bi("tanggal", "Date")]: fmt.dateTime(o.created_at),
          [bi("status", "Status")]: o.status,
          [bi("metode", "Method")]: o.payment_method,
          [bi("pembeli", "Buyer")]: o.buyer_name,
          [bi("perusahaan", "Company")]: o.company ?? "",
          [bi("kota", "City")]: o.city ?? "",
          [bi("telepon", "Phone")]: o.phone,
          [bi("email", "Email")]: o.email ?? "",
          [bi("subtotal_idr", "Subtotal (IDR)")]: Number(o.subtotal_idr),
          [bi("diskon_idr", "Discount (IDR)")]: Number(o.discount_idr ?? 0),
          [bi("kode_promo", "Coupon Code")]: o.coupon_code ?? "",
          [bi("total_idr", "Total (IDR)")]: Number(o.total_idr),
          [bi("kurir", "Courier")]: o.courier_name ?? "",
          [bi("resi", "Tracking No")]: o.tracking_no ?? "",
          [bi("diterima", "Received")]: o.buyer_confirmed_at
            ? fmt.dateTime(o.buyer_confirmed_at)
            : "",
        })),
      ),
    );
  }

  function exportItems() {
    const rows = itemsQuery.data ?? [];
    if (!guard(rows)) return;
    downloadCsv(
      `meatlink-${bi("pergerakan-produk", "product-movement")}-${from}-${to}.csv`,
      toCsv(
        rows.map((r) => {
          const parent = (r as { storefront_orders?: { order_no?: string; status?: string } })
            .storefront_orders;
          return {
            [bi("order_no", "Order No")]: parent?.order_no ?? "",
            [bi("status_order", "Order Status")]: parent?.status ?? "",
            [bi("tanggal", "Date")]: fmt.dateTime(r.created_at),
            [bi("produk", "Product")]: r.product_name,
            [bi("slug", "Slug")]: r.slug ?? "",
            [bi("kategori", "Category")]: r.category ?? "",
            [bi("qty_kg", "Qty (kg)")]: Number(r.qty_kg),
            [bi("harga_per_kg", "Price per kg")]: Number(r.unit_price_idr),
            [bi("total_idr", "Total (IDR)")]: Number(r.line_total_idr),
          };
        }),
      ),
    );
  }

  function exportPayments() {
    const rows = orders.filter((o) => o.paid_at);
    if (!guard(rows)) return;
    downloadCsv(
      `meatlink-${bi("pembayaran", "payments")}-${from}-${to}.csv`,
      toCsv(
        rows.map((o) => ({
          [bi("order_no", "Order No")]: o.order_no,
          [bi("dibayar_pada", "Paid At")]: fmt.dateTime(o.paid_at as string),
          [bi("metode", "Method")]: o.payment_method,
          [bi("kanal", "Channel")]: o.payment_channel ?? "",
          [bi("referensi", "Reference")]: o.payment_ref ?? "",
          [bi("pembeli", "Buyer")]: o.buyer_name,
          [bi("total_idr", "Total (IDR)")]: Number(o.total_idr),
        })),
      ),
    );
  }

  function exportStock() {
    const rows = inventoryQuery.data ?? [];
    if (!guard(rows)) return;
    downloadCsv(
      `meatlink-${bi("stok", "stock")}-${isoDate(new Date())}.csv`,
      toCsv(
        rows.map((i) => ({
          [bi("produk", "Product")]: i.name,
          [bi("slug", "Slug")]: i.slug ?? "",
          [bi("brand", "Brand")]: i.brand,
          [bi("origin", "Origin")]: i.origin,
          [bi("kategori", "Category")]: i.category,
          [bi("kondisi", "Condition")]: i.condition ?? "",
          [bi("qty_on_hand_kg", "Qty On Hand (kg)")]: Number(i.qty_on_hand_kg),
          [bi("harga_pokok_idr", "Cost Price (IDR)")]: Number(i.sale_price_idr),
          [bi("markup_idr", "Markup (IDR)")]: Number(i.markup_idr),
          [bi("harga_publik_idr", "Public Price (IDR)")]: Number(i.sale_price_idr) + Number(i.markup_idr),
          nilai_stok_idr:
            Number(i.qty_on_hand_kg) * (Number(i.sale_price_idr) + Number(i.markup_idr)),
          [bi("aktif", "Active")]: i.is_active ? bi("ya", "yes") : bi("tidak", "no"),
          [bi("tayang", "Published")]: i.is_published ? bi("ya", "yes") : bi("tidak", "no"),
        })),
      ),
    );
  }

  function exportReceivables() {
    if (!guard(receivables)) return;
    downloadCsv(
      `meatlink-${bi("piutang-tempo", "receivables")}-${from}-${to}.csv`,
      toCsv(
        receivables.map((o) => {
          const days = o.due_date
            ? Math.floor((Date.now() - new Date(o.due_date).getTime()) / 86400000)
            : 0;
          return {
            [bi("order_no", "Order No")]: o.order_no,
            [bi("pembeli", "Buyer")]: o.buyer_name,
            [bi("perusahaan", "Company")]: o.company ?? "",
            [bi("tanggal_order", "Order Date")]: fmt.date(o.created_at),
            [bi("tempo_hari", "Term (days)")]: o.credit_term_days ?? "",
            [bi("jatuh_tempo", "Due Date")]: o.due_date ?? "",
            [bi("umur_hari", "Age (days)")]: days > 0 ? days : 0,
            bucket:
              days <= 0 ? bi("belum jatuh tempo", "not yet due") : days <= 30 ? "1-30" : days <= 60 ? "31-60" : "60+",
            [bi("outstanding_idr", "Outstanding (IDR)")]: Number(o.total_idr),
          };
        }),
      ),
    );
  }

  const loading = ordersQuery.isLoading || inventoryQuery.isLoading;

  return (
    <AppShell
      title={bi("Laporan & ekspor", "Reports & exports")}
      intro={bi(
        "Ringkasan penjualan, pembayaran, nilai stok, dan piutang tempo — siap diunduh sebagai CSV.",
        "A summary of sales, payments, stock value and receivables — ready to download as CSV.",
      )}
    >
      <RoleGate allow="admin">
        <div className="grid gap-8">
          <Panel className="p-6 lg:p-8">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,auto)_minmax(0,1fr)] lg:items-end">
              <div className="flex flex-wrap items-end gap-4">
                <Field label={bi("Dari", "From")} value={from} onChange={setFrom} />
                <Field label={bi("Sampai", "To")} value={to} onChange={setTo} />
              </div>
              <p className="text-xs text-ash lg:text-right">
                {loading
                  ? bi("Memuat data…", "Loading data…")
                  : bi(`${orders.length} pesanan pada rentang terpilih`, `${orders.length} orders in the selected range`)}
              </p>
            </div>

            <div className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-2 xl:grid-cols-3">
              <Stat label={bi("Pesanan", "Orders")} value={String(orders.length)} />
              <Stat label={bi("Omzet terbayar", "Paid revenue")} value={fmt.money(revenue)} accent />
              <Stat label={bi("Total diskon", "Total discounts")} value={fmt.money(discounts)} />
              <Stat label={bi("Nilai stok (publik)", "Stock value (public)")} value={fmt.money(stockValue)} />
              <Stat
                label={bi("Piutang tempo", "Receivables (TOP)")}
                value={fmt.money(receivableTotal)}
                hint={bi(`${receivables.length} order`, `${receivables.length} orders`)}
              />
              <Stat
                label={bi("Jatuh tempo lewat", "Overdue")}
                value={bi(`${overdue.length} order`, `${overdue.length} orders`)}
                accent={overdue.length > 0}
              />
            </div>
          </Panel>

          <Panel className="p-6 lg:p-8">
            <SectionHead
              title={bi("Unduh CSV", "Download CSV")}
              note={bi(
                "Semua ekspor mengikuti rentang tanggal di atas, kecuali laporan stok yang selalu memakai posisi terkini.",
                "All exports follow the date range above, except the stock report which always uses the current position.",
              )}
            />
            <div className="mt-6 flex flex-wrap gap-3">
              <ExportButton label={bi("Penjualan", "Sales")} onClick={exportSales} />
              <ExportButton label={bi("Pergerakan produk", "Product movement")} onClick={exportItems} />
              <ExportButton label={bi("Pembayaran", "Payments")} onClick={exportPayments} />
              <ExportButton label={bi("Stok & nilai", "Stock & value")} onClick={exportStock} />
              <ExportButton label={bi("Piutang tempo (aging)", "Receivables aging")} onClick={exportReceivables} />
            </div>
          </Panel>

          <Panel className="p-6 lg:p-8">
            <SectionHead
              title={bi("Piutang tempo", "Receivables")}
              note={bi(
                "Tagihan TOP yang belum terbayar, diurutkan dari pesanan terbaru.",
                "Unpaid TOP invoices, sorted by most recent order.",
              )}
            />
            {receivables.length === 0 ? (
              <p className="mt-6 border border-dashed border-line px-5 py-8 text-center text-sm text-ash">
                {bi(
                  "Tidak ada tagihan tempo yang belum dibayar pada rentang ini.",
                  "No unpaid terms invoices in this range.",
                )}
              </p>
            ) : (
              <ul className="mt-6 divide-y divide-line border-t border-line text-sm">
                {receivables.slice(0, 15).map((o) => {
                  const late = o.due_date && new Date(o.due_date) < new Date();
                  return (
                    <li
                      key={o.id}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-4"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">
                          {o.order_no} · {o.buyer_name}
                        </p>
                        <p className="mt-1 text-xs text-ash">
                          {bi("Jatuh tempo", "Due")} {o.due_date ?? "—"}
                          {late ? (
                            <span className="ml-2 eyebrow text-crimson">{bi("terlambat", "overdue")}</span>
                          ) : null}
                        </p>
                      </div>
                      <span className="shrink-0 font-medium text-ink">
                        {fmt.money(Number(o.total_idr))}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      </RoleGate>
    </AppShell>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="eyebrow text-ash">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 block border border-line bg-card px-4 py-3 text-sm text-ink outline-none transition-colors focus:border-crimson"
      />
    </label>
  );
}

function SectionHead({ title, note }: { title: string; note: string }) {
  return (
    <div>
      <h2 className="font-display text-xl text-ink">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm text-ash">{note}</p>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-card p-5">
      <p className="eyebrow text-ash">{label}</p>
      <p
        className={`mt-3 font-display text-2xl ${accent ? "text-crimson" : "text-ink"}`}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-ash">{hint}</p> : null}
    </div>
  );
}

function ExportButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="eyebrow border border-line bg-card px-5 py-3 text-ink transition-colors hover:border-crimson hover:text-crimson"
    >
      {label}
    </button>
  );
}
