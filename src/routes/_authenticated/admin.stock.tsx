import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell, Panel, RoleGate } from "@/components/app/app-shell";
import { supabase } from "@/integrations/supabase/client";
import {
  CATEGORIES,
  formatDate,
  formatKg,
  type ProductCategory,
  type VendorProduct,
} from "@/lib/meatlink/orders";
import { useBi, useLabel, CATEGORY_LABEL_I18N } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/stock")({
  head: () => ({ meta: [
    { title: "Stok Pemasok Admin — Meatlink.id" },
    { name: "description", content: "Pantau stok pemasok yang tersedia melalui Meatlink." },
    { property: "og:title", content: "Stok Pemasok Admin — Meatlink.id" },
    { property: "og:description", content: "Pantau stok pemasok yang tersedia melalui Meatlink." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: AdminStockPage,
});

function AdminStockPage() {
  const bi = useBi();
  return (
    <AppShell
      title={bi("Stok pemasok", "Supplier stock")}
      intro={bi(
        "Visibilitas penuh di seluruh katalog pemasok, termasuk siapa yang memegang stok.",
        "Full visibility across every supplier catalogue, including who holds the stock.",
      )}
    >
      <RoleGate allow="admin">
        <AdminStockBody />
      </RoleGate>
    </AppShell>
  );
}

function AdminStockBody() {
  const bi = useBi();
  const label = useLabel();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"" | ProductCategory>("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-stock"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_products")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as VendorProduct[];
    },
  });

  const rows = (data ?? []).filter(
    (p) =>
      (!category || p.category === category) &&
      p.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={bi("Cari produk", "Search product")}
          className="border border-line bg-card px-4 py-3 text-sm text-ink outline-none focus:border-crimson"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as "" | ProductCategory)}
          className="border border-line bg-card px-4 py-3 text-sm text-ink outline-none focus:border-crimson"
        >
          <option value="">{bi("Semua kategori", "All categories")}</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {label(CATEGORY_LABEL_I18N, c.value)}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-sm text-ash">{bi("Memuat stok…", "Loading stock…")}</p>
      ) : rows.length === 0 ? (
        <Panel className="p-10 text-center text-sm text-ash">{bi("Tidak ada stok pemasok ditemukan.", "No supplier stock found.")}</Panel>
      ) : (
        <Panel className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-[0.16em] text-ash">
              <tr>
                <th className="px-4 py-3">{bi("Produk", "Product")}</th>
                <th className="px-4 py-3">{bi("Kategori", "Category")}</th>
                <th className="px-4 py-3">{bi("Jumlah", "Qty")}</th>
                <th className="px-4 py-3">{bi("ID Pemasok", "Supplier ID")}</th>
                <th className="px-4 py-3">{bi("Status", "Status")}</th>
                <th className="px-4 py-3">{bi("Diperbarui", "Updated")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-3 text-ink">{p.name}</td>
                  <td className="px-4 py-3 text-ash">{label(CATEGORY_LABEL_I18N, p.category)}</td>
                  <td className="px-4 py-3 text-ink">{formatKg(p.qty_kg)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ash">
                    {p.vendor_user_id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 text-xs text-ash">{p.is_active ? bi("Ditampilkan", "Listed") : bi("Disembunyikan", "Hidden")}</td>
                  <td className="px-4 py-3 text-xs text-ash">{formatDate(p.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </div>
  );
}
