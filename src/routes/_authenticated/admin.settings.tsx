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
        content: "Configure Meatlink admin settings: low-stock warnings, unpaid-order expiry, and ops alert emails.",
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

type SettingsMap = Record<string, unknown>;

const KEYS = {
  lowStock: LOW_STOCK_KEY,
  expiryHours: "order_expiry_hours",
  alertEmail: "ops_alert_email",
  lowStockAlert: "ops_low_stock_alert_enabled",
  dailyDigest: "ops_daily_digest_enabled",
} as const;

function SettingsBody() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [lowStock, setLowStock] = useState("");
  const [expiryHours, setExpiryHours] = useState("");
  const [alertEmail, setAlertEmail] = useState("");
  const [lowStockAlert, setLowStockAlert] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(true);
  const [pending, setPending] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("admin_settings").select("key, value");
      if (error) throw error;
      const map: SettingsMap = {};
      for (const row of data ?? []) map[row.key as string] = row.value;
      return map;
    },
  });

  useEffect(() => {
    if (!data) return;
    setLowStock(String(Number(data[KEYS.lowStock] ?? DEFAULT_LOW_STOCK_KG)));
    setExpiryHours(String(Number(data[KEYS.expiryHours] ?? 48)));
    setAlertEmail(typeof data[KEYS.alertEmail] === "string" ? (data[KEYS.alertEmail] as string) : "");
    setLowStockAlert(data[KEYS.lowStockAlert] !== false);
    setDailyDigest(data[KEYS.dailyDigest] !== false);
  }, [data]);

  async function saveLowStock(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(lowStock);
    if (!Number.isFinite(n) || n < 0) {
      toast.error("Enter a valid quantity in kg.");
      return;
    }
    await persist([{ key: KEYS.lowStock, value: n }], "Threshold saved.");
    void qc.invalidateQueries({ queryKey: ["admin-inventory"] });
  }

  async function saveOps(e: React.FormEvent) {
    e.preventDefault();
    const hours = Number(expiryHours);
    if (!Number.isFinite(hours) || hours < 0) {
      toast.error("Enter a valid number of hours (0 disables auto-cancel).");
      return;
    }
    const email = alertEmail.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid alert email address.");
      return;
    }
    await persist(
      [
        { key: KEYS.expiryHours, value: hours },
        { key: KEYS.alertEmail, value: email },
        { key: KEYS.lowStockAlert, value: lowStockAlert },
        { key: KEYS.dailyDigest, value: dailyDigest },
      ],
      "Ops automation saved.",
    );
  }

  async function persist(rows: Array<{ key: string; value: unknown }>, message: string) {
    setPending(true);
    const { error } = await supabase
      .from("admin_settings")
      .upsert(
        rows.map((r) => ({ key: r.key, value: r.value as never, updated_by: user?.id ?? null })),
        { onConflict: "key" },
      );
    setPending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(message);
    void qc.invalidateQueries({ queryKey: ["admin-settings"] });
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
          <form onSubmit={saveLowStock} className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <Field label="Low stock threshold (kg)" required>
              <TextInput
                inputMode="decimal"
                value={lowStock}
                onChange={(e) => setLowStock(e.target.value)}
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

      <Panel className="p-6">
        <h2 className="font-display text-xl text-ink">Ops automation</h2>
        <p className="mt-2 text-sm text-ash">
          Unpaid orders are cancelled automatically once they pass the window below (credit/tempo orders and orders
          with an uploaded payment proof are never auto-cancelled). Alerts and the daily summary are emailed to the
          address below.
        </p>
        {isLoading ? (
          <p className="mt-4 text-sm text-ash">Loading…</p>
        ) : (
          <form onSubmit={saveOps} className="mt-5 grid gap-4">
            <Field label="Auto-cancel unpaid orders after (hours)" hint="Set 0 to disable auto-cancel." required>
              <TextInput
                inputMode="numeric"
                value={expiryHours}
                onChange={(e) => setExpiryHours(e.target.value)}
                required
              />
            </Field>
            <Field label="Ops alert email" hint="Leave empty to turn off all automated ops emails.">
              <TextInput
                type="email"
                value={alertEmail}
                onChange={(e) => setAlertEmail(e.target.value)}
                placeholder="ops@meatlink.id"
              />
            </Field>
            <label className="flex items-center gap-3 text-sm text-ink">
              <input
                type="checkbox"
                checked={lowStockAlert}
                onChange={(e) => setLowStockAlert(e.target.checked)}
                className="size-4 accent-crimson"
              />
              Send low-stock alerts
            </label>
            <label className="flex items-center gap-3 text-sm text-ink">
              <input
                type="checkbox"
                checked={dailyDigest}
                onChange={(e) => setDailyDigest(e.target.checked)}
                className="size-4 accent-crimson"
              />
              Send daily sales digest (Jakarta time)
            </label>
            <div>
              <button
                type="submit"
                disabled={pending}
                className="eyebrow bg-crimson px-6 py-4 text-bone disabled:opacity-60"
              >
                {pending ? "Saving…" : "Save automation"}
              </button>
            </div>
          </form>
        )}
      </Panel>
    </div>
  );
}
