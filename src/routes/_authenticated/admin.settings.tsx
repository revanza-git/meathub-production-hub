import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell, Panel, RoleGate } from "@/components/app/app-shell";
import { Field, TextInput } from "@/components/site/form-kit";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { LOW_STOCK_KEY, DEFAULT_LOW_STOCK_KG } from "@/lib/meatlink/inventory";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: AdminSettingsPage,
  head: () => ({
    meta: [
      { title: "Settings — Meatlink admin" },
      {
        name: "description",
        content: "Configure Meatlink admin settings such as the inventory low-stock early warning level.",
      },
    ],
  }),
});

function AdminSettingsPage() {
  return (
    <AppShell title="Settings" intro="Workspace preferences for the Meatlink admin team.">
      <RoleGate allow="admin">
        <SettingsBody />
      </RoleGate>
    </AppShell>
  );
}

function SettingsBody() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-settings", LOW_STOCK_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", LOW_STOCK_KEY)
        .maybeSingle();
      if (error) throw error;
      return Number(data?.value ?? DEFAULT_LOW_STOCK_KG);
    },
  });

  useEffect(() => {
    if (typeof data === "number") setValue(String(data));
  }, [data]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) {
      toast.error("Enter a valid quantity in kg.");
      return;
    }
    setPending(true);
    const { error } = await supabase
      .from("admin_settings")
      .upsert({ key: LOW_STOCK_KEY, value: n, updated_by: user?.id ?? null }, { onConflict: "key" });
    setPending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Threshold saved.");
    void qc.invalidateQueries({ queryKey: ["admin-settings", LOW_STOCK_KEY] });
    void qc.invalidateQueries({ queryKey: ["admin-inventory"] });
  }

  return (
    <div className="grid gap-6 lg:max-w-2xl">
      <Panel className="p-6">
        <p className="eyebrow text-ash">Signed in as</p>
        <p className="mt-2 font-display text-xl text-ink">{user?.email}</p>
      </Panel>

      <Panel className="p-6">
        <h2 className="font-display text-xl text-ink">Inventory early warning</h2>
        <p className="mt-2 text-sm text-ash">
          Items with stock on hand at or below this level are flagged as “Restock” in the inventory table.
        </p>
        {isLoading ? (
          <p className="mt-4 text-sm text-ash">Loading…</p>
        ) : (
          <form onSubmit={save} className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <Field label="Low stock threshold (kg)" required>
              <TextInput
                inputMode="decimal"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
              />
            </Field>
            <button
              type="submit"
              disabled={pending}
              className="eyebrow bg-crimson px-6 py-4 text-bone disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save"}
            </button>
          </form>
        )}
      </Panel>
    </div>
  );
}
