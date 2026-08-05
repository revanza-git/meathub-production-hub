import { PRODUCTS, VENDORS, productById } from "./data";
import type { PaymentStatus } from "./payment";

export const ORDER_STATUSES = [
  "Menunggu Pembayaran",
  "Pembayaran Diproses",
  "Sudah Dibayar",
  "Dikonfirmasi Vendor",
  "Sedang Disiapkan",
  "Siap Dikirim",
  "Dalam Pengiriman",
  "Terkirim",
  "Selesai",
  "Dibatalkan",
  "Pengembalian Dana Diproses",
  "Dikembalikan",
  "Dalam Sengketa",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type SubOrderItem = {
  productId: string;
  name: string;
  variantLabel: string;
  qty: number;
  unitPrice: number;
};

export type SubOrder = {
  id: string;
  vendorId: string;
  items: SubOrderItem[];
  subtotal: number;
  deliveryOption: string;
  deliveryFee: number;
  note?: string;
  status: OrderStatus;
  timeline: { label: string; at: string; done: boolean }[];
  commission: number;
  settlementStatus: "Tertunda" | "Dijadwalkan" | "Dibayarkan";
};

export type Order = {
  id: string;
  createdAt: string;
  buyer: { name: string; company: string; phone: string; address: string };
  subOrders: SubOrder[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  serviceFee: number;
  total: number;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
};

const KEY = "meathub.demo.orders";
const COMMISSION_RATE = 0.05;

export function commissionOf(subtotal: number) {
  return Math.round(subtotal * COMMISSION_RATE);
}

function timelineFor(status: OrderStatus, createdAt: string) {
  const steps: OrderStatus[] = [
    "Sudah Dibayar",
    "Dikonfirmasi Vendor",
    "Sedang Disiapkan",
    "Siap Dikirim",
    "Dalam Pengiriman",
    "Terkirim",
    "Selesai",
  ];
  const idx = steps.indexOf(status);
  return steps.map((label, i) => ({
    label,
    at: new Date(new Date(createdAt).getTime() + i * 6 * 3600 * 1000).toISOString(),
    done: idx >= 0 && i <= idx,
  }));
}

function seedOrder(
  n: number,
  status: OrderStatus,
  paymentStatus: PaymentStatus,
  productIds: string[],
  daysAgo: number,
): Order {
  const createdAt = new Date(Date.now() - daysAgo * 86400000).toISOString();
  const byVendor = new Map<string, SubOrderItem[]>();
  productIds.forEach((pid, i) => {
    const p = productById(pid)!;
    const v = p.variants[1] ?? p.variants[0];
    const item: SubOrderItem = {
      productId: p.id,
      name: p.name,
      variantLabel: v.label,
      qty: (i % 3) + p.moq,
      unitPrice: v.price,
    };
    byVendor.set(p.vendorId, [...(byVendor.get(p.vendorId) ?? []), item]);
  });
  const subOrders: SubOrder[] = Array.from(byVendor.entries()).map(([vendorId, items], i) => {
    const subtotal = items.reduce((s, it) => s + it.unitPrice * it.qty, 0);
    return {
      id: `MH-${1000 + n}-${i + 1}`,
      vendorId,
      items,
      subtotal,
      deliveryOption: "MEATHUB Cold-Chain Regular",
      deliveryFee: 45000,
      status,
      timeline: timelineFor(status, createdAt),
      commission: commissionOf(subtotal),
      settlementStatus: status === "Selesai" ? "Dibayarkan" : status === "Terkirim" ? "Dijadwalkan" : "Tertunda",
    };
  });
  const subtotal = subOrders.reduce((s, so) => s + so.subtotal, 0);
  const deliveryFee = subOrders.reduce((s, so) => s + so.deliveryFee, 0);
  const serviceFee = 5000;
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
    discount: 0,
    deliveryFee,
    serviceFee,
    total: subtotal + deliveryFee + serviceFee,
    paymentMethod: n % 2 ? "QRIS" : "Virtual Account",
    paymentStatus,
    status,
  };
}

export const SEED_ORDERS: Order[] = [
  seedOrder(1, "Selesai", "PAID", ["p0", "p6"], 21),
  seedOrder(2, "Selesai", "PAID", ["p10"], 18),
  seedOrder(3, "Terkirim", "PAID", ["p3", "p8"], 12),
  seedOrder(4, "Dalam Pengiriman", "PAID", ["p1"], 6),
  seedOrder(5, "Sedang Disiapkan", "PAID", ["p15", "p17"], 4),
  seedOrder(6, "Dikonfirmasi Vendor", "PAID", ["p11"], 3),
  seedOrder(7, "Sudah Dibayar", "PAID", ["p23", "p29"], 2),
  seedOrder(8, "Menunggu Pembayaran", "PENDING", ["p5"], 1),
  seedOrder(9, "Dibatalkan", "EXPIRED", ["p13"], 9),
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
  const next = [order, ...local.filter((o) => o.id !== order.id)];
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function updateOrderPayment(id: string, paymentStatus: PaymentStatus) {
  const local = readLocal();
  const next = local.map((o) =>
    o.id === id
      ? {
          ...o,
          paymentStatus,
          status:
            paymentStatus === "PAID"
              ? ("Sudah Dibayar" as OrderStatus)
              : paymentStatus === "PROCESSING"
                ? ("Pembayaran Diproses" as OrderStatus)
                : paymentStatus === "EXPIRED" || paymentStatus === "FAILED"
                  ? ("Dibatalkan" as OrderStatus)
                  : o.status,
          subOrders: o.subOrders.map((so) => ({
            ...so,
            status: paymentStatus === "PAID" ? ("Sudah Dibayar" as OrderStatus) : so.status,
            timeline: timelineFor(paymentStatus === "PAID" ? "Sudah Dibayar" : so.status, o.createdAt),
          })),
        }
      : o,
  );
  localStorage.setItem(KEY, JSON.stringify(next));
}

export const STATUS_TONE: Record<string, string> = {
  Selesai: "bg-success/10 text-success border-success/30",
  Terkirim: "bg-success/10 text-success border-success/30",
  "Sudah Dibayar": "bg-success/10 text-success border-success/30",
  "Menunggu Pembayaran": "bg-accent/20 text-ink border-accent/40",
  "Pembayaran Diproses": "bg-accent/20 text-ink border-accent/40",
  Dibatalkan: "bg-destructive/10 text-destructive border-destructive/30",
  "Dalam Sengketa": "bg-destructive/10 text-destructive border-destructive/30",
};

export { PRODUCTS, VENDORS };
export const makeTimeline = timelineFor;
