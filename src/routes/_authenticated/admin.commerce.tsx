import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, Panel, RoleGate } from "@/components/app/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { formatIdr } from "@/lib/meatlink/inventory";

export const Route = createFileRoute("/_authenticated/admin/commerce")({
  head: () => ({
    meta: [
      { title: "Promo & kredit — Meatlink admin" },
      {
        name: "description",
        content:
          "Kelola kode promo, harga kontrak pembeli dan limit pembayaran tempo untuk pelanggan Meatlink.",
      },
      { property: "og:title", content: "Promo & kredit — Meatlink admin" },
      {
        property: "og:description",
        content: "Kode promo, harga kontrak, dan limit tempo pembeli Meatlink.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminCommercePage,
});

function AdminCommercePage() {
  return (
    <AppShell
      title="Promo & kredit"
      intro="Kode promo checkout, harga kontrak per pembeli, dan limit pembayaran tempo."
    >
      <RoleGate allow="admin">
        <div className="space-y-12">
          <Coupons />
          <CreditAccounts />
          <BuyerPrices />
        </div>
      </RoleGate>
    </AppShell>
  );
}

const labelClass = "block text-[10px] font-semibold uppercase tracking-tighter text-ash mb-1";
const inputClass = "w-full bg-transparent border-b border-line py-2 text-sm text-ink outline-none focus:border-crimson transition-colors placeholder:text-ash/50";
const buttonPrimary = "bg-ink text-bone text-[10px] font-semibold uppercase tracking-[0.2em] px-6 py-3 hover:bg-crimson transition-colors";
const buttonSecondary = "border border-line bg-card text-ink text-[10px] font-semibold uppercase tracking-[0.15em] px-4 py-2 hover:bg-sand transition-colors";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-4">
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

function Coupons() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    code: "",
    description: "",
    discount_type: "PERCENT",
    discount_value: "",
    min_subtotal_idr: "",
    max_discount_idr: "",
    ends_at: "",
    usage_limit: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ml_coupons")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function create() {
    const code = form.code.trim().toUpperCase();
    const value = Number(form.discount_value);
    if (!code || !value) {
      toast.error("Kode dan nilai diskon wajib diisi.");
      return;
    }
    const { error } = await supabase.from("ml_coupons").insert({
      code,
      description: form.description.trim() || null,
      discount_type: form.discount_type,
      discount_value: value,
      min_subtotal_idr: Number(form.min_subtotal_idr) || 0,
      max_discount_idr: form.max_discount_idr ? Number(form.max_discount_idr) : null,
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Kode promo dibuat.");
    setForm({
      code: "",
      description: "",
      discount_type: "PERCENT",
      discount_value: "",
      min_subtotal_idr: "",
      max_discount_idr: "",
      ends_at: "",
      usage_limit: "",
    });
    qc.invalidateQueries({ queryKey: ["admin-coupons"] });
  }

  async function toggle(id: string, active: boolean) {
    const { error } = await supabase.from("ml_coupons").update({ is_active: active }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["admin-coupons"] });
  }

  return (
    <section className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xl text-ink">Kode promo</h2>
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ash">Formulir baru</span>
      </div>

      <Panel className="overflow-hidden shadow-sm">
        <div className="grid grid-cols-1 border-b border-line md:grid-cols-4">
          <Field label="Kode">
            <input
              type="text"
              className={`${inputClass} uppercase`}
              placeholder="KODE"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
            />
          </Field>
          <Field label="Tipe">
            <select
              className={inputClass}
              value={form.discount_type}
              onChange={(e) => setForm((f) => ({ ...f, discount_type: e.target.value }))}
            >
              <option value="PERCENT">Persen (%)</option>
              <option value="AMOUNT">Nominal (Rp)</option>
            </select>
          </Field>
          <Field label="Nilai diskon">
            <input
              type="number"
              className={inputClass}
              placeholder="0"
              value={form.discount_value}
              onChange={(e) => setForm((f) => ({ ...f, discount_value: e.target.value }))}
            />
          </Field>
          <Field label="Min. belanja">
            <input
              type="number"
              className={inputClass}
              placeholder="0"
              value={form.min_subtotal_idr}
              onChange={(e) => setForm((f) => ({ ...f, min_subtotal_idr: e.target.value }))}
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4">
          <Field label="Maks. diskon">
            <input
              type="number"
              className={inputClass}
              placeholder="0"
              value={form.max_discount_idr}
              onChange={(e) => setForm((f) => ({ ...f, max_discount_idr: e.target.value }))}
            />
          </Field>
          <Field label="Berlaku sampai">
            <input
              type="date"
              className={inputClass}
              value={form.ends_at}
              onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))}
            />
          </Field>
          <Field label="Kuota">
            <input
              type="number"
              className={inputClass}
              placeholder="0"
              value={form.usage_limit}
              onChange={(e) => setForm((f) => ({ ...f, usage_limit: e.target.value }))}
            />
          </Field>
          <Field label="Keterangan">
            <input
              type="text"
              className={inputClass}
              placeholder="-"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </Field>
        </div>
        <div className="flex items-center justify-between border-t border-line bg-sand/50 px-6 py-4">
          {isLoading ? (
            <p className="text-xs text-ash">Memuat…</p>
          ) : (data ?? []).length === 0 ? (
            <p className="font-display text-xs italic text-ash">Belum ada kode promo aktif.</p>
          ) : (
            <p className="text-xs text-ash">{(data ?? []).length} kode promo tersedia.</p>
          )}
          <button type="button" onClick={() => void create()} className={buttonPrimary}>
            Tambah kode
          </button>
        </div>
      </Panel>

      {!isLoading && (data ?? []).length > 0 && (
        <ul className="border border-line bg-card text-sm">
          {(data ?? []).map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4 last:border-b-0">
              <div>
                <p className="font-medium text-ink">
                  {c.code} ·{" "}
                  {c.discount_type === "PERCENT"
                    ? `${Number(c.discount_value)}%`
                    : formatIdr(Number(c.discount_value))}
                </p>
                <p className="text-xs text-ash">
                  Min {formatIdr(Number(c.min_subtotal_idr))} · dipakai {c.used_count}
                  {c.usage_limit ? `/${c.usage_limit}` : ""}
                  {c.ends_at ? ` · s/d ${new Date(c.ends_at).toLocaleDateString("id-ID")}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void toggle(c.id, !c.is_active)}
                className={buttonSecondary}
              >
                {c.is_active ? "Nonaktifkan" : "Aktifkan"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CreditAccounts() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-credit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ml_credit_accounts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const [draft, setDraft] = useState<Record<string, { limit: string; term: string }>>({});

  async function save(id: string, status: string, current: { limit_idr: number; term_days: number }) {
    const d = draft[id];
    const { error } = await supabase
      .from("ml_credit_accounts")
      .update({
        status,
        limit_idr: d?.limit ? Number(d.limit) : current.limit_idr,
        term_days: d?.term ? Number(d.term) : current.term_days,
        approved_at: status === "APPROVED" ? new Date().toISOString() : null,
      })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Limit tempo diperbarui.");
    qc.invalidateQueries({ queryKey: ["admin-credit"] });
  }

  return (
    <section className="space-y-6">
      <h2 className="font-display text-xl text-ink">Limit pembayaran tempo (TOP)</h2>

      {isLoading ? (
        <Panel className="p-8">
          <p className="text-sm text-ash">Memuat…</p>
        </Panel>
      ) : (data ?? []).length === 0 ? (
        <div className="border border-dashed border-line bg-card/50 py-12 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-ash">
            Belum ada pengajuan limit tempo dari pembeli.
          </p>
        </div>
      ) : (
        <ul className="border border-line bg-card text-sm">
          {(data ?? []).map((a) => {
            const d = draft[a.id] ?? {
              limit: String(Number(a.limit_idr)),
              term: String(a.term_days),
            };
            return (
              <li key={a.id} className="grid items-center gap-4 border-b border-line px-6 py-4 last:border-b-0 md:grid-cols-[1.4fr_auto_auto_auto]">
                <div>
                  <p className="font-mono text-xs text-ash">{a.user_id}</p>
                  <p className="text-xs text-ash">Status: {a.status}</p>
                </div>
                <Field label="Limit">
                  <input
                    type="number"
                    className={`${inputClass} md:w-40`}
                    value={d.limit}
                    onChange={(e) => setDraft((p) => ({ ...p, [a.id]: { ...d, limit: e.target.value } }))}
                  />
                </Field>
                <Field label="Hari">
                  <input
                    type="number"
                    className={`${inputClass} md:w-24`}
                    value={d.term}
                    onChange={(e) => setDraft((p) => ({ ...p, [a.id]: { ...d, term: e.target.value } }))}
                  />
                </Field>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void save(a.id, "APPROVED", {
                        limit_idr: Number(a.limit_idr),
                        term_days: a.term_days,
                      })
                    }
                    className={buttonSecondary}
                  >
                    Setujui
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void save(a.id, "SUSPENDED", {
                        limit_idr: Number(a.limit_idr),
                        term_days: a.term_days,
                      })
                    }
                    className={buttonSecondary}
                  >
                    Bekukan
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function BuyerPrices() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ user_id: "", slug: "", price: "", valid_until: "" });

  const { data } = useQuery({
    queryKey: ["admin-buyer-prices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ml_buyer_prices")
        .select("*, admin_inventory(name, slug)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function add() {
    const { data: inv, error: invError } = await supabase
      .from("admin_inventory")
      .select("id")
      .eq("slug", form.slug.trim())
      .maybeSingle();
    if (invError || !inv) {
      toast.error("Produk dengan slug tersebut tidak ditemukan.");
      return;
    }
    const { error } = await supabase.from("ml_buyer_prices").upsert(
      {
        user_id: form.user_id.trim(),
        inventory_id: inv.id,
        price_idr: Number(form.price),
        valid_until: form.valid_until || null,
      },
      { onConflict: "user_id,inventory_id" },
    );
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Harga kontrak disimpan.");
    setForm({ user_id: "", slug: "", price: "", valid_until: "" });
    qc.invalidateQueries({ queryKey: ["admin-buyer-prices"] });
  }

  async function remove(id: string) {
    const { error } = await supabase.from("ml_buyer_prices").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["admin-buyer-prices"] });
  }

  return (
    <section className="space-y-6">
      <h2 className="font-display text-xl text-ink">Harga kontrak pembeli</h2>

      <Panel className="overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-4">
          <Field label="User ID pembeli">
            <input
              type="text"
              className={inputClass}
              placeholder="Cari user…"
              value={form.user_id}
              onChange={(e) => setForm((f) => ({ ...f, user_id: e.target.value }))}
            />
          </Field>
          <Field label="Slug produk">
            <input
              type="text"
              className={inputClass}
              placeholder="daging-sapi-prime"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            />
          </Field>
          <Field label="Harga /kg">
            <input
              type="number"
              className={inputClass}
              placeholder="0"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            />
          </Field>
          <Field label="Berlaku sampai">
            <input
              type="date"
              className={inputClass}
              value={form.valid_until}
              onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))}
            />
          </Field>
        </div>
        <div className="flex items-center justify-between border-t border-line bg-sand/50 px-6 py-4">
          <p className="font-display text-xs italic text-ash">
            {(data ?? []).length === 0 ? "Belum ada harga kontrak yang tercatat." : `${(data ?? []).length} harga kontrak tercatat.`}
          </p>
          <button type="button" onClick={() => void add()} className={buttonPrimary}>
            Simpan harga
          </button>
        </div>
      </Panel>

      {(data ?? []).length > 0 && (
        <ul className="border border-line bg-card text-sm">
          {(data ?? []).map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 border-b border-line px-6 py-4 last:border-b-0">
              <div>
                <p className="text-ink">
                  {(p as { admin_inventory?: { name?: string } }).admin_inventory?.name ?? "Produk"} —{" "}
                  {formatIdr(Number(p.price_idr))}/kg
                </p>
                <p className="font-mono text-xs text-ash">
                  {p.user_id}
                  {p.valid_until ? ` · s/d ${p.valid_until}` : ""}
                </p>
              </div>
              <button type="button" onClick={() => void remove(p.id)} className={buttonSecondary}>
                Hapus
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
