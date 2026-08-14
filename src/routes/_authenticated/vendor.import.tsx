import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, Panel, RoleGate } from "@/components/app/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  CATEGORY_LABEL,
  CSV_TEMPLATE,
  formatDate,
  parseStockCsv,
  type ProductCategory,
} from "@/lib/meatlink/orders";

export const Route = createFileRoute("/_authenticated/vendor/import")({
  component: VendorImportPage,
});

function VendorImportPage() {
  return (
    <AppShell
      title="Bulk import"
      intro="Paste or upload a CSV to update many products at once. Stock lives in the Meatlink database — no external sheet stays connected."
      actions={
        <Link to="/vendor/catalog" className="eyebrow border border-ink/25 px-5 py-3 text-ink">
          Back to catalogue
        </Link>
      }
    >
      <RoleGate allow="vendor">
        <ImportBody />
      </RoleGate>
    </AppShell>
  );
}

type MovementRow = {
  id: number;
  delta_kg: number;
  qty_after: number;
  source: string;
  created_at: string;
  product_id: string;
};

function ImportBody() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);

  const parsed = text.trim() ? parseStockCsv(text) : { rows: [], errors: [] };

  const { data: products } = useQuery({
    queryKey: ["vendor-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vendor_products").select("id, name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  const { data: movements } = useQuery({
    queryKey: ["vendor-movements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_stock_movements")
        .select("id, delta_kg, qty_after, source, created_at, product_id")
        .order("created_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      return data as MovementRow[];
    },
  });

  const nameById = new Map((products ?? []).map((p) => [p.id, p.name]));

  async function apply() {
    if (!user || parsed.rows.length === 0) return;
    setPending(true);
    const payload = parsed.rows.map((r) => ({
      vendor_user_id: user.id,
      name: r.name,
      category: r.category as ProductCategory,
      qty_kg: r.qty_kg,
    }));
    const { error } = await supabase
      .from("vendor_products")
      .upsert(payload, { onConflict: "vendor_user_id,name" });
    setPending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${payload.length} product(s) updated.`);
    setText("");
    void qc.invalidateQueries({ queryKey: ["vendor-products"] });
    void qc.invalidateQueries({ queryKey: ["vendor-movements"] });
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setText(await file.text());
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Panel className="p-6 lg:col-span-2">
        <p className="eyebrow text-ash">CSV data</p>
        <p className="mt-2 text-xs text-ash">
          Columns: <code>product_name, category, qty_kg</code>. Categories: Prime Cut, 2nd Cut, Offal,
          Bone. Existing products with the same name are updated.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input type="file" accept=".csv,text/csv" onChange={(e) => void onFile(e)} className="text-sm" />
          <button
            type="button"
            onClick={() => setText(CSV_TEMPLATE)}
            className="text-xs text-ash underline underline-offset-4"
          >
            Load template
          </button>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          spellCheck={false}
          placeholder={CSV_TEMPLATE}
          className="mt-4 w-full border border-line bg-bone px-4 py-3 font-mono text-xs text-ink outline-none focus:border-crimson"
        />

        {parsed.errors.length > 0 ? (
          <ul className="mt-4 grid gap-1 border border-crimson/40 bg-crimson/5 p-4 text-xs text-crimson">
            {parsed.errors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        ) : null}

        {parsed.rows.length > 0 ? (
          <div className="mt-4 overflow-x-auto border border-line">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-[0.16em] text-ash">
                <tr>
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Qty (kg)</th>
                </tr>
              </thead>
              <tbody>
                {parsed.rows.map((r) => (
                  <tr key={r.name} className="border-b border-line/60 last:border-0">
                    <td className="px-3 py-2 text-ink">{r.name}</td>
                    <td className="px-3 py-2 text-ash">{CATEGORY_LABEL[r.category]}</td>
                    <td className="px-3 py-2 text-ink">{r.qty_kg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => void apply()}
          disabled={pending || parsed.rows.length === 0}
          className="eyebrow mt-5 bg-crimson px-6 py-4 text-bone disabled:opacity-60"
        >
          {pending ? "Importing…" : `Import ${parsed.rows.length} row(s)`}
        </button>
      </Panel>

      <Panel className="p-6">
        <p className="eyebrow text-ash">Recent stock changes</p>
        <ol className="mt-4 grid gap-3">
          {(movements ?? []).map((m) => (
            <li key={m.id} className="border-b border-line/60 pb-3 last:border-0">
              <p className="text-sm text-ink">{nameById.get(m.product_id) ?? "Product"}</p>
              <p className="text-xs text-ash">
                {Number(m.delta_kg) >= 0 ? "+" : ""}
                {Number(m.delta_kg)} kg → {Number(m.qty_after)} kg · {m.source} ·{" "}
                {formatDate(m.created_at)}
              </p>
            </li>
          ))}
          {(movements ?? []).length === 0 ? (
            <li className="text-sm text-ash">No changes recorded yet.</li>
          ) : null}
        </ol>
      </Panel>
    </div>
  );
}
