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
        <div className="space-y-10 sm:space-y-12">
          <Coupons />
          <CreditAccounts />
          <BuyerPrices />
        </div>
      </RoleGate>
    </AppShell>
  );
}

/* ---------- shared styles ---------- */

const labelClass =
  "block text-[10px] font-semibold uppercase tracking-[0.14em] text-ash mb-1.5 leading-none";
const inputClass =
  "h-10 w-full rounded-none border-b border-line bg-transparent text-sm text-ink outline-none transition-colors focus:border-crimson placeholder:text-ash/50";
const buttonPrimary =
  "w-full sm:w-auto shrink-0 bg-ink text-bone text-[10px] font-semibold uppercase tracking-[0.2em] px-6 py-3 transition-colors hover:bg-crimson focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson";
const buttonSecondary =
  "shrink-0 border border-line bg-card text-ink text-[10px] font-semibold uppercase tracking-[0.15em] px-4 py-2 transition-colors hover:bg-sand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson";
const formGrid =
  "grid grid-cols-1 gap-px bg-line sm:grid-cols-2 xl:grid-cols-4";
const actionBar =
  "flex flex-col gap-3 border-t border-line bg-sand/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 bg-card px-4 py-4 sm:px-5">
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 border-b border-line pb-3">
      <h2 className="truncate font-display text-lg text-ink sm:text-xl">{title}</h2>
      {hint ? (
        <span className="hidden text-[10px] font-semibold uppercase tracking-[0.2em] text-ash sm:block">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <ul className="border border-line bg-card" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <li
          key={i}
          className="flex flex-col gap-3 border-b border-line px-4 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:px-6"
        >
          <div className="w-full space-y-2">
            <div className="h-3.5 w-2/5 animate-pulse bg-sand" />
            <div className="h-3 w-3/5 animate-pulse bg-sand/70" />
          </div>
          <div className="h-8 w-28 shrink-0 animate-pulse bg-sand" />
        </li>
      ))}
    </ul>
  );
}

function EmptyState({
  title,
  description,
  hint,
}: {
  title: string;
  description: string;
  hint?: string;
}) {
  return (
    <div className="border border-dashed border-line bg-card/50 px-6 py-10 text-center sm:py-14">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-crimson">
        {title}
      </p>
      <p className="mx-auto mt-3 max-w-md font-display text-base italic text-ink sm:text-lg">
        {description}
      </p>
      {hint ? <p className="mx-auto mt-2 max-w-md text-xs text-ash">{hint}</p> : null}
    </div>
  );
}

/* ---------- coupons ---------- */

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

  const rows = data ?? [];

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
    <section className="space-y-5 sm:space-y-6">
      <SectionHeader title="Kode promo" hint="Formulir baru" />

      <Panel className="overflow-hidden p-0 shadow-sm">
        <div className={formGrid}>
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
              inputMode="numeric"
              className={inputClass}
              placeholder="0"
              value={form.discount_value}
              onChange={(e) => setForm((f) => ({ ...f, discount_value: e.target.value }))}
            />
          </Field>
          <Field label="Min. belanja">
            <input
              type="number"
              inputMode="numeric"
              className={inputClass}
              placeholder="0"
              value={form.min_subtotal_idr}
              onChange={(e) => setForm((f) => ({ ...f, min_subtotal_idr: e.target.value }))}
            />
          </Field>
          <Field label="Maks. diskon">
            <input
              type="number"
              inputMode="numeric"
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
              inputMode="numeric"
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
        <div className={actionBar}>
          <p className="min-w-0 text-xs text-ash">
            {isLoading
              ? "Memuat kode promo…"
              : rows.length === 0
                ? "Belum ada kode promo."
                : `${rows.length} kode promo tersimpan.`}
          </p>
          <button type="button" onClick={() => void create()} className={buttonPrimary}>
            Tambah kode
          </button>
        </div>
      </Panel>

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Belum ada promo"
          description="Kode promo pertama Anda akan tampil di sini."
          hint="Isi kode, tipe diskon, dan nilainya pada formulir di atas, lalu tekan “Tambah kode”."
        />
      ) : (
        <ul className="border border-line bg-card text-sm">
          {rows.map((c) => (
            <li
              key={c.id}
              className="flex flex-col gap-3 border-b border-line px-4 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:px-6"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">
                  {c.code} ·{" "}
                  {c.discount_type === "PERCENT"
                    ? `${Number(c.discount_value)}%`
                    : formatIdr(Number(c.discount_value))}
                </p>
                <p className="mt-1 text-xs text-ash">
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

/* ---------- credit accounts ---------- */

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
  const rows = data ?? [];

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
    <section className="space-y-5 sm:space-y-6">
      <SectionHeader title="Limit pembayaran tempo (TOP)" hint="Persetujuan" />

      {isLoading ? (
        <ListSkeleton rows={2} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Belum ada pengajuan"
          description="Belum ada pembeli yang mengajukan limit pembayaran tempo."
          hint="Pengajuan dari halaman akun pembeli akan otomatis muncul di sini untuk disetujui atau dibekukan."
        />
      ) : (
        <ul className="border border-line bg-card text-sm">
          {rows.map((a) => {
            const d = draft[a.id] ?? {
              limit: String(Number(a.limit_idr)),
              term: String(a.term_days),
            };
            return (
              <li
                key={a.id}
                className="grid gap-4 border-b border-line px-4 py-5 last:border-b-0 sm:px-6 lg:grid-cols-[minmax(0,1.4fr)_10rem_7rem_auto] lg:items-end"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs text-ash">{a.user_id}</p>
                  <p className="mt-1 text-xs text-ash">Status: {a.status}</p>
                </div>
                <div className="min-w-0">
                  <label className={labelClass}>Limit</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    className={inputClass}
                    value={d.limit}
                    onChange={(e) => setDraft((p) => ({ ...p, [a.id]: { ...d, limit: e.target.value } }))}
                  />
                </div>
                <div className="min-w-0">
                  <label className={labelClass}>Hari</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    className={inputClass}
                    value={d.term}
                    onChange={(e) => setDraft((p) => ({ ...p, [a.id]: { ...d, term: e.target.value } }))}
                  />
                </div>
                <div className="flex flex-wrap gap-2 pb-0.5">
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

/* ---------- buyer contract prices ---------- */

function BuyerPrices() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ user_id: "", slug: "", price: "", valid_until: "" });

  const { data, isLoading } = useQuery({
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

  const rows = data ?? [];

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
    <section className="space-y-5 sm:space-y-6">
      <SectionHeader title="Harga kontrak pembeli" hint="Formulir baru" />

      <Panel className="overflow-hidden p-0 shadow-sm">
        <div className={formGrid}>
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
              inputMode="numeric"
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
        <div className={actionBar}>
          <p className="min-w-0 text-xs text-ash">
            {isLoading
              ? "Memuat harga kontrak…"
              : rows.length === 0
                ? "Belum ada harga kontrak."
                : `${rows.length} harga kontrak tercatat.`}
          </p>
          <button type="button" onClick={() => void add()} className={buttonPrimary}>
            Simpan harga
          </button>
        </div>
      </Panel>

      {isLoading ? (
        <ListSkeleton rows={2} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Belum ada kontrak"
          description="Harga khusus per pembeli belum ditetapkan."
          hint="Masukkan User ID pembeli dan slug produk untuk mengunci harga kontrak pada periode tertentu."
        />
      ) : (
        <ul className="border border-line bg-card text-sm">
          {rows.map((p) => (
            <li
              key={p.id}
              className="flex flex-col gap-3 border-b border-line px-4 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:px-6"
            >
              <div className="min-w-0">
                <p className="truncate text-ink">
                  {(p as { admin_inventory?: { name?: string } }).admin_inventory?.name ?? "Produk"} —{" "}
                  {formatIdr(Number(p.price_idr))}/kg
                </p>
                <p className="mt-1 truncate font-mono text-xs text-ash">
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
