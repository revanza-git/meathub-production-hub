import { PRODUCTS, VENDORS, productById } from "./data";
import type { PaymentStatus } from "./payment";
import { getConfig, lineAppFee, tierForKg, type TransactionTier } from "./pricing";

/**
 * Alur pesanan tunggal MEATHUB (konsolidasi BRD v1.2):
 * PO Dibuat → Menunggu Konfirmasi Vendor (SLA admin) → Menunggu Persetujuan Pembeli →
 * Menunggu Pembayaran → Diproses & Dikirim → Cek Terima Pembeli → Selesai.
 *
 * MEATHUB tidak punya gudang: stok ada di cold storage masing-masing vendor,
 * jadi konfirmasi fisik dan pengiriman dilakukan vendor sendiri.
 */
export const ORDER_STATUSES = [
  "PO Dibuat",
  "Menunggu Konfirmasi Vendor",
  "Menunggu Persetujuan Pembeli",
  "Menunggu Pembayaran",
  "Diproses & Dikirim",
  "Cek Terima Pembeli",
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

export type PaymentPath = "CBD_VA" | "CBD_DEPOSIT";

export const PAYMENT_PATH_LABEL: Record<PaymentPath, string> = {
  CBD_VA: "CBD — Virtual Account (iPaymu)",
  CBD_DEPOSIT: "CBD — Deposit auto-cut",
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

/** Hasil konfirmasi fisik oleh vendor (stok, gramasi, tanggal potong/expired, foto). */
export type VendorConfirmation = {
  status: "MENUNGGU" | "TERVERIFIKASI" | "KADALUARSA";
  deadlineAt: string;
  verifiedAt?: string;
  actualWeightKg?: number;
  slaughterDate?: string;
  expiryDate?: string;
  photoCount?: number;
  notes?: string;
};

/** Data pengiriman yang diisi vendor. */
export type Shipment = {
  courier?: string;
  trackingNo?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
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
  /** Konfirmasi fisik oleh vendor (dulu "verifikasi gudang"). */
  verification: VendorConfirmation;
  shipment?: Shipment;
  payoutStatus: "Menunggu Konfirmasi Terima" | "Dijadwalkan" | "Dibayarkan";
  fundedBy: "MEATHUB";
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
  paymentExpiresAt?: string;
  status: OrderStatus;
  receipt: ReceiptCheck;
  /** Catatan intervensi admin (batal paksa, perpanjang SLA, dsb). */
  adminLog?: { at: string; action: string; reason: string }[];
};

const KEY = "meathub.demo.orders";

export function hoursFrom(iso: string, hours: number) {
  return new Date(new Date(iso).getTime() + hours * 3600000).toISOString();
}
export function daysFrom(iso: string, days: number) {
  return new Date(new Date(iso).getTime() + days * 86400000).toISOString();
}

export function newVerification(createdAt: string): VendorConfirmation {
  return { status: "MENUNGGU", deadlineAt: hoursFrom(createdAt, getConfig().vendorConfirmationHours) };
}

export function newReceipt(): ReceiptCheck {
  return { status: "BELUM" };
}

/** Tujuh status kanonik yang membentuk tulang punggung pesanan. */
export const FLOW: OrderStatus[] = [
  "PO Dibuat",
  "Menunggu Konfirmasi Vendor",
  "Menunggu Persetujuan Pembeli",
  "Menunggu Pembayaran",
  "Diproses & Dikirim",
  "Cek Terima Pembeli",
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
    const verified = FLOW.indexOf(status) > 1;
    const shipped = FLOW.indexOf(status) >= FLOW.indexOf("Diproses & Dikirim");
    return {
      id: `MH-${1000 + n}-${i + 1}`,
      vendorId,
      items,
      subtotal,
      appFee,
      deliveryOption: "Cold-chain vendor (reguler)",
      deliveryFee: kg >= getConfig().freeDeliveryKg ? 0 : 45000,
      status,
      timeline: timelineFor(status, createdAt),
      verification: verified
        ? {
            status: "TERVERIFIKASI",
            deadlineAt: hoursFrom(createdAt, getConfig().vendorConfirmationHours),
            verifiedAt: hoursFrom(createdAt, 1),
            actualWeightKg: Math.round(kg * 100) / 100,
            slaughterDate: "2026-07-18",
            expiryDate: "2027-07-18",
            photoCount: 4,
            notes: "Gramasi sesuai, kemasan vacuum utuh, suhu −18°C.",
          }
        : newVerification(createdAt),
      shipment: shipped
        ? { courier: "Armada vendor", trackingNo: `TRK-${1000 + n}${i + 1}`, dispatchedAt: hoursFrom(createdAt, 12) }
        : undefined,
      payoutStatus:
        status === "Selesai" ? "Dibayarkan" : status === "Cek Terima Pembeli" ? "Dijadwalkan" : "Menunggu Konfirmasi Terima",
      fundedBy: "MEATHUB",
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
        : status === "Cek Terima Pembeli"
          ? {
              status: "BELUM",
              deadlineAt: hoursFrom(new Date().toISOString(), getConfig().buyerCheckHours),
              autoConfirmAt: daysFrom(new Date().toISOString(), getConfig().autoConfirmDays),
            }
          : newReceipt(),
  };
}

export const SEED_ORDERS: Order[] = [
  seedOrder(1, "Selesai", "PAID", ["p0", "p6"], 21),
  seedOrder(2, "Selesai", "PAID", ["p10"], 18, "CBD_DEPOSIT"),
  seedOrder(3, "Cek Terima Pembeli", "PAID", ["p3", "p8"], 12),
  seedOrder(4, "Diproses & Dikirim", "PAID", ["p1"], 6, "CBD_VA"),
  seedOrder(5, "Diproses & Dikirim", "PAID", ["p15", "p17"], 4),
  seedOrder(6, "Menunggu Pembayaran", "PENDING", ["p11"], 3, "CBD_DEPOSIT"),
  seedOrder(7, "Menunggu Persetujuan Pembeli", "PENDING", ["p23", "p29"], 1),
  seedOrder(8, "Menunggu Konfirmasi Vendor", "PENDING", ["p5"], 0),
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

/** Sub-PO milik satu vendor saja — dipakai dasbor vendor. */
export function listVendorSubOrders(vendorId: string) {
  return listOrders().flatMap((order) =>
    order.subOrders.filter((so) => so.vendorId === vendorId).map((so) => ({ order, so })),
  );
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

function logAdmin(o: Order, action: string, reason: string): Order {
  return { ...o, adminLog: [{ at: new Date().toISOString(), action, reason }, ...(o.adminLog ?? [])] };
}

/* --------------------------------------------------------------- vendor */

/** Vendor menyelesaikan konfirmasi fisik (stok, gramasi, tanggal, foto). */
export function submitVendorConfirmation(
  orderId: string,
  subOrderId: string,
  data: Omit<VendorConfirmation, "status" | "deadlineAt">,
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

/** Vendor menandai sub-PO sudah berangkat dari cold storage-nya. */
export function markDispatched(orderId: string, subOrderId: string, shipment: { courier: string; trackingNo?: string }) {
  return mutateOrder(orderId, (o) => ({
    ...o,
    subOrders: o.subOrders.map((so) =>
      so.id === subOrderId
        ? {
            ...so,
            status: "Diproses & Dikirim" as OrderStatus,
            timeline: timelineFor("Diproses & Dikirim", o.createdAt),
            shipment: { ...so.shipment, ...shipment, dispatchedAt: new Date().toISOString() },
          }
        : so,
    ),
    status: "Diproses & Dikirim",
  }));
}

/** Vendor menandai barang sampai → buyer masuk masa cek terima. */
export function markDelivered(orderId: string, subOrderId: string) {
  return mutateOrder(orderId, (o) => {
    const now = new Date().toISOString();
    const subOrders = o.subOrders.map((so) =>
      so.id === subOrderId
        ? {
            ...so,
            status: "Cek Terima Pembeli" as OrderStatus,
            timeline: timelineFor("Cek Terima Pembeli", o.createdAt),
            shipment: { ...so.shipment, deliveredAt: now },
          }
        : so,
    );
    const allDelivered = subOrders.every((so) => so.shipment?.deliveredAt);
    return {
      ...o,
      subOrders,
      status: allDelivered ? "Cek Terima Pembeli" : o.status,
      receipt: allDelivered
        ? {
            ...o.receipt,
            status: "BELUM",
            deadlineAt: hoursFrom(now, getConfig().buyerCheckHours),
            autoConfirmAt: daysFrom(now, getConfig().autoConfirmDays),
          }
        : o.receipt,
    };
  });
}

/* ---------------------------------------------------------------- buyer */

/** Buyer menyetujui hasil konfirmasi vendor → lanjut ke pembayaran. */
export function approveVerification(orderId: string) {
  return mutateOrder(orderId, (o) => ({
    ...withStatus(o, "Menunggu Pembayaran"),
    paymentExpiresAt: hoursFrom(new Date().toISOString(), getConfig().paymentExpiryHours),
  }));
}

export function cancelOrder(orderId: string, auto = false) {
  return mutateOrder(orderId, (o) => withStatus(o, auto ? "Dibatalkan Otomatis" : "Dibatalkan"));
}

/** Buyer minta ganti barang → kembali ke antrean vendor dengan deadline baru. */
export function requestSwap(orderId: string, reason: string) {
  return mutateOrder(orderId, (o) => {
    const now = new Date().toISOString();
    return {
      ...withStatus(o, "Menunggu Konfirmasi Vendor"),
      subOrders: o.subOrders.map((so) => ({
        ...so,
        status: "Menunggu Konfirmasi Vendor" as OrderStatus,
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

/* ---------------------------------------------------------------- admin */

/** Intervensi admin: batalkan paksa dengan alasan tercatat. */
export function adminForceCancel(orderId: string, reason: string) {
  return mutateOrder(orderId, (o) => logAdmin(withStatus(o, "Dibatalkan"), "Batal paksa", reason));
}

/** Intervensi admin: perpanjang SLA konfirmasi vendor. */
export function adminExtendSla(orderId: string, hours: number, reason: string) {
  return mutateOrder(orderId, (o) =>
    logAdmin(
      {
        ...o,
        subOrders: o.subOrders.map((so) => ({
          ...so,
          verification: { ...so.verification, deadlineAt: hoursFrom(so.verification.deadlineAt, hours) },
        })),
      },
      `Perpanjang SLA +${hours} jam`,
      reason,
    ),
  );
}

export function updateOrderPayment(id: string, paymentStatus: PaymentStatus) {
  return mutateOrder(id, (o) => {
    const status: OrderStatus =
      paymentStatus === "PAID"
        ? "Diproses & Dikirim"
        : paymentStatus === "EXPIRED"
          ? "Dibatalkan Otomatis"
          : paymentStatus === "FAILED"
            ? "Dibatalkan"
            : o.status;
    return { ...withStatus(o, status), paymentStatus };
  });
}

export const STATUS_TONE: Record<string, string> = {
  Selesai: "bg-success/10 text-success border-success/30",
  "Diproses & Dikirim": "bg-success/10 text-success border-success/30",
  "PO Dibuat": "bg-accent/20 text-ink border-accent/40",
  "Menunggu Konfirmasi Vendor": "bg-accent/20 text-ink border-accent/40",
  "Menunggu Persetujuan Pembeli": "bg-accent/20 text-ink border-accent/40",
  "Menunggu Pembayaran": "bg-accent/20 text-ink border-accent/40",
  "Cek Terima Pembeli": "bg-accent/20 text-ink border-accent/40",
  Dibatalkan: "bg-destructive/10 text-destructive border-destructive/30",
  "Dibatalkan Otomatis": "bg-destructive/10 text-destructive border-destructive/30",
  "Dalam Sengketa": "bg-destructive/10 text-destructive border-destructive/30",
};

export { PRODUCTS, VENDORS };
export const makeTimeline = timelineFor;
