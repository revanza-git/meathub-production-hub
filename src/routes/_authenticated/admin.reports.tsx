import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell, Panel, RoleGate } from "@/components/app/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { formatIdr } from "@/lib/meatlink/inventory";
import { downloadCsv, toCsv } from "@/lib/meatlink/csv";

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
      toast.error("Tidak ada data pada rentang tanggal ini.");
      return false;
    }
    return true;
  }

  function exportSales() {
    if (!guard(orders)) return;
    downloadCsv(
      `meatlink-penjualan-${from}-${to}.csv`,
      toCsv(
        orders.map((o) => ({
          order_no: o.order_no,
          tanggal: new Date(o.created_at).toLocaleString("id-ID"),
          status: o.status,
          metode: o.payment_method,
          pembeli: o.buyer_name,
          perusahaan: o.company ?? "",
          kota: o.city ?? "",
          telepon: o.phone,
          email: o.email ?? "",
          subtotal_idr: Number(o.subtotal_idr),
          diskon_idr: Number(o.discount_idr ?? 0),
          kode_promo: o.coupon_code ?? "",
          total_idr: Number(o.total_idr),
          kurir: o.courier_name ?? "",
          resi: o.tracking_no ?? "",
          diterima: o.buyer_confirmed_at
            ? new Date(o.buyer_confirmed_at).toLocaleString("id-ID")
            : "",
        })),
      ),
    );
  }

  function exportItems() {
    const rows = itemsQuery.data ?? [];
    if (!guard(rows)) return;
    downloadCsv(
      `meatlink-pergerakan-produk-${from}-${to}.csv`,
      toCsv(
        rows.map((r) => {
          const parent = (r as { storefront_orders?: { order_no?: string; status?: string } })
            .storefront_orders;
          return {
            order_no: parent?.order_no ?? "",
            status_order: parent?.status ?? "",
            tanggal: new Date(r.created_at).toLocaleString("id-ID"),
            produk: r.product_name,
            slug: r.slug ?? "",
            kategori: r.category ?? "",
            qty_kg: Number(r.qty_kg),
            harga_per_kg: Number(r.unit_price_idr),
            total_idr: Number(r.line_total_idr),
          };
        }),
      ),
    );
  }

  function exportPayments() {
    const rows = orders.filter((o) => o.paid_at);
    if (!guard(rows)) return;
    downloadCsv(
      `meatlink-pembayaran-${from}-${to}.csv`,
      toCsv(
        rows.map((o) => ({
          order_no: o.order_no,
          dibayar_pada: new Date(o.paid_at as string).toLocaleString("id-ID"),
          metode: o.payment_method,
          kanal: o.payment_channel ?? "",
          referensi: o.payment_ref ?? "",
          pembeli: o.buyer_name,
          total_idr: Number(o.total_idr),
        })),
      ),
    );
  }

  function exportStock() {
    const rows = inventoryQuery.data ?? [];
    if (!guard(rows)) return;
    downloadCsv(
      `meatlink-stok-${isoDate(new Date())}.csv`,
      toCsv(
        rows.map((i) => ({
          produk: i.name,
          slug: i.slug ?? "",
          brand: i.brand,
          origin: i.origin,
          kategori: i.category,
          kondisi: i.condition ?? "",
          qty_on_hand_kg: Number(i.qty_on_hand_kg),
          harga_pokok_idr: Number(i.sale_price_idr),
          markup_idr: Number(i.markup_idr),
          harga_publik_idr: Number(i.sale_price_idr) + Number(i.markup_idr),
          nilai_stok_idr:
            Number(i.qty_on_hand_kg) * (Number(i.sale_price_idr) + Number(i.markup_idr)),
          aktif: i.is_active ? "ya" : "tidak",
          tayang: i.is_published ? "ya" : "tidak",
        })),
      ),
    );
  }

  function exportReceivables() {
    if (!guard(receivables)) return;
    downloadCsv(
      `meatlink-piutang-tempo-${from}-${to}.csv`,
      toCsv(
        receivables.map((o) => {
          const days = o.due_date
            ? Math.floor((Date.now() - new Date(o.due_date).getTime()) / 86400000)
            : 0;
          return {
            order_no: o.order_no,
            pembeli: o.buyer_name,
            perusahaan: o.company ?? "",
            tanggal_order: new Date(o.created_at).toLocaleDateString("id-ID"),
            tempo_hari: o.credit_term_days ?? "",
            jatuh_tempo: o.due_date ?? "",
            umur_hari: days > 0 ? days : 0,
            bucket:
              days <= 0 ? "belum jatuh tempo" : days <= 30 ? "1-30" : days <= 60 ? "31-60" : "60+",
            outstanding_idr: Number(o.total_idr),
          };
        }),
      ),
    );
  }

  const loading = ordersQuery.isLoading || inventoryQuery.isLoading;

  return (
    <AppShell
      title="Laporan & ekspor"
      intro="Ringkasan penjualan, pembayaran, nilai stok, dan piutang tempo — siap diunduh sebagai CSV."
    >
      <RoleGate allow="admin">
        <div className="grid gap-8">
          <Panel className="p-6 lg:p-8">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,auto)_minmax(0,1fr)] lg:items-end">
              <div className="flex flex-wrap items-end gap-4">
                <Field label="Dari" value={from} onChange={setFrom} />
                <Field label="Sampai" value={to} onChange={setTo} />
              </div>
              <p className="text-xs text-ash lg:text-right">
                {loading ? "Memuat data…" : `${orders.length} pesanan pada rentang terpilih`}
              </p>
            </div>

            <div className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-2 xl:grid-cols-3">
              <Stat label="Pesanan" value={String(orders.length)} />
              <Stat label="Omzet terbayar" value={formatIdr(revenue)} accent />
              <Stat label="Total diskon" value={formatIdr(discounts)} />
              <Stat label="Nilai stok (publik)" value={formatIdr(stockValue)} />
              <Stat
                label="Piutang tempo"
                value={formatIdr(receivableTotal)}
                hint={`${receivables.length} order`}
              />
              <Stat
                label="Jatuh tempo lewat"
                value={`${overdue.length} order`}
                accent={overdue.length > 0}
              />
            </div>
          </Panel>

          <Panel className="p-6 lg:p-8">
            <SectionHead
              title="Unduh CSV"
              note="Semua ekspor mengikuti rentang tanggal di atas, kecuali laporan stok yang selalu memakai posisi terkini."
            />
            <div className="mt-6 flex flex-wrap gap-3">
              <ExportButton label="Penjualan" onClick={exportSales} />
              <ExportButton label="Pergerakan produk" onClick={exportItems} />
              <ExportButton label="Pembayaran" onClick={exportPayments} />
              <ExportButton label="Stok & nilai" onClick={exportStock} />
              <ExportButton label="Piutang tempo (aging)" onClick={exportReceivables} />
            </div>
          </Panel>

          <Panel className="p-6 lg:p-8">
            <SectionHead
              title="Piutang tempo"
              note="Tagihan TOP yang belum terbayar, diurutkan dari pesanan terbaru."
            />
            {receivables.length === 0 ? (
              <p className="mt-6 border border-dashed border-line px-5 py-8 text-center text-sm text-ash">
                Tidak ada tagihan tempo yang belum dibayar pada rentang ini.
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
                          Jatuh tempo {o.due_date ?? "—"}
                          {late ? (
                            <span className="ml-2 eyebrow text-crimson">terlambat</span>
                          ) : null}
                        </p>
                      </div>
                      <span className="shrink-0 font-medium text-ink">
                        {formatIdr(Number(o.total_idr))}
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
