import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, Panel, RoleGate } from "@/components/app/app-shell";
import { Field, SelectInput, TextInput } from "@/components/site/form-kit";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  CATEGORIES,
  CATEGORY_LABEL,
  formatDate,
  formatKg,
  type ProductCategory,
  type VendorProduct,
} from "@/lib/meatlink/orders";

export const Route = createFileRoute("/_authenticated/vendor/catalog")({
  component: VendorCatalogPage,
});

function VendorCatalogPage() {
  return (
    <AppShell
      title="Catalogue & stock"
      intro="Your products and live quantities. Buyers see the quantities, never your name."
      actions={
        <Link to="/vendor/import" className="eyebrow border border-ink/25 px-5 py-3 text-ink">
          Bulk import
        </Link>
      }
    >
      <RoleGate allow="vendor">
        <CatalogBody />
      </RoleGate>
    </AppShell>
  );
}

function CatalogBody() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ProductCategory>("PRIME_CUT");
  const [qty, setQty] = useState("");
  const [pending, setPending] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["vendor-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_products")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as VendorProduct[];
    },
  });

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const q = Number(qty || 0);
    if (!Number.isFinite(q) || q < 0) {
      toast.error("Enter a valid quantity.");
      return;
    }
    setPending(true);
    const { error } = await supabase.from("vendor_products").insert({
      vendor_user_id: user.id,
      name: name.trim(),
      category,
      qty_kg: q,
    });
    setPending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setName("");
    setQty("");
    toast.success("Product added.");
    void qc.invalidateQueries({ queryKey: ["vendor-products"] });
  }

  async function updateQty(id: string, value: string) {
    const q = Number(value);
    if (!Number.isFinite(q) || q < 0) return;
    const { error } = await supabase.from("vendor_products").update({ qty_kg: q }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Stock updated.");
      void qc.invalidateQueries({ queryKey: ["vendor-products"] });
    }
  }

  async function toggleActive(id: string, active: boolean) {
    const { error } = await supabase.from("vendor_products").update({ is_active: active }).eq("id", id);
    if (error) toast.error(error.message);
    else void qc.invalidateQueries({ queryKey: ["vendor-products"] });
  }

  async function remove(id: string) {
    const { error } = await supabase.from("vendor_products").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Product removed.");
      void qc.invalidateQueries({ queryKey: ["vendor-products"] });
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Panel className="p-6 lg:col-span-1">
        <p className="eyebrow text-ash">Add product</p>
        <form onSubmit={addProduct} className="mt-4 grid gap-4">
          <Field label="Product name" required>
            <TextInput required value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Category" required>
            <SelectInput
              value={category}
              onChange={(e) => setCategory(e.target.value as ProductCategory)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Stock (kg)" required>
            <TextInput required inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} />
          </Field>
          <button
            type="submit"
            disabled={pending}
            className="eyebrow bg-crimson px-6 py-4 text-bone disabled:opacity-60"
          >
            {pending ? "Saving…" : "Add product"}
          </button>
        </form>
      </Panel>

      <Panel className="overflow-x-auto lg:col-span-2">
        {isLoading ? (
          <p className="p-6 text-sm text-ash">Loading catalogue…</p>
        ) : !data || data.length === 0 ? (
          <p className="p-10 text-center text-sm text-ash">No products yet.</p>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-[0.16em] text-ash">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Stock (kg)</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.id} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-3 text-ink">
                    {p.name}
                    {!p.is_active ? <span className="ml-2 text-xs text-ash">(hidden)</span> : null}
                  </td>
                  <td className="px-4 py-3 text-ash">{CATEGORY_LABEL[p.category]}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      defaultValue={Number(p.qty_kg)}
                      onBlur={(e) => {
                        if (Number(e.target.value) !== Number(p.qty_kg)) {
                          void updateQty(p.id, e.target.value);
                        }
                      }}
                      className="w-28 border border-line bg-bone px-2 py-1 text-sm text-ink outline-none focus:border-crimson"
                      aria-label={`Stock for ${p.name}`}
                    />
                  </td>
                  <td className="px-4 py-3 text-xs text-ash">{formatDate(p.updated_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => void toggleActive(p.id, !p.is_active)}
                      className="text-xs text-ash underline underline-offset-4"
                    >
                      {p.is_active ? "Hide" : "Show"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(p.id)}
                      className="ml-3 text-xs text-crimson underline underline-offset-4"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {data && data.length > 0 ? (
          <p className="border-t border-line px-4 py-3 text-xs text-ash">
            Total listed: {formatKg(data.reduce((s, p) => s + Number(p.qty_kg), 0))}
          </p>
        ) : null}
      </Panel>
    </div>
  );
}
