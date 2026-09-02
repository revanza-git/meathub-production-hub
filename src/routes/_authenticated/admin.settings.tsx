import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell, Panel, RoleGate } from "@/components/app/app-shell";
import { Field, TextInput } from "@/components/site/form-kit";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  LOW_STOCK_KEY,
  DEFAULT_LOW_STOCK_KG,
  UNIT_MARGIN_KEY,
  UNIT_MARGIN_IDR,
  parseUnitMargins,
} from "@/lib/meatlink/inventory";
import { UNIT_MARGINS_QUERY_KEY } from "@/lib/meatlink/unit-margins";
import { useBi } from "@/lib/i18n";

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
  const bi = useBi();
  return (
    <AppShell
      title={bi("Pengaturan", "Settings")}
      intro={bi(
        "Preferensi workspace untuk tim admin Meatlink.",
        "Workspace preferences for the Meatlink admin team.",
      )}
    >
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
  unitMargin: UNIT_MARGIN_KEY,
} as const;

const MARGIN_FIELDS = [
  { key: "retail", id: "Ritel (eceran)", en: "Retail" },
  { key: "loaf", id: "Loaf", en: "Loaf" },
  { key: "carton", id: "Karton", en: "Carton" },
  { key: "ton", id: "Tonase", en: "Ton" },
] as const;

function SettingsBody() {
  const bi = useBi();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [lowStock, setLowStock] = useState("");
  const [expiryHours, setExpiryHours] = useState("");
  const [alertEmail, setAlertEmail] = useState("");
  const [lowStockAlert, setLowStockAlert] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(true);
  const [pending, setPending] = useState(false);
  const [margins, setMargins] = useState<Record<string, string>>({
    retail: String(UNIT_MARGIN_IDR.retail),
    loaf: String(UNIT_MARGIN_IDR.loaf),
    carton: String(UNIT_MARGIN_IDR.carton),
    ton: String(UNIT_MARGIN_IDR.ton),
  });

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
    const m = parseUnitMargins(data[KEYS.unitMargin]);
    setMargins({
      retail: String(m.retail),
      loaf: String(m.loaf),
      carton: String(m.carton),
      ton: String(m.ton),
    });
  }, [data]);

  async function saveMargins(e: React.FormEvent) {
    e.preventDefault();
    const parsed: Record<string, number> = {};
    for (const f of MARGIN_FIELDS) {
      const n = Number(margins[f.key]);
      if (!Number.isFinite(n) || n < 0) {
        toast.error(bi("Masukkan nominal margin yang valid.", "Enter a valid margin amount."));
        return;
      }
      parsed[f.key] = n;
    }
    await persist(
      [{ key: KEYS.unitMargin, value: { ...parsed, ctn: parsed.carton } }],
      bi("Margin per satuan disimpan.", "Per-unit margins saved."),
    );
    void qc.invalidateQueries({ queryKey: UNIT_MARGINS_QUERY_KEY });
    void qc.invalidateQueries({ queryKey: ["admin-inventory"] });
  }

  async function saveLowStock(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(lowStock);
    if (!Number.isFinite(n) || n < 0) {
      toast.error(bi("Masukkan jumlah kg yang valid.", "Enter a valid quantity in kg."));
      return;
    }
    await persist([{ key: KEYS.lowStock, value: n }], bi("Ambang batas disimpan.", "Threshold saved."));
    void qc.invalidateQueries({ queryKey: ["admin-inventory"] });
  }

  async function saveOps(e: React.FormEvent) {
    e.preventDefault();
    const hours = Number(expiryHours);
    if (!Number.isFinite(hours) || hours < 0) {
      toast.error(
        bi(
          "Masukkan jumlah jam yang valid (0 menonaktifkan auto-cancel).",
          "Enter a valid number of hours (0 disables auto-cancel).",
        ),
      );
      return;
    }
    const email = alertEmail.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error(bi("Masukkan alamat email peringatan yang valid.", "Enter a valid alert email address."));
      return;
    }
    await persist(
      [
        { key: KEYS.expiryHours, value: hours },
        { key: KEYS.alertEmail, value: email },
        { key: KEYS.lowStockAlert, value: lowStockAlert },
        { key: KEYS.dailyDigest, value: dailyDigest },
      ],
      bi("Otomasi operasional disimpan.", "Ops automation saved."),
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
        <p className="eyebrow text-ash">{bi("Masuk sebagai", "Signed in as")}</p>
        <p className="mt-2 font-display text-xl text-ink">{user?.email}</p>
      </Panel>

      <Panel className="p-6">
        <h2 className="font-display text-xl text-ink">{bi("Peringatan stok dini", "Inventory early warning")}</h2>
        <p className="mt-2 text-sm text-ash">
          {bi(
            "Item dengan stok pada atau di bawah level ini ditandai “Restock” pada tabel inventaris.",
            "Items with stock on hand at or below this level are flagged as “Restock” in the inventory table.",
          )}
        </p>
        {isLoading ? (
          <p className="mt-4 text-sm text-ash">{bi("Memuat…", "Loading…")}</p>
        ) : (
          <form onSubmit={saveLowStock} className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <Field label={bi("Ambang batas stok menipis (kg)", "Low stock threshold (kg)")} required>
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
              {pending ? bi("Menyimpan…", "Saving…") : bi("Simpan", "Save")}
            </button>
          </form>
        )}
      </Panel>

      <Panel className="p-6">
        <h2 className="font-display text-xl text-ink">{bi("Margin per satuan beli", "Margin per purchase unit")}</h2>
        <p className="mt-2 text-sm text-ash">
          {bi(
            "Margin internal per kg untuk tiap satuan beli. Loaf adalah acuan harga publik; satuan lain dihitung dari selisih terhadap loaf, sehingga item dengan markup khusus (mis. A5) tetap menjaga preminya.",
            "Internal margin per kg for each purchase unit. Loaf is the public price reference; other units are derived from the spread against loaf, so items with a custom markup (e.g. A5) keep their premium.",
          )}
        </p>
        {isLoading ? (
          <p className="mt-4 text-sm text-ash">{bi("Memuat…", "Loading…")}</p>
        ) : (
          <form onSubmit={saveMargins} className="mt-5 grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {MARGIN_FIELDS.map((f) => (
                <Field key={f.key} label={`${bi(f.id, f.en)} (Rp/kg)`} required>
                  <TextInput
                    inputMode="numeric"
                    value={margins[f.key] ?? ""}
                    onChange={(e) => setMargins((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    required
                  />
                </Field>
              ))}
            </div>
            <div>
              <button
                type="submit"
                disabled={pending}
                className="eyebrow bg-crimson px-6 py-4 text-bone disabled:opacity-60"
              >
                {pending ? bi("Menyimpan…", "Saving…") : bi("Simpan margin", "Save margins")}
              </button>
            </div>
          </form>
        )}
      </Panel>

      <Panel className="p-6">
        <h2 className="font-display text-xl text-ink">{bi("Otomasi operasional", "Ops automation")}</h2>
        <p className="mt-2 text-sm text-ash">
          {bi(
            "Pesanan yang belum dibayar otomatis dibatalkan setelah melewati jendela waktu di bawah (pesanan kredit/tempo dan pesanan dengan bukti pembayaran yang diunggah tidak pernah dibatalkan otomatis). Peringatan dan ringkasan harian dikirim ke alamat email di bawah.",
            "Unpaid orders are cancelled automatically once they pass the window below (credit/tempo orders and orders with an uploaded payment proof are never auto-cancelled). Alerts and the daily summary are emailed to the address below.",
          )}
        </p>
        {isLoading ? (
          <p className="mt-4 text-sm text-ash">{bi("Memuat…", "Loading…")}</p>
        ) : (
          <form onSubmit={saveOps} className="mt-5 grid gap-4">
            <Field
              label={bi("Auto-cancel pesanan belum dibayar setelah (jam)", "Auto-cancel unpaid orders after (hours)")}
              hint={bi("Isi 0 untuk menonaktifkan auto-cancel.", "Set 0 to disable auto-cancel.")}
              required
            >
              <TextInput
                inputMode="numeric"
                value={expiryHours}
                onChange={(e) => setExpiryHours(e.target.value)}
                required
              />
            </Field>
            <Field
              label={bi("Email peringatan operasional", "Ops alert email")}
              hint={bi(
                "Kosongkan untuk mematikan semua email otomatis operasional.",
                "Leave empty to turn off all automated ops emails.",
              )}
            >
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
              {bi("Kirim peringatan stok menipis", "Send low-stock alerts")}
            </label>
            <label className="flex items-center gap-3 text-sm text-ink">
              <input
                type="checkbox"
                checked={dailyDigest}
                onChange={(e) => setDailyDigest(e.target.checked)}
                className="size-4 accent-crimson"
              />
              {bi("Kirim ringkasan penjualan harian (waktu Jakarta)", "Send daily sales digest (Jakarta time)")}
            </label>
            <div>
              <button
                type="submit"
                disabled={pending}
                className="eyebrow bg-crimson px-6 py-4 text-bone disabled:opacity-60"
              >
                {pending ? bi("Menyimpan…", "Saving…") : bi("Simpan otomasi", "Save automation")}
              </button>
            </div>
          </form>
        )}
      </Panel>
    </div>
  );
}
