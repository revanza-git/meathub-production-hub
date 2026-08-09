/**
 * MEATHUB pricing engine — BRD v1.2.
 *
 * Pillar 1: flat app fee per kg. Rp10.000/kg for non-A5, Rp50.000/kg for A5.
 * No PPN line, no percentage commission, no hidden service fee.
 * Landed price = harga vendor + app fee/kg × kg + ongkir.
 */

import type { Product } from "./data";

export type PlatformConfig = {
  /** App fee per kg for non-A5 products (IDR). */
  appFeePerKg: number;
  /** App fee per kg for A5-grade products (IDR). */
  appFeePerKgA5: number;
  /** Vendor must confirm stock + actual weight within this many hours. */
  vendorConfirmationHours: number;
  /** Payment link / VA expires after this many hours. */
  paymentExpiryHours: number;
  /** Buyer must check goods + upload 360° video within this many hours of receipt. */
  buyerCheckHours: number;
  /** No buyer confirmation after this many days → auto-confirm, vendor is paid. */
  autoConfirmDays: number;
  /** Refund SLA after a valid return is approved (working hours). */
  refundWorkingHours: number;
  /** Masa tahan dana vendor setelah pesanan Selesai (hari). */
  payoutHoldDays: number;
  /** Minimum nominal penarikan dana vendor (IDR). */
  payoutMinWithdrawal: number;
  /** Free delivery per vendor order at/above this weight (kg). */
  freeDeliveryKg: number;
};

export const DEFAULT_CONFIG: PlatformConfig = {
  appFeePerKg: 10000,
  appFeePerKgA5: 50000,
  vendorConfirmationHours: 2,
  paymentExpiryHours: 24,
  buyerCheckHours: 3,
  autoConfirmDays: 14,
  refundWorkingHours: 24,
  payoutHoldDays: 3,
  payoutMinWithdrawal: 500000,
  freeDeliveryKg: 20,
};

const CONFIG_KEY = "meathub.demo.config";

/** Legacy key `warehouseVerificationHours` is still read so saved demo config keeps working. */
type StoredConfig = Partial<PlatformConfig> & { warehouseVerificationHours?: number };

export function getConfig(): PlatformConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const stored = JSON.parse(raw) as StoredConfig;
    const { warehouseVerificationHours, ...rest } = stored;
    return {
      ...DEFAULT_CONFIG,
      ...(warehouseVerificationHours ? { vendorConfirmationHours: warehouseVerificationHours } : {}),
      ...rest,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(patch: Partial<PlatformConfig>) {
  const next = { ...getConfig(), ...patch };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(next));
  return next;
}

/** A5 is derived from grade data — never a manual flag. */
export function isA5(product: Pick<Product, "grade">) {
  const g = (product.grade ?? "").toUpperCase().replace(/\s/g, "");
  return g === "A5" || g === "MB5" || g === "MB5+" || /(^|[^0-9])A5([^0-9]|$)/.test(g);
}

export function appFeePerKg(product: Pick<Product, "grade">, config = getConfig()) {
  return isA5(product) ? config.appFeePerKgA5 : config.appFeePerKg;
}

/** App fee for a line: fee/kg × total kg of the line. */
export function lineAppFee(
  product: Pick<Product, "grade">,
  weightGram: number,
  qty: number,
  config = getConfig(),
) {
  return Math.round(appFeePerKg(product, config) * ((weightGram / 1000) * qty));
}

/* ---------------------------------------------------------------- tiers */

export const TRANSACTION_TIERS = ["Ritel", "Loaf", "Karton", "Tonase"] as const;
export type TransactionTier = (typeof TRANSACTION_TIERS)[number];

export const TIER_SEGMENT: Record<TransactionTier, string> = {
  Ritel: "Individu, UMKM, pembelian sample",
  Loaf: "Restoran kecil",
  Karton: "Restoran / bisnis menengah",
  Tonase: "Meatshop, trader, distributor, resto chain, AYCE",
};

/** Tier is derived automatically from checkout quantity. Tidak ada minimum order. */
export function tierForKg(totalKg: number): TransactionTier {
  if (totalKg >= 100) return "Tonase";
  if (totalKg >= 25) return "Karton";
  if (totalKg >= 5) return "Loaf";
  return "Ritel";
}

export function nextTierHint(totalKg: number): { tier: TransactionTier; kgNeeded: number } | null {
  const thresholds: Array<[TransactionTier, number]> = [
    ["Loaf", 5],
    ["Karton", 25],
    ["Tonase", 100],
  ];
  for (const [tier, kg] of thresholds) {
    if (totalKg < kg) return { tier, kgNeeded: kg - totalKg };
  }
  return null;
}

/* -------------------------------------------------------- landed price */

export type LandedBreakdown = {
  vendorSubtotal: number;
  appFee: number;
  deliveryFee: number;
  discount: number;
  total: number;
  totalKg: number;
  tier: TransactionTier;
};

export function landed(input: {
  vendorSubtotal: number;
  appFee: number;
  deliveryFee: number;
  discount?: number;
  totalKg: number;
}): LandedBreakdown {
  const discount = input.discount ?? 0;
  return {
    vendorSubtotal: input.vendorSubtotal,
    appFee: input.appFee,
    deliveryFee: input.deliveryFee,
    discount,
    totalKg: input.totalKg,
    tier: tierForKg(input.totalKg),
    total: input.vendorSubtotal + input.appFee + input.deliveryFee - discount,
  };
}

export const FEE_DISCLOSURE =
  "Harga landed sudah termasuk app fee MEATHUB per kg. Tidak ada PPN terpisah, biaya layanan, atau biaya tersembunyi lainnya.";
