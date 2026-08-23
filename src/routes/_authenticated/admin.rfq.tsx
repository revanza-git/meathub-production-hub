import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, Panel, RoleGate } from "@/components/app/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/meatlink/orders";
import { useBi } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/rfq")({
  component: AdminRfqPage,
  head: () => ({
    meta: [
      { title: "RFQ inbox — Meatlink admin" },
      {
        name: "description",
        content: "Every quote request and supplier application submitted from the public site.",
      },
      { property: "og:title", content: "RFQ inbox — Meatlink admin" },
      {
        property: "og:description",
        content: "Every quote request and supplier application submitted from the public site.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type RfqItem = {
  category?: string | null;
  product_cut?: string | null;
  origin_preference?: string | null;
  brand_preference?: string | null;
  grade?: string | null;
  volume?: string | null;
  notes?: string | null;
};

type QuoteRequest = {
  id: string;
  company_name: string;
  contact_name: string;
  whatsapp: string;
  email: string | null;
  delivery_location: string;
  required_delivery_date: string;
  payment_terms: string | null;
  purchase_frequency: string | null;
  target_price: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  items: RfqItem[] | null;
};

type SupplierApplication = {
  id: string;
  company_name: string;
  contact_name: string;
  whatsapp: string;
  email: string | null;
  product_categories: string | null;
  origins: string | null;
  delivery_coverage: string | null;
  moq: string | null;
  payment_terms: string | null;
  notes: string | null;
  status: string;
  created_at: string;
};

const RFQ_STATUSES = ["new", "in_review", "quoted", "won", "lost"] as const;
const SUPPLIER_STATUSES = ["new", "in_review", "approved", "rejected"] as const;

function AdminRfqPage() {
  const bi = useBi();
  return (
    <AppShell
      title={bi("Kotak masuk RFQ", "RFQ inbox")}
      intro={bi(
        "Permintaan penawaran dan aplikasi pemasok yang dikirim dari situs publik.",
        "Quote requests and supplier applications submitted from the public website.",
      )}
    >
      <RoleGate allow="admin">
        <RfqBody />
      </RoleGate>
    </AppShell>
  );
}

function RfqBody() {
  const bi = useBi();
  const [tab, setTab] = useState<"rfq" | "suppliers">("rfq");

  return (
    <div className="grid gap-6">
      <div className="flex gap-3">
        {(
          [
            ["rfq", bi("Permintaan penawaran", "Quote requests")],
            ["suppliers", bi("Aplikasi pemasok", "Supplier applications")],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`eyebrow border px-4 py-3 transition-colors ${
              tab === key
                ? "border-crimson bg-crimson text-bone"
                : "border-line bg-card text-ash hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "rfq" ? <QuoteRequests /> : <SupplierApplications />}
    </div>
  );
}

function useStatusUpdater(table: "quote_requests" | "supplier_applications", key: string) {
  const qc = useQueryClient();
  const bi = useBi();
  return async (id: string, status: string) => {
    const { error } = await supabase.from(table).update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(bi("Status diperbarui", "Status updated"));
    void qc.invalidateQueries({ queryKey: [key] });
  };
}

function QuoteRequests() {
  const bi = useBi();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-quote-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as QuoteRequest[];
    },
  });
  const setStatus = useStatusUpdater("quote_requests", "admin-quote-requests");

  if (isLoading) return <p className="text-sm text-ash">{bi("Memuat…", "Loading…")}</p>;
  if (!data?.length)
    return (
      <Panel className="p-8">
        <p className="text-sm text-ash">{bi("Belum ada permintaan penawaran.", "No quote requests yet.")}</p>
      </Panel>
    );

  return (
    <div className="grid gap-4">
      {data.map((r) => (
        <Panel key={r.id} className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-xl text-ink">{r.company_name}</h2>
              <p className="mt-1 text-sm text-ash">
                {r.contact_name} · {r.whatsapp}
                {r.email ? ` · ${r.email}` : ""}
              </p>
              <p className="mt-1 text-xs text-ash">
                {formatDate(r.created_at)} · {bi("Kirim ke", "Deliver to")} {r.delivery_location} · {bi("Dibutuhkan", "Needed")}{" "}
                {r.required_delivery_date}
              </p>
            </div>
            <select
              value={r.status}
              onChange={(e) => void setStatus(r.id, e.target.value)}
              className="border border-line bg-card px-3 py-2 text-sm text-ink outline-none focus:border-crimson"
            >
              {RFQ_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              {RFQ_STATUSES.includes(r.status as (typeof RFQ_STATUSES)[number]) ? null : (
                <option value={r.status}>{r.status}</option>
              )}
            </select>
          </div>

          <ul className="mt-5 grid gap-2 border-t border-line pt-4">
            {(r.items ?? []).map((item, i) => (
              <li key={i} className="text-sm text-ink">
                <span className="text-ash">{i + 1}.</span> {item.product_cut}
                {item.grade ? ` (${item.grade})` : ""} — {item.volume}
                {item.origin_preference ? ` · ${item.origin_preference}` : ""}
                {item.brand_preference ? ` · ${item.brand_preference}` : ""}
              </li>
            ))}
          </ul>

          {r.notes ? (
            <p className="mt-4 whitespace-pre-line border-t border-line pt-4 text-sm text-ash">
              {r.notes}
            </p>
          ) : null}
        </Panel>
      ))}
    </div>
  );
}

function SupplierApplications() {
  const bi = useBi();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-supplier-applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_applications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as SupplierApplication[];
    },
  });
  const setStatus = useStatusUpdater("supplier_applications", "admin-supplier-applications");

  if (isLoading) return <p className="text-sm text-ash">{bi("Memuat…", "Loading…")}</p>;
  if (!data?.length)
    return (
      <Panel className="p-8">
        <p className="text-sm text-ash">{bi("Belum ada aplikasi pemasok.", "No supplier applications yet.")}</p>
      </Panel>
    );

  return (
    <div className="grid gap-4">
      {data.map((s) => (
        <Panel key={s.id} className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-xl text-ink">{s.company_name}</h2>
              <p className="mt-1 text-sm text-ash">
                {s.contact_name} · {s.whatsapp}
                {s.email ? ` · ${s.email}` : ""}
              </p>
              <p className="mt-1 text-xs text-ash">{formatDate(s.created_at)}</p>
            </div>
            <select
              value={s.status}
              onChange={(e) => void setStatus(s.id, e.target.value)}
              className="border border-line bg-card px-3 py-2 text-sm text-ink outline-none focus:border-crimson"
            >
              {SUPPLIER_STATUSES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
              {SUPPLIER_STATUSES.includes(s.status as (typeof SUPPLIER_STATUSES)[number]) ? null : (
                <option value={s.status}>{s.status}</option>
              )}
            </select>
          </div>
          <dl className="mt-5 grid gap-2 border-t border-line pt-4 text-sm sm:grid-cols-2">
            {[
              [bi("Kategori", "Categories"), s.product_categories],
              [bi("Asal", "Origins"), s.origins],
              [bi("Jangkauan", "Coverage"), s.delivery_coverage],
              [bi("MOQ", "MOQ"), s.moq],
              [bi("Termin pembayaran", "Payment terms"), s.payment_terms],
            ].map(([label, value]) =>
              value ? (
                <div key={label as string}>
                  <dt className="eyebrow text-ash">{label}</dt>
                  <dd className="mt-1 text-ink">{value}</dd>
                </div>
              ) : null,
            )}
          </dl>
          {s.notes ? (
            <p className="mt-4 whitespace-pre-line border-t border-line pt-4 text-sm text-ash">
              {s.notes}
            </p>
          ) : null}
        </Panel>
      ))}
    </div>
  );
}
