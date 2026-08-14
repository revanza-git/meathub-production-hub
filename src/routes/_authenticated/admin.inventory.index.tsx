import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell, Panel, RoleGate } from "@/components/app/app-shell";
import { Field, SelectInput, TextInput } from "@/components/site/form-kit";
import { supabase } from "@/integrations/supabase/client";
import {
  CONDITIONS,
  CONDITION_LABEL,
  DEFAULT_LOW_STOCK_KG,
  LOW_STOCK_KEY,
  ORIGINS,
  PAGE_SIZES,
  formatIdr,
  formatQty,
  weightToKg,
  type InventoryItem,
} from "@/lib/meatlink/inventory";


export const Route = createFileRoute("/_authenticated/admin/inventory/")({
  component: AdminInventoryPage,
  head: () => ({
    meta: [
      { title: "Inventory — Meatlink admin" },
      {
        name: "description",
        content: "Manage the Meatlink house inventory: origins, brands, prices and stock on hand.",
      },
    ],
  }),
});

function AdminInventoryPage() {
  return (
    <AppShell
      title="Meatlink inventory"
      intro="Our own stock list — origins, brands, sale prices and quantities on hand."
      actions={
        <Link to="/admin/inventory/import" className="eyebrow border border-ink/25 px-5 py-3 text-ink">
          Import spreadsheet
        </Link>
      }
    >
      <RoleGate allow="admin">
        <InventoryBody />
      </RoleGate>
    </AppShell>
  );
}

const EMPTY_FORM = {
  origin: "Australia",
  brand: "",
  name: "",
  condition: "FRZ",
  avg_weight_text: "",
  sale_price_idr: "",
  qty_on_hand_kg: "",
};

function InventoryBody() {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [origin, setOrigin] = useState("");
  const [condition, setCondition] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [pending, setPending] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-inventory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_inventory")
        .select("*")
        .order("origin")
        .order("name");
      if (error) throw error;
      return data as InventoryItem[];
    },
  });

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? []).filter(
      (item) =>
        (!origin || item.origin === origin) &&
        (!condition || (item.condition ?? "") === condition) &&
        (!q || `${item.name} ${item.brand}`.toLowerCase().includes(q)),
    );
  }, [data, query, origin, condition]);

  const totals = useMemo(() => {
    const kg = rows.reduce((sum, r) => sum + Number(r.qty_on_hand_kg), 0);
    const value = rows.reduce(
      (sum, r) => sum + Number(r.qty_on_hand_kg) * Number(r.sale_price_idr),
      0,
    );
    return { skus: rows.length, kg, value };
  }, [rows]);

  const originOptions = useMemo(() => {
    const set = new Set<string>([...ORIGINS, ...(data ?? []).map((d) => d.origin)]);
    return [...set].sort();
  }, [data]);

  function refresh() {
    void qc.invalidateQueries({ queryKey: ["admin-inventory"] });
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Product name is required.");
      return;
    }
    setPending(true);
    const { error } = await supabase.from("admin_inventory").insert({
      origin: form.origin,
      brand: form.brand.trim(),
      name: form.name.trim(),
      condition: form.condition || null,
      avg_weight_text: form.avg_weight_text.trim() || null,
      avg_weight_kg: weightToKg(form.avg_weight_text),
      sale_price_idr: Number(form.sale_price_idr || 0),
      qty_on_hand_kg: Number(form.qty_on_hand_kg || 0),
    });
    setPending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setForm(EMPTY_FORM);
    setShowForm(false);
    toast.success("Item added.");
    refresh();
  }

  async function patch(id: string, values: Partial<InventoryItem>) {
    const { error } = await supabase.from("admin_inventory").update(values).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Inventory updated.");
      refresh();
    }
  }

  async function remove(item: InventoryItem) {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    const { error } = await supabase.from("admin_inventory").delete().eq("id", item.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Item deleted.");
      refresh();
    }
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="SKUs" value={String(totals.skus)} />
        <Stat label="Stock on hand" value={formatQty(totals.kg)} />
        <Stat label="Stock value" value={formatIdr(totals.value)} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search product or brand"
          aria-label="Search inventory"
          className="min-w-[220px] flex-1 border border-line bg-card px-4 py-3 text-sm text-ink outline-none focus:border-crimson"
        />
        <select
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          aria-label="Filter by origin"
          className="border border-line bg-card px-4 py-3 text-sm text-ink outline-none focus:border-crimson"
        >
          <option value="">All origins</option>
          {originOptions.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <select
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          aria-label="Filter by condition"
          className="border border-line bg-card px-4 py-3 text-sm text-ink outline-none focus:border-crimson"
        >
          <option value="">All conditions</option>
          {CONDITIONS.map((c) => (
            <option key={c} value={c}>
              {CONDITION_LABEL[c]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="eyebrow bg-crimson px-5 py-3 text-bone"
        >
          {showForm ? "Close" : "Add item"}
        </button>
      </div>

      {showForm ? (
        <Panel className="p-6">
          <form onSubmit={addItem} className="grid gap-4 md:grid-cols-3">
            <Field label="Origin" required>
              <SelectInput
                value={form.origin}
                onChange={(e) => setForm({ ...form, origin: e.target.value })}
              >
                {originOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Brand">
              <TextInput value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
            </Field>
            <Field label="Product name" required>
              <TextInput
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Condition">
              <SelectInput
                value={form.condition}
                onChange={(e) => setForm({ ...form, condition: e.target.value })}
              >
                <option value="">Not specified</option>
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {CONDITION_LABEL[c]}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Average weight" hint="e.g. 8KG or 250GR">
              <TextInput
                value={form.avg_weight_text}
                onChange={(e) => setForm({ ...form, avg_weight_text: e.target.value })}
              />
            </Field>
            <Field label="Sale price (IDR / kg)">
              <TextInput
                inputMode="numeric"
                value={form.sale_price_idr}
                onChange={(e) => setForm({ ...form, sale_price_idr: e.target.value })}
              />
            </Field>
            <Field label="Quantity on hand (kg)">
              <TextInput
                inputMode="decimal"
                value={form.qty_on_hand_kg}
                onChange={(e) => setForm({ ...form, qty_on_hand_kg: e.target.value })}
              />
            </Field>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={pending}
                className="eyebrow w-full bg-crimson px-6 py-4 text-bone disabled:opacity-60"
              >
                {pending ? "Saving…" : "Save item"}
              </button>
            </div>
          </form>
        </Panel>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-ash">Loading inventory…</p>
      ) : rows.length === 0 ? (
        <Panel className="p-10 text-center text-sm text-ash">No inventory matches these filters.</Panel>
      ) : (
        <Panel className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-[0.16em] text-ash">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Origin</th>
                <th className="px-4 py-3">Brand</th>
                <th className="px-4 py-3">Cond.</th>
                <th className="px-4 py-3">Avg wt</th>
                <th className="px-4 py-3">Price / kg</th>
                <th className="px-4 py-3">Qty (kg)</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-3 text-ink">
                    {item.name}
                    {!item.is_active ? <span className="ml-2 text-xs text-ash">(hidden)</span> : null}
                  </td>
                  <td className="px-4 py-3 text-ash">{item.origin}</td>
                  <td className="px-4 py-3 text-xs text-ash">{item.brand || "—"}</td>
                  <td className="px-4 py-3 text-xs text-ash">
                    {item.condition ? CONDITION_LABEL[item.condition] ?? item.condition : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-ash">{item.avg_weight_text ?? "—"}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={0}
                      step="1000"
                      defaultValue={Number(item.sale_price_idr)}
                      aria-label={`Price for ${item.name}`}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (Number.isFinite(v) && v !== Number(item.sale_price_idr)) {
                          void patch(item.id, { sale_price_idr: v });
                        }
                      }}
                      className="w-32 border border-line bg-bone px-2 py-1 text-sm text-ink outline-none focus:border-crimson"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      defaultValue={Number(item.qty_on_hand_kg)}
                      aria-label={`Quantity for ${item.name}`}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (Number.isFinite(v) && v !== Number(item.qty_on_hand_kg)) {
                          void patch(item.id, { qty_on_hand_kg: v });
                        }
                      }}
                      className="w-28 border border-line bg-bone px-2 py-1 text-sm text-ink outline-none focus:border-crimson"
                    />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => void patch(item.id, { is_active: !item.is_active })}
                      className="text-xs text-ash underline underline-offset-4"
                    >
                      {item.is_active ? "Hide" : "Show"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(item)}
                      className="ml-3 text-xs text-crimson underline underline-offset-4"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Panel className="p-5">
      <p className="eyebrow text-ash">{label}</p>
      <p className="mt-2 font-display text-2xl text-ink">{value}</p>
    </Panel>
  );
}
