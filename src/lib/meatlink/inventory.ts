import type { Database } from "@/integrations/supabase/types";

export type InventoryItem = Database["public"]["Tables"]["admin_inventory"]["Row"];

export type InventoryDraft = {
  origin: string;
  brand: string;
  name: string;
  condition: string | null;
  avg_weight_text: string | null;
  avg_weight_kg: number | null;
  sale_price_idr: number;
  markup_idr: number;
  qty_on_hand_kg: number;
};


export const ORIGINS = ["Australia", "Japan", "USA", "Canada", "Lokal Premium"] as const;
export const CONDITIONS = ["FRZ", "CHL"] as const;

export const LOW_STOCK_KEY = "inventory_low_stock_kg";
export const DEFAULT_LOW_STOCK_KG = 10;
export const PAGE_SIZES = [10, 50, 100] as const;


export const CONDITION_LABEL: Record<string, string> = {
  FRZ: "Frozen",
  CHL: "Chilled",
};

export function formatIdr(value: number | string) {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n) || n <= 0) return "On request";
  return `Rp ${new Intl.NumberFormat("id-ID").format(n)}`;
}

export function formatQty(value: number | string) {
  const n = typeof value === "string" ? Number(value) : value;
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n)} kg`;
}

/** Default markup applied per kg: A5 grade carries a higher margin. */
export const MARKUP_A5 = 150000;
export const MARKUP_STANDARD = 60000;

export function defaultMarkup(name: string, brand = "") {
  return /\bA5\b|A5/i.test(`${name} ${brand}`) ? MARKUP_A5 : MARKUP_STANDARD;
}

/** Public-facing price = base sale price + markup (0 stays "on request"). */
export function publicPrice(
  base: number | string,
  markup: number | string | null | undefined,
): number {
  const b = Number(base);
  if (!Number.isFinite(b) || b <= 0) return 0;
  const m = Number(markup ?? 0);
  return b + (Number.isFinite(m) ? m : 0);
}

/** Turns "8KG" / "250GR" / "4KG UP" into kilograms, or null when unparseable. */
export function weightToKg(text: string | null | undefined): number | null {
  if (!text) return null;
  const m = /^\s*([\d.,]+)\s*(kg|gr|g)\b/i.exec(text);
  if (!m) return null;
  const value = Number(m[1]!.replace(",", "."));
  if (!Number.isFinite(value)) return null;
  return /^g/i.test(m[2]!) ? value / 1000 : value;
}

export const IMPORT_COLUMNS = [
  "origin",
  "brand",
  "name",
  "condition",
  "avg_weight",
  "sale_price_idr",
  "markup_idr",
  "qty_on_hand_kg",
] as const;

export const IMPORT_SAMPLE_ROWS = [
  ["Australia", "AACO - DARLING DOWNS", "CHK FLAP TAIL WGY MB7", "FRZ", "2KG", 1000000, 60000, 417.17],
  ["Japan", "KIWAMI", "BOLAR BLD WGY A5", "FRZ", "5KG", 990000, 150000, 44.1],
  ["USA", "SWIFT", "S-PLATE CHO AGS", "", "5KG", 160000, 60000, 46651.3],
];


export type ParsedRow = { row: number; item: InventoryDraft };

/** Normalises a raw sheet/CSV record into an inventory draft. */
export function normaliseRow(
  raw: Record<string, unknown>,
  rowNumber: number,
  errors: string[],
): ParsedRow | null {
  const get = (key: string) => {
    const found = Object.keys(raw).find((k) => k.trim().toLowerCase() === key);
    const value = found ? raw[found] : undefined;
    return value === null || value === undefined ? "" : String(value).trim();
  };

  const name = get("name");
  if (!name) {
    errors.push(`Row ${rowNumber}: product name is required`);
    return null;
  }
  const origin = get("origin") || "Other";
  const conditionRaw = get("condition").toUpperCase();
  const condition = conditionRaw ? conditionRaw.slice(0, 3) : null;
  if (condition && !CONDITIONS.includes(condition as (typeof CONDITIONS)[number])) {
    errors.push(`Row ${rowNumber}: condition must be FRZ or CHL`);
    return null;
  }
  const price = Number(get("sale_price_idr").replace(/[^\d.-]/g, "") || 0);
  if (!Number.isFinite(price) || price < 0) {
    errors.push(`Row ${rowNumber}: invalid sale price`);
    return null;
  }
  const qty = Number(get("qty_on_hand_kg").replace(/[^\d.-]/g, "") || 0);
  if (!Number.isFinite(qty) || qty < 0) {
    errors.push(`Row ${rowNumber}: invalid quantity`);
    return null;
  }
  const weightText = get("avg_weight") || null;

  return {
    row: rowNumber,
    item: {
      origin,
      brand: get("brand"),
      name,
      condition,
      avg_weight_text: weightText,
      avg_weight_kg: weightToKg(weightText),
      sale_price_idr: price,
      qty_on_hand_kg: qty,
    },
  };
}

/** Parses simple CSV text (no quoted commas) into records keyed by header. */
export function csvToRecords(text: string): Record<string, string>[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0]!.split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const record: Record<string, string> = {};
    headers.forEach((h, i) => {
      record[h] = cells[i] ?? "";
    });
    return record;
  });
}
