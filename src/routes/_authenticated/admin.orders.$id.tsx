import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell, Panel, RoleGate } from "@/components/app/app-shell";
import { Field, SelectInput, TextArea } from "@/components/site/form-kit";
import { supabase } from "@/integrations/supabase/client";
import {
  ORDER_STATUSES,
  STATUS_CLASS,
  STATUS_LABEL,
  TERM_LABEL,
  TOP_DECISION_LABEL,
  formatDate,
  formatKg,
  isTop,
  type BuyerOrder,
  type OrderStatus,
  type TopDecision,
} from "@/lib/meatlink/orders";
import { useBi } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/orders/$id")({
  component: AdminOrderDetailPage,
});

function AdminOrderDetailPage() {
  const bi = useBi();
  return (
    <AppShell
      title={bi("Detail pesanan", "Order detail")}
      intro={bi(
        "Cocokkan dengan pemasok, tentukan keputusan pembayaran, dan lanjutkan pesanan.",
        "Match a supplier, set the payment decision, and move the order forward.",
      )}
      actions={
        <Link to="/admin/orders" className="eyebrow border border-ink/25 px-5 py-3 text-ink">
          {bi("Kembali ke konsol", "Back to console")}
        </Link>
      }
    >
      <RoleGate allow="admin">
        <DetailBody />
      </RoleGate>
    </AppShell>
  );
}

type VendorOption = { id: string; vendor_user_id: string; name: string; qty_kg: number };

function DetailBody() {
  const bi = useBi();
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [status, setStatus] = useState<OrderStatus>("PENDING");
  const [vendorUserId, setVendorUserId] = useState("");
  const [topDecision, setTopDecision] = useState<"" | TopDecision>("");
  const [adminNotes, setAdminNotes] = useState("");
  const [pending, setPending] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-order", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("buyer_orders").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as BuyerOrder | null;
    },
  });

  const { data: vendors } = useQuery({
    queryKey: ["admin-vendor-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_products")
        .select("id, vendor_user_id, name, qty_kg")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as VendorOption[];
    },
  });

  useEffect(() => {
    if (!data) return;
    setStatus(data.status);
    setVendorUserId(data.vendor_user_id ?? "");
    setTopDecision(data.top_decision ?? "");
    setAdminNotes(data.admin_notes ?? "");
  }, [data]);

  async function save() {
    setPending(true);
    const { error } = await supabase
      .from("buyer_orders")
      .update({
        status,
        vendor_user_id: vendorUserId || null,
        top_decision: topDecision || null,
        admin_notes: adminNotes.trim() || null,
      })
      .eq("id", id);
    setPending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(bi("Pesanan diperbarui.", "Order updated."));
    void qc.invalidateQueries({ queryKey: ["admin-order", id] });
    void qc.invalidateQueries({ queryKey: ["admin-orders"] });
  }

  if (isLoading) return <p className="text-sm text-ash">{bi("Memuat…", "Loading…")}</p>;
  if (!data) return <Panel className="p-8 text-sm text-ash">{bi("Pesanan tidak ditemukan.", "Order not found.")}</Panel>;

  const matches = (vendors ?? []).filter((v) =>
    v.name.toLowerCase().includes(data.product_text.toLowerCase().split(" ")[0] ?? ""),
  );
  const vendorList = matches.length > 0 ? matches : (vendors ?? []);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Panel className="p-6 lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl text-ink">{data.order_no}</h2>
          <span className={`inline-flex border px-2 py-1 text-xs ${STATUS_CLASS[data.status]}`}>
            {STATUS_LABEL[data.status]}
          </span>
        </div>

        <dl className="mt-6 grid gap-5 sm:grid-cols-2">
          <Detail label={bi("Pembeli", "Buyer")} value={data.buyer_name} />
          <Detail label={bi("Produk", "Product")} value={data.product_text} />
          <Detail label={bi("Jumlah", "Quantity")} value={formatKg(data.qty_kg)} />
          <Detail label={bi("Sistem pembayaran", "Payment system")} value={TERM_LABEL[data.payment_term]} />
          <Detail label={bi("Lokasi pengiriman", "Delivery location")} value={data.delivery_location ?? "—"} />
          <Detail label={bi("Dibutuhkan sebelum", "Needed by")} value={data.needed_by ?? "—"} />
          <Detail label={bi("Dikirim", "Submitted")} value={formatDate(data.created_at)} />
          <Detail
            label={bi("Keputusan saat ini", "Current decision")}
            value={data.top_decision ? TOP_DECISION_LABEL[data.top_decision] : "—"}
          />
        </dl>

        {data.buyer_notes ? (
          <div className="mt-6 border-t border-line pt-5">
            <p className="eyebrow text-ash">{bi("Catatan pembeli", "Buyer notes")}</p>
            <p className="mt-2 whitespace-pre-line text-sm text-ink">{data.buyer_notes}</p>
          </div>
        ) : null}
      </Panel>

      <Panel className="p-6">
        <p className="eyebrow text-ash">{bi("Tindakan admin", "Admin actions")}</p>
        <div className="mt-4 grid gap-4">
          <Field label={bi("Status", "Status")}>
            <SelectInput value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)}>
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </SelectInput>
          </Field>

          <Field label={bi("Stok pemasok yang cocok", "Matched supplier stock")} hint={bi("Pembeli tidak pernah melihat identitas pemasok.", "Buyers never see supplier identities.")}>
            <SelectInput value={vendorUserId} onChange={(e) => setVendorUserId(e.target.value)}>
              <option value="">{bi("Belum cocok", "Not matched")}</option>
              {vendorList.map((v) => (
                <option key={v.id} value={v.vendor_user_id}>
                  {v.name} — {formatKg(v.qty_kg)}
                </option>
              ))}
            </SelectInput>
          </Field>

          {isTop(data.payment_term) ? (
            <Field label={bi("Keputusan TOP", "TOP decision")} hint={bi("Wajib diisi untuk pesanan dengan termin kredit.", "Required for credit-term orders.")}>
              <SelectInput
                value={topDecision}
                onChange={(e) => setTopDecision(e.target.value as "" | TopDecision)}
              >
                <option value="">{bi("Belum diputuskan", "Undecided")}</option>
                {(Object.keys(TOP_DECISION_LABEL) as TopDecision[]).map((d) => (
                  <option key={d} value={d}>
                    {TOP_DECISION_LABEL[d]}
                  </option>
                ))}
              </SelectInput>
            </Field>
          ) : null}

          <Field label={bi("Catatan internal", "Internal notes")}>
            <TextArea rows={4} value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} />
          </Field>

          <button
            type="button"
            onClick={() => void save()}
            disabled={pending}
            className="eyebrow bg-crimson px-6 py-4 text-bone disabled:opacity-60"
          >
            {pending ? bi("Menyimpan…", "Saving…") : bi("Simpan perubahan", "Save changes")}
          </button>
        </div>
      </Panel>
    </div>
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
