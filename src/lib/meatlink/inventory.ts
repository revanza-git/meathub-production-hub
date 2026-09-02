import type { Database } from "@/integrations/supabase/types";

export type InventoryItem = Database["public"]["Tables"]["admin_inventory"]["Row"];

export type InventoryDraft = {
  origin: string;
  brand: string;
  name: string;
  condition: string | null;
  avg_weight_text: string | null;
  avg_weight_kg: number | null;
  category: "PRIME_CUT" | "SECOND_CUT" | "OFFAL" | "BONE";
  grade_band: "UNGRADED" | "MB0_2" | "MB2_4" | "MB4_6" | "MB6_9" | "MB9_12";
  cut_type: string;
  sale_price_idr: number;
  markup_idr: number;
  promo_price_idr: number | null;
  promo_until: string | null;
  qty_on_hand_kg: number;
  sale_channels: string[];
  retail_price_idr: number | null;
  retail_pack_text: string | null;
};

export const DEFAULT_SALE_CHANNELS = ["LOAF", "CTN", "TON"];

const CHANNEL_ALIASES: Record<string, string> = {
  RITEL: "RETAIL",
  ECERAN: "RETAIL",
  B2C: "RETAIL",
  KARTON: "CTN",
  CARTON: "CTN",
  TONASE: "TON",
  B2B: "LOAF,CTN,TON",
};

/** Parses a sheet cell like "RITEL, LOAF" into canonical sale-channel codes. */
export function parseSaleChannels(text: string): string[] {
  const out = new Set<string>();
  for (const raw of text.split(/[,;|/]+/)) {
    const token = raw.trim().toUpperCase();
    if (!token) continue;
    const mapped = CHANNEL_ALIASES[token] ?? token;
    for (const part of mapped.split(",")) {
      if (["RETAIL", "LOAF", "CTN", "TON"].includes(part)) out.add(part);
    }
  }
  return [...out];
}


export const CATEGORY_VALUES = ["PRIME_CUT", "SECOND_CUT", "OFFAL", "BONE"] as const;

/**
 * Prime Cut is defined strictly by the cut itself (never by grade/wagyu/A5):
 * tenderloin, sirloin/striploin, ribeye/cuberoll, shortloin (t-bone, porterhouse),
 * tomahawk, OP ribs (ribeye bone-in) and flat iron. Everything else is Second Cut.
 */
export const PRIME_CUT_PATTERN =
  /(tenderloin|tndrloin|tender loin|fill?et mignon|filet mignon|chateaubriand|sirloin|striploin|strip loin|ny strip|contra fil|ribeye|rib eye|rib-eye|cuberoll|cube roll|bife ancho|shortloin|short loin|t-bone|tbone|t bone|porterhouse|tomahawk|op ribs|op rib|flat iron|flatiron)/;

/** Best-guess category from the product name, used when a sheet omits it. */
export function guessCategory(name: string): InventoryDraft["category"] {
  const n = name.toLowerCase();
  if (/(tongue|lidah|liver|hati|tripe|babat|heart|jantung|kidney|usus|offal|oxtail|buntut)/.test(n)) return "OFFAL";
  if (PRIME_CUT_PATTERN.test(n)) return "PRIME_CUT";
  if (/(bone|tulang|marrow|sumsum)/.test(n)) return "BONE";
  return "SECOND_CUT";
}

export const GRADE_BAND_VALUES = [
  "UNGRADED",
  "MB0_2",
  "MB2_4",
  "MB4_6",
  "MB6_9",
  "MB9_12",
] as const;
export type GradeBandValue = (typeof GRADE_BAND_VALUES)[number];

/** Marbling band parsed from the supplier product name (MB7, MB9+, A5 …). */
export function guessGradeBand(name: string): GradeBandValue {
  const n = (name || "").toLowerCase();
  const m = /mb\s*(\d{1,2})/.exec(n);
  if (m) {
    const v = Number(m[1]);
    if (v >= 9) return "MB9_12";
    if (v >= 6) return "MB6_9";
    if (v >= 4) return "MB4_6";
    if (v >= 2) return "MB2_4";
    return "MB0_2";
  }
  if (/a5\b/.test(n)) return "MB9_12";
  if (/a4\b/.test(n)) return "MB6_9";
  if (/a3\b/.test(n)) return "MB4_6";
  return "UNGRADED";
}

const CUT_RULES: [RegExp, string][] = [
  [/tomahawk/, "Tomahawk"],
  [/(op ribs|op rib|ribeye b\/in|rib eye bone)/, "OP Ribs"],
  [/(tenderloin|tndrloin|tender loin|fillet mignon|filet mignon|chateaubriand)/, "Tenderloin"],
  [/(striploin|strip loin|ny strip|sirloin|contra fil)/, "Striploin / Sirloin"],
  [/(ribeye|rib eye|rib-eye|cuberoll|cube roll|bife ancho)/, "Ribeye / Cuberoll"],
  [/(shortloin|short loin|t-bone|tbone|t bone|porterhouse)/, "Shortloin"],
  [/(flat iron|flatiron)/, "Flat Iron"],
  [/(oyster bl|misuji)/, "Oyster Blade"],
  [/(chk eye roll|chuck eye roll)/, "Chuck Eye Roll"],
  [/(flap tail|chuck flap)/, "Chuck Flap Tail"],
  [/(chk roll|chuck roll|chk crest|chuck)/, "Chuck"],
  [/(short rib|s-rib|chk ribs|rib finger|intercostal)/, "Short Ribs"],
  [/(short plate|s-plate|plate)/, "Short Plate"],
  [/brisket/, "Brisket"],
  [/(picanha|rump cap|d-rump|rump)/, "Rump / Picanha"],
  [/knuckle/, "Knuckle"],
  [/(topside|inside)/, "Topside"],
  [/(silverside|outside|eye round)/, "Silverside"],
  [/(bolar|blade)/, "Blade / Bolar"],
  [/(shank|shin|sengkel)/, "Shank"],
  [/(skirt|hanger|onglet)/, "Skirt"],
  [/flank/, "Flank"],
  [/(minced|mince|ground|cl ?\d|trim|patty|burger|slice|shabu|yakiniku)/, "Minced / Prepared"],
  [/(fat|abura|tallow|suet)/, "Fat"],
  [/(tongue|lidah|liver|hati|tripe|babat|heart|jantung|kidney|usus|oxtail|buntut|offal)/, "Offal"],
  [/(bone|tulang|marrow|sumsum)/, "Bone"],
];

/** Specific cut derived from the product name; mirrors ml_guess_cut_type in SQL. */
export function guessCutType(name: string): string {
  const n = (name || "").toLowerCase();
  for (const [re, label] of CUT_RULES) if (re.test(n)) return label;
  return "Lainnya";
}


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

/**
 * Internal margin per kg by purchase unit. Loaf is the reference level used for the
 * listed public price; carton and ton carry a thinner margin, retail a fatter one.
 * These numbers are internal — never render them to buyers.
 */
export const UNIT_MARGIN_IDR = {
  retail: 150000,
  loaf: 60000,
  carton: 55000,
  ton: 45000,
} as const;

export type PurchaseUnit = keyof typeof UNIT_MARGIN_IDR;
export type UnitMargins = Record<PurchaseUnit, number>;

export const UNIT_MARGIN_KEY = "unit_margin_idr";

/** Normalises the stored admin_settings payload into a complete margin map. */
export function parseUnitMargins(raw: unknown): UnitMargins {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const pick = (keys: string[], fallback: number) => {
    for (const k of keys) {
      const n = Number(source[k]);
      if (Number.isFinite(n) && n >= 0) return n;
    }
    return fallback;
  };
  return {
    retail: pick(["retail", "RETAIL", "ritel"], UNIT_MARGIN_IDR.retail),
    loaf: pick(["loaf", "LOAF"], UNIT_MARGIN_IDR.loaf),
    carton: pick(["carton", "ctn", "CTN"], UNIT_MARGIN_IDR.carton),
    ton: pick(["ton", "TON", "tonase"], UNIT_MARGIN_IDR.ton),
  };
}

/**
 * Margin actually applied for a unit. Products with a custom markup (e.g. A5 at 150k)
 * keep their premium: the unit spread is applied relative to the loaf reference.
 */
export function unitMargin(
  markup: number | string | null | undefined,
  unit: PurchaseUnit,
  margins: UnitMargins = UNIT_MARGIN_IDR,
): number {
  const m = Number(markup ?? margins.loaf);
  const loaf = Number.isFinite(m) && m > 0 ? m : margins.loaf;
  const spread = margins.loaf - margins[unit];
  return Math.max(0, loaf - spread);
}

/** Public price per kg for a purchase unit = base cost + unit margin. */
export function unitPrice(
  base: number | string,
  markup: number | string | null | undefined,
  unit: PurchaseUnit,
  margins: UnitMargins = UNIT_MARGIN_IDR,
): number {
  const b = Number(base);
  if (!Number.isFinite(b) || b <= 0) return 0;
  return b + unitMargin(markup, unit, margins);
}

/**
 * Derives per-unit prices from an already-marked-up public price when the base cost
 * is not exposed client-side (public catalogue RPCs only return the public price).
 */
export function unitPriceFromPublic(
  publicPriceIdr: number | string,
  unit: PurchaseUnit,
  margins: UnitMargins = UNIT_MARGIN_IDR,
): number {
  const p = Number(publicPriceIdr);
  if (!Number.isFinite(p) || p <= 0) return 0;
  return Math.max(0, p - (margins.loaf - margins[unit]));
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
  "category",
  "grade_band",
  "cut_type",
  "avg_weight",
  "sale_price_idr",
  "markup_idr",
  "promo_price_idr",
  "promo_until",
  "qty_on_hand_kg",
  "sale_channels",
  "retail_price_idr",
  "retail_pack_text",
] as const;

export const IMPORT_SAMPLE_ROWS = [
  ["Australia", "AACO - DARLING DOWNS", "CHK FLAP TAIL WGY MB7", "FRZ", "PRIME_CUT", "MB6_9", "Chuck Flap Tail", "2KG", 1000000, 60000, "", "", 417.17, "LOAF,CTN,TON", "", ""],
  ["Japan", "KIWAMI", "BOLAR BLD WGY A5", "FRZ", "PRIME_CUT", "MB9_12", "Blade / Bolar", "5KG", 990000, 150000, 1050000, "2026-12-31", 44.1, "CTN,TON", "", ""],
  ["USA", "SWIFT", "S-PLATE CHO AGS", "", "SECOND_CUT", "UNGRADED", "Short Plate", "5KG", 160000, 60000, "", "", 46651.3, "RETAIL,LOAF,CTN,TON", 240000, "±1 kg/pack"],
];


export type ParsedRow = { row: number; item: InventoryDraft };

/** Mirrors the SQL ml_slugify helper. */
export function slugify(text: string) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Stable identity for an inventory line: brand + product name. */
export function inventoryKey(brand: string, name: string) {
  return slugify(`${brand}-${name}`);
}

/** Stock used when a sheet leaves qty_on_hand_kg blank. */
export const DEFAULT_IMPORT_QTY_KG = 25;

/** Normalises a raw sheet/CSV record into an inventory draft. */
export function normaliseRow(
  raw: Record<string, unknown>,
  rowNumber: number,
  errors: string[],
  options: { defaultQtyKg?: number } = {},
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
  const qtyRaw = get("qty_on_hand_kg").replace(/[^\d.-]/g, "");
  const fallbackQty = options.defaultQtyKg ?? 0;
  const qty = qtyRaw === "" ? fallbackQty : Number(qtyRaw);
  if (!Number.isFinite(qty) || qty < 0) {
    errors.push(`Row ${rowNumber}: invalid quantity`);
    return null;
  }

  const brand = get("brand");
  const markupRaw = get("markup_idr").replace(/[^\d.-]/g, "");
  const markup = markupRaw === "" ? defaultMarkup(name, brand) : Number(markupRaw);
  if (!Number.isFinite(markup) || markup < 0) {
    errors.push(`Row ${rowNumber}: invalid markup`);
    return null;
  }
  const promoRaw = get("promo_price_idr").replace(/[^\d.-]/g, "");
  const promo = promoRaw === "" ? null : Number(promoRaw);
  if (promo !== null && (!Number.isFinite(promo) || promo <= 0)) {
    errors.push(`Row ${rowNumber}: invalid promo price`);
    return null;
  }
  const promoUntilRaw = get("promo_until");
  let promoUntil: string | null = null;
  if (promoUntilRaw) {
    const parsed = new Date(promoUntilRaw);
    if (Number.isNaN(parsed.getTime())) {
      errors.push(`Row ${rowNumber}: promo_until must be a date (YYYY-MM-DD)`);
      return null;
    }
    promoUntil = parsed.toISOString().slice(0, 10);
  }
  const categoryRaw = get("category").toUpperCase().replace(/[\s-]+/g, "_");
  const category = (CATEGORY_VALUES as readonly string[]).includes(categoryRaw)
    ? (categoryRaw as InventoryDraft["category"])
    : guessCategory(name);
  const weightText = get("avg_weight") || null;
  const gradeRaw = get("grade_band").toUpperCase().replace(/[\s.\-]+/g, "_");
  const gradeBand = (GRADE_BAND_VALUES as readonly string[]).includes(gradeRaw)
    ? (gradeRaw as InventoryDraft["grade_band"])
    : guessGradeBand(name);
  const cutType = get("cut_type") || guessCutType(name);
  const channels = parseSaleChannels(get("sale_channels"));
  const retailRaw = get("retail_price_idr").replace(/[^\d.-]/g, "");
  const retailPrice = retailRaw === "" ? null : Number(retailRaw);
  if (retailPrice !== null && (!Number.isFinite(retailPrice) || retailPrice <= 0)) {
    errors.push(`Row ${rowNumber}: invalid retail price`);
    return null;
  }

  return {
    row: rowNumber,
    item: {
      origin,
      brand,
      name,
      condition,
      category,
      grade_band: gradeBand,
      cut_type: cutType,
      avg_weight_text: weightText,
      avg_weight_kg: weightToKg(weightText),
      sale_price_idr: price,
      markup_idr: markup,
      promo_price_idr: promo,
      promo_until: promoUntil,
      qty_on_hand_kg: qty,
      sale_channels: channels.length > 0 ? channels : DEFAULT_SALE_CHANNELS,
      retail_price_idr: retailPrice,
      retail_pack_text: get("retail_pack_text") || null,
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
