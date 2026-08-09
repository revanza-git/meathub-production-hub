import { PRODUCTS, VENDORS, productById } from "./data";
import type { PaymentStatus } from "./payment";
import { getConfig, lineAppFee, tierForKg, type TransactionTier } from "./pricing";

/**
 * Order lifecycle per BRD v1.2 §6.1:
 * PO → verifikasi gudang (2 jam) → persetujuan buyer → pilih pengiriman →
 * bayar (CBD/TOP) → kirim → cek fisik buyer (3 jam) → selesai / retur.
 */
export const ORDER_STATUSES = [
  "Menunggu Verifikasi Gudang",
  "Menunggu Persetujuan Pembeli",
  "Menunggu Pembayaran",
  "Pembayaran Diproses",
  "Sudah Dibayar",
  "Sedang Disiapkan",
  "Siap Dikirim",
  "Dalam Pengiriman",
  "Menunggu Cek Fisik Pembeli",
  "Selesai",
  "Dibatalkan Otomatis",
  "Dibatalkan",
  "Retur Diajukan",
  "Retur Disetujui",
  "Pengembalian Dana Diproses",
  "Dikembalikan",
  "Dalam Sengketa",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type PaymentPath = "CBD_VA" | "CBD_DEPOSIT" | "TOP_PAYLATER";

export const PAYMENT_PATH_LABEL: Record<PaymentPath, string> = {
  CBD_VA: "CBD — Virtual Account",
  CBD_DEPOSIT: "CBD — Deposit auto-cut",
  TOP_PAYLATER: "TOP — Paylater B2B (simulasi)",
};

export type SubOrderItem = {
  productId: string;
  name: string;
  variantLabel: string;
  qty: number;
  unitPrice: number;
  weightKg: number;
  appFee: number;
};

/** Hasil verifikasi fisik oleh tim gudang vendor. */
export type WarehouseVerification = {
  status: "MENUNGGU" | "TERVERIFIKASI" | "KADALUARSA";
  deadlineAt: string;
  verifiedAt?: string;
  actualWeightKg?: number;
  slaughterDate?: string;
  expiryDate?: string;
  photoCount?: number;
  notes?: string;
};

/** Cek fisik + video 360° oleh buyer setelah barang diterima. */
export type ReceiptCheck = {
  status: "BELUM" | "DIKONFIRMASI" | "AUTO_APPROVED";
  deadlineAt?: string;
  autoConfirmAt?: string;
  confirmedAt?: string;
  videoName?: string;
  condition?: string;
  notes?: string;
};

export type SubOrder = {
  id: string;
  vendorId: string;
  items: SubOrderItem[];
  subtotal: number;
  appFee: number;
  deliveryOption: string;
  deliveryFee: number;
  note?: string;
  status: OrderStatus;
  timeline: { label: string; at: string; done: boolean }[];
  verification: WarehouseVerification;
  payoutStatus: "Menunggu Konfirmasi Terima" | "Dijadwalkan" | "Dibayarkan";
  fundedBy: "MEATHUB" | "PAYLATER";
};

export type Order = {
  id: string;
  createdAt: string;
  buyer: { name: string; company: string; phone: string; address: string };
  subOrders: SubOrder[];
  subtotal: number;
  appFee: number;
  discount: number;
  deliveryFee: number;
  total: number;
  totalKg: number;
  tier: TransactionTier;
  paymentPath: PaymentPath;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  receipt: ReceiptCheck;
};

const KEY = "meathub.demo.orders";

export function hoursFrom(iso: string, hours: number) {
  return new Date(new Date(iso).getTime() + hours * 3600000).toISOString();
}
export function daysFrom(iso: string, days: number) {
  return new Date(new Date(iso).getTime() + days * 86400000).toISOString();
}

export function newVerification(createdAt: string): WarehouseVerification {
  return { status: "MENUNGGU", deadlineAt: hoursFrom(createdAt, getConfig().warehouseVerificationHours) };
}

export function newReceipt(): ReceiptCheck {
  return { status: "BELUM" };
}

const FLOW: OrderStatus[] = [
  "Menunggu Verifikasi Gudang",
  "Menunggu Persetujuan Pembeli",
  "Menunggu Pembayaran",
  "Sudah Dibayar",
  "Sedang Disiapkan",
  "Siap Dikirim",
  "Dalam Pengiriman",
  "Menunggu Cek Fisik Pembeli",
  "Selesai",
];

function timelineFor(status: OrderStatus, createdAt: string) {
  const idx = FLOW.indexOf(status);
  return FLOW.map((label, i) => ({
    label,
    at: new Date(new Date(createdAt).getTime() + i * 3 * 3600 * 1000).toISOString(),
    done: idx >= 0 && i <= idx,
  }));
}

function seedOrder(
  n: number,
  status: OrderStatus,
  paymentStatus: PaymentStatus,
  productIds: string[],
  daysAgo: number,
  paymentPath: PaymentPath = "CBD_VA",
): Order {
  const createdAt = new Date(Date.now() - daysAgo * 86400000).toISOString();
  const byVendor = new Map<string, SubOrderItem[]>();
  productIds.forEach((pid, i) => {
    const p = productById(pid)!;
    const v = p.variants[1] ?? p.variants[0];
    const qty = (i % 3) + p.moq;
    const weightKg = (v.weightGram / 1000) * qty;
    const item: SubOrderItem = {
      productId: p.id,
      name: p.name,
      variantLabel: v.label,
      qty,
      unitPrice: v.price,
      weightKg,
      appFee: lineAppFee(p, v.weightGram, qty),
    };
    byVendor.set(p.vendorId, [...(byVendor.get(p.vendorId) ?? []), item]);
  });

  const subOrders: SubOrder[] = Array.from(byVendor.entries()).map(([vendorId, items], i) => {
    const subtotal = items.reduce((s, it) => s + it.unitPrice * it.qty, 0);
    const appFee = items.reduce((s, it) => s + it.appFee, 0);
    const kg = items.reduce((s, it) => s + it.weightKg, 0);
    const verified = FLOW.indexOf(status) > 0;
    return {
      id: `MH-${1000 + n}-${i + 1}`,
      vendorId,
      items,
      subtotal,
      appFee,
      deliveryOption: "MEATHUB Cold-Chain Regular",
      deliveryFee: kg >= getConfig().freeDeliveryKg ? 0 : 45000,
      status,
      timeline: timelineFor(status, createdAt),
      verification: verified
        ? {
            status: "TERVERIFIKASI",
            deadlineAt: hoursFrom(createdAt, 2),
            verifiedAt: hoursFrom(createdAt, 1),
            actualWeightKg: Math.round(kg * 100) / 100,
            slaughterDate: "2026-07-18",
            expiryDate: "2027-07-18",
            photoCount: 4,
            notes: "Gramasi sesuai, kemasan vacuum utuh, suhu −18°C.",
          }
        : newVerification(createdAt),
      payoutStatus:
        status === "Selesai" ? "Dibayarkan" : status === "Dalam Pengiriman" ? "Dijadwalkan" : "Menunggu Konfirmasi Terima",
      fundedBy: paymentPath === "TOP_PAYLATER" ? "PAYLATER" : "MEATHUB",
    };
  });

  const subtotal = subOrders.reduce((s, so) => s + so.subtotal, 0);
  const appFee = subOrders.reduce((s, so) => s + so.appFee, 0);
  const deliveryFee = subOrders.reduce((s, so) => s + so.deliveryFee, 0);
  const totalKg = subOrders.reduce((s, so) => s + so.items.reduce((k, it) => k + it.weightKg, 0), 0);

  return {
    id: `MH-${1000 + n}`,
    createdAt,
    buyer: {
      name: "Rizky Pratama",
      company: "PT Boga Rasa Nusantara",
      phone: "0812-8890-4471",
      address: "Jl. Kemang Raya No. 21, Jakarta Selatan 12730",
    },
    subOrders,
    subtotal,
    appFee,
    discount: 0,
    deliveryFee,
    total: subtotal + appFee + deliveryFee,
    totalKg,
    tier: tierForKg(totalKg),
    paymentPath,
    paymentMethod: PAYMENT_PATH_LABEL[paymentPath],
    paymentStatus,
    status,
    receipt:
      status === "Selesai"
        ? { status: "DIKONFIRMASI", confirmedAt: createdAt, videoName: "cek-360.mp4", condition: "Sesuai" }
        : status === "Menunggu Cek Fisik Pembeli"
          ? {
              status: "BELUM",
              deadlineAt: hoursFrom(new Date().toISOString(), 3),
              autoConfirmAt: daysFrom(new Date().toISOString(), 14),
            }
          : newReceipt(),
  };
}

export const SEED_ORDERS: Order[] = [
  seedOrder(1, "Selesai", "PAID", ["p0", "p6"], 21),
  seedOrder(2, "Selesai", "PAID", ["p10"], 18, "CBD_DEPOSIT"),
  seedOrder(3, "Menunggu Cek Fisik Pembeli", "PAID", ["p3", "p8"], 12),
  seedOrder(4, "Dalam Pengiriman", "PAID", ["p1"], 6, "TOP_PAYLATER"),
  seedOrder(5, "Sedang Disiapkan", "PAID", ["p15", "p17"], 4),
  seedOrder(6, "Sudah Dibayar", "PAID", ["p11"], 3, "CBD_DEPOSIT"),
  seedOrder(7, "Menunggu Persetujuan Pembeli", "PENDING", ["p23", "p29"], 1),
  seedOrder(8, "Menunggu Verifikasi Gudang", "PENDING", ["p5"], 0),
  seedOrder(9, "Dibatalkan Otomatis", "EXPIRED", ["p13"], 9),
  seedOrder(10, "Dalam Sengketa", "PAID", ["p19"], 14),
];

function readLocal(): Order[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Order[]) : [];
  } catch {
    return [];
  }
}

export function listOrders(): Order[] {
  if (typeof window === "undefined") return SEED_ORDERS;
  return [...readLocal(), ...SEED_ORDERS];
}

export function getOrder(id: string): Order | undefined {
  return listOrders().find((o) => o.id === id);
}

export function saveOrder(order: Order) {
  const local = readLocal();
  localStorage.setItem(KEY, JSON.stringify([order, ...local.filter((o) => o.id !== order.id)]));
}

/** Local-only mutation helper; seeded demo orders are read-only. */
export function mutateOrder(id: string, fn: (o: Order) => Order) {
  const local = readLocal();
  const existing = local.find((o) => o.id === id) ?? SEED_ORDERS.find((o) => o.id === id);
  if (!existing) return undefined;
  const next = fn(structuredClone(existing));
  localStorage.setItem(KEY, JSON.stringify([next, ...local.filter((o) => o.id !== id)]));
  return next;
}

function withStatus(o: Order, status: OrderStatus): Order {
  return {
    ...o,
    status,
    subOrders: o.subOrders.map((so) => ({ ...so, status, timeline: timelineFor(status, o.createdAt) })),
  };
}

/** Gudang vendor menyelesaikan verifikasi fisik. */
export function submitVerification(
  orderId: string,
  subOrderId: string,
  data: Omit<WarehouseVerification, "status" | "deadlineAt">,
) {
  return mutateOrder(orderId, (o) => {
    const subOrders = o.subOrders.map((so) =>
      so.id === subOrderId
        ? {
            ...so,
            verification: {
              ...so.verification,
              ...data,
              status: "TERVERIFIKASI" as const,
              verifiedAt: new Date().toISOString(),
            },
            status: "Menunggu Persetujuan Pembeli" as OrderStatus,
          }
        : so,
    );
    const allDone = subOrders.every((so) => so.verification.status === "TERVERIFIKASI");
    return {
      ...o,
      subOrders,
      status: allDone ? "Menunggu Persetujuan Pembeli" : o.status,
    };
  });
}

/** Buyer menyetujui hasil verifikasi → lanjut ke pembayaran. */
export function approveVerification(orderId: string) {
  return mutateOrder(orderId, (o) => withStatus(o, "Menunggu Pembayaran"));
}

export function cancelOrder(orderId: string, auto = false) {
  return mutateOrder(orderId, (o) => withStatus(o, auto ? "Dibatalkan Otomatis" : "Dibatalkan"));
}

/** Buyer minta ganti barang → kembali ke antrean gudang dengan deadline baru. */
export function requestSwap(orderId: string, reason: string) {
  return mutateOrder(orderId, (o) => {
    const now = new Date().toISOString();
    return {
      ...withStatus(o, "Menunggu Verifikasi Gudang"),
      subOrders: o.subOrders.map((so) => ({
        ...so,
        status: "Menunggu Verifikasi Gudang" as OrderStatus,
        verification: { ...newVerification(now), notes: `Permintaan ganti barang: ${reason}` },
      })),
    };
  });
}

/** Buyer menyelesaikan cek fisik + video 360° dalam SLA. */
export function confirmReceipt(orderId: string, data: { videoName?: string; condition: string; notes?: string }) {
  return mutateOrder(orderId, (o) => ({
    ...withStatus(o, "Selesai"),
    receipt: { ...o.receipt, ...data, status: "DIKONFIRMASI", confirmedAt: new Date().toISOString() },
    subOrders: o.subOrders.map((so) => ({
      ...so,
      status: "Selesai" as OrderStatus,
      payoutStatus: "Dijadwalkan" as const,
      timeline: timelineFor("Selesai", o.createdAt),
    })),
  }));
}

export function updateOrderPayment(id: string, paymentStatus: PaymentStatus) {
  return mutateOrder(id, (o) => {
    const status: OrderStatus =
      paymentStatus === "PAID"
        ? "Sudah Dibayar"
        : paymentStatus === "PROCESSING"
          ? "Pembayaran Diproses"
          : paymentStatus === "EXPIRED" || paymentStatus === "FAILED"
            ? "Dibatalkan"
            : o.status;
    return { ...withStatus(o, status), paymentStatus };
  });
}

export const STATUS_TONE: Record<string, string> = {
  Selesai: "bg-success/10 text-success border-success/30",
  "Sudah Dibayar": "bg-success/10 text-success border-success/30",
  "Menunggu Verifikasi Gudang": "bg-accent/20 text-ink border-accent/40",
  "Menunggu Persetujuan Pembeli": "bg-accent/20 text-ink border-accent/40",
  "Menunggu Pembayaran": "bg-accent/20 text-ink border-accent/40",
  "Menunggu Cek Fisik Pembeli": "bg-accent/20 text-ink border-accent/40",
  "Pembayaran Diproses": "bg-accent/20 text-ink border-accent/40",
  Dibatalkan: "bg-destructive/10 text-destructive border-destructive/30",
  "Dibatalkan Otomatis": "bg-destructive/10 text-destructive border-destructive/30",
  "Dalam Sengketa": "bg-destructive/10 text-destructive border-destructive/30",
};

export { PRODUCTS, VENDORS };
export const makeTimeline = timelineFor;
