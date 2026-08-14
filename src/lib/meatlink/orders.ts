import type { Database } from "@/integrations/supabase/types";

export type OrderStatus = Database["public"]["Enums"]["ml_order_status"];
export type PaymentTerm = Database["public"]["Enums"]["ml_payment_term"];
export type ProductCategory = Database["public"]["Enums"]["ml_product_category"];
export type TopDecision = Database["public"]["Enums"]["ml_top_decision"];
export type MlRole = Database["public"]["Enums"]["ml_role"];

export type BuyerOrder = Database["public"]["Tables"]["buyer_orders"]["Row"];
export type VendorProduct = Database["public"]["Tables"]["vendor_products"]["Row"];

export const ORDER_STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "ON_HOLD",
  "REJECTED",
  "DELIVERED",
];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  ON_HOLD: "On Hold",
  REJECTED: "Rejected",
  DELIVERED: "Delivered",
};

export const STATUS_HINT: Record<OrderStatus, string> = {
  PENDING: "Received. Our team is reviewing stock and payment terms.",
  CONFIRMED: "Approved and scheduled for fulfilment.",
  ON_HOLD: "Paused while credit terms are being reviewed.",
  REJECTED: "Not accepted. Contact us to discuss alternatives.",
  DELIVERED: "Completed and delivered.",
};

export const STATUS_CLASS: Record<OrderStatus, string> = {
  PENDING: "bg-amber-100 text-amber-900 border-amber-300",
  CONFIRMED: "bg-emerald-100 text-emerald-900 border-emerald-300",
  ON_HOLD: "bg-sky-100 text-sky-900 border-sky-300",
  REJECTED: "bg-crimson/10 text-crimson border-crimson/40",
  DELIVERED: "bg-ink/10 text-ink border-ink/30",
};

export const PAYMENT_TERMS: { value: PaymentTerm; label: string }[] = [
  { value: "CBD", label: "Cash Before Delivery (CBD)" },
  { value: "TOP7", label: "TOP 7 days" },
  { value: "TOP14", label: "TOP 14 days" },
  { value: "TOP30", label: "TOP 30 days" },
];

export const TERM_LABEL: Record<PaymentTerm, string> = {
  CBD: "CBD",
  TOP7: "TOP 7",
  TOP14: "TOP 14",
  TOP30: "TOP 30",
};

export const CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: "PRIME_CUT", label: "Prime Cut" },
  { value: "SECOND_CUT", label: "2nd Cut" },
  { value: "OFFAL", label: "Offal" },
  { value: "BONE", label: "Bone" },
];

export const CATEGORY_LABEL: Record<ProductCategory, string> = {
  PRIME_CUT: "Prime Cut",
  SECOND_CUT: "2nd Cut",
  OFFAL: "Offal",
  BONE: "Bone",
};

export const TOP_DECISION_LABEL: Record<TopDecision, string> = {
  APPROVE: "Approved in-house",
  CUT: "Cut (cash constrained)",
  FORWARD: "Forwarded to third party",
};

export function isTop(term: PaymentTerm) {
  return term !== "CBD";
}

export function formatKg(value: number | string) {
  const n = typeof value === "string" ? Number(value) : value;
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n)} kg`;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Parses CSV text with columns product_name, category, qty_kg. */
export function parseStockCsv(text: string) {
  const rows: { name: string; category: ProductCategory; qty_kg: number }[] = [];
  const errors: string[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { rows, errors: ["File is empty"] };

  const header = lines[0]!.toLowerCase();
  const start = header.includes("product") ? 1 : 0;

  const catAlias: Record<string, ProductCategory> = {
    prime_cut: "PRIME_CUT",
    "prime cut": "PRIME_CUT",
    prime: "PRIME_CUT",
    second_cut: "SECOND_CUT",
    "2nd cut": "SECOND_CUT",
    "second cut": "SECOND_CUT",
    offal: "OFFAL",
    bone: "BONE",
  };

  for (let i = start; i < lines.length; i++) {
    const cells = lines[i]!.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const [name, rawCat, rawQty] = cells;
    const line = i + 1;
    if (!name) {
      errors.push(`Line ${line}: missing product name`);
      continue;
    }
    const category = catAlias[(rawCat ?? "").toLowerCase()];
    if (!category) {
      errors.push(`Line ${line}: unknown category "${rawCat ?? ""}"`);
      continue;
    }
    const qty = Number(rawQty);
    if (!Number.isFinite(qty) || qty < 0) {
      errors.push(`Line ${line}: invalid qty "${rawQty ?? ""}"`);
      continue;
    }
    rows.push({ name, category, qty_kg: qty });
  }
  return { rows, errors };
}

export const CSV_TEMPLATE = `product_name,category,qty_kg
Wagyu Ribeye MB6,Prime Cut,120
Beef Short Plate,2nd Cut,340
Beef Tripe,Offal,80
Marrow Bone,Bone,150
`;
