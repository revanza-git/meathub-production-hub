import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell, Panel } from "@/components/app/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, CATEGORY_LABEL, formatKg, type ProductCategory } from "@/lib/meatlink/orders";

export const Route = createFileRoute("/_authenticated/app/stock")({
  component: StockPage,
});

type StockRow = {
  product_name: string | null;
  category: ProductCategory | null;
  qty_kg: number | null;
  last_updated_at: string | null;
};

function StockPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"" | ProductCategory>("");

  const { data, isLoading } = useQuery({
    queryKey: ["public-stock"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("ml_public_stock");
      if (error) throw error;
      return ((data ?? []) as unknown as StockRow[])
        .slice()
        .sort((a, b) => (a.product_name ?? "").localeCompare(b.product_name ?? ""));

    },
  });

  const rows = (data ?? []).filter(
    (r) =>
      (!category || r.category === category) &&
      (r.product_name ?? "").toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <AppShell
      title="Available stock"
      intro="Live quantities across the Meatlink supplier network. Supplier identities stay confidential."
    >
      <div className="mb-5 flex flex-wrap gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search product"
          className="border border-line bg-card px-4 py-3 text-sm text-ink outline-none focus:border-crimson"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as "" | ProductCategory)}
          className="border border-line bg-card px-4 py-3 text-sm text-ink outline-none focus:border-crimson"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-sm text-ash">Loading stock…</p>
      ) : rows.length === 0 ? (
        <Panel className="p-10 text-center text-sm text-ash">No stock matches your filters.</Panel>
      ) : (
        <Panel className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-[0.16em] text-ash">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Available</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.product_name}-${r.category}`} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-3 text-ink">{r.product_name}</td>
                  <td className="px-4 py-3 text-ash">
                    {r.category ? CATEGORY_LABEL[r.category] : "—"}
                  </td>
                  <td className="px-4 py-3 text-ink">{formatKg(r.qty_kg ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </AppShell>
  );
}
