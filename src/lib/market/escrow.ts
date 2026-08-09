/**
 * Dana mengendap (escrow) MEATHUB — pengganti dompet deposit pembeli.
 *
 * Model: pembeli membayar per pesanan lewat iPaymu, dana masuk ke rekening
 * MEATHUB sebagai Merchant of Record, lalu ditahan sampai pesanan Selesai.
 * Setelah masa tahan lewat, dana jadi "bisa dicairkan" oleh vendor dan
 * penarikan wajib disetujui admin.
 *
 * Saldo vendor selalu diturunkan dari data pesanan (bukan ledger terpisah),
 * jadi tidak ada uang titipan pembeli di sistem.
 */

import { listOrders, type Order, type SubOrder } from "./orders-store";
import { getConfig } from "./pricing";

export type EscrowState = "DITAHAN" | "BISA_DICAIRKAN" | "MENUNGGU_MASA_TAHAN";

export type EscrowRow = {
  orderId: string;
  subOrderId: string;
  vendorId: string;
  buyerCompany: string;
  amount: number;
  state: EscrowState;
  paidAt: string;
  releaseAt?: string;
};

export type WithdrawalStatus = "MENUNGGU_PERSETUJUAN" | "DITOLAK" | "DIBAYARKAN";

export type WithdrawalRequest = {
  id: string;
  vendorId: string;
  amount: number;
  bankAccount: string;
  status: WithdrawalStatus;
  requestedAt: string;
  decidedAt?: string;
  note?: string;
};

const WD_KEY = "meathub.payouts.withdrawals.v1";

/** Dana vendor per sub-PO: harga vendor + ongkir. App fee milik MEATHUB. */
export function vendorPayable(so: SubOrder) {
  return so.subtotal + so.deliveryFee;
}

function releaseAt(order: Order): string | undefined {
  const base = order.receipt.confirmedAt ?? order.subOrders.find((s) => s.shipment?.deliveredAt)?.shipment?.deliveredAt;
  if (!base) return undefined;
  return new Date(new Date(base).getTime() + getConfig().payoutHoldDays * 86400000).toISOString();
}

/** Semua baris escrow dari pesanan yang sudah dibayar pembeli. */
export function listEscrow(vendorId?: string): EscrowRow[] {
  const now = Date.now();
  return listOrders()
    .filter((o) => o.paymentStatus === "PAID")
    .flatMap((o) =>
      o.subOrders
        .filter((so) => !vendorId || so.vendorId === vendorId)
        .map((so): EscrowRow => {
          const done = so.status === "Selesai" || o.status === "Selesai";
          const rel = releaseAt(o);
          const state: EscrowState = !done
            ? "DITAHAN"
            : rel && new Date(rel).getTime() > now
              ? "MENUNGGU_MASA_TAHAN"
              : "BISA_DICAIRKAN";
          return {
            orderId: o.id,
            subOrderId: so.id,
            vendorId: so.vendorId,
            buyerCompany: o.buyer.company,
            amount: vendorPayable(so),
            state,
            paidAt: o.createdAt,
            releaseAt: rel,
          };
        }),
    );
}

function read(): WithdrawalRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WD_KEY);
    return raw ? (JSON.parse(raw) as WithdrawalRequest[]) : [];
  } catch {
    return [];
  }
}

export function listWithdrawals(vendorId?: string): WithdrawalRequest[] {
  const all = read();
  return vendorId ? all.filter((w) => w.vendorId === vendorId) : all;
}

export type VendorBalance = {
  /** Dana pesanan berjalan yang sudah dibayar pembeli, belum selesai. */
  held: number;
  /** Sudah selesai tapi masih dalam masa tahan T+n. */
  pendingRelease: number;
  /** Siap diajukan pencairan. */
  claimable: number;
  /** Penarikan yang sedang menunggu persetujuan admin. */
  processing: number;
  /** Sudah dibayarkan MEATHUB ke rekening vendor. */
  paid: number;
};

export function vendorBalance(vendorId: string): VendorBalance {
  const rows = listEscrow(vendorId);
  const sum = (s: EscrowState) => rows.filter((r) => r.state === s).reduce((t, r) => t + r.amount, 0);
  const wd = listWithdrawals(vendorId);
  const processing = wd.filter((w) => w.status === "MENUNGGU_PERSETUJUAN").reduce((t, w) => t + w.amount, 0);
  const paid = wd.filter((w) => w.status === "DIBAYARKAN").reduce((t, w) => t + w.amount, 0);
  return {
    held: sum("DITAHAN"),
    pendingRelease: sum("MENUNGGU_MASA_TAHAN"),
    claimable: Math.max(0, sum("BISA_DICAIRKAN") - processing - paid),
    processing,
    paid,
  };
}

/** Total dana mengendap di MEATHUB (semua vendor) — untuk rekonsiliasi admin. */
export function platformEscrowTotals() {
  const rows = listEscrow();
  const sum = (s: EscrowState) => rows.filter((r) => r.state === s).reduce((t, r) => t + r.amount, 0);
  const wd = listWithdrawals();
  return {
    held: sum("DITAHAN"),
    pendingRelease: sum("MENUNGGU_MASA_TAHAN"),
    claimable: sum("BISA_DICAIRKAN"),
    processing: wd.filter((w) => w.status === "MENUNGGU_PERSETUJUAN").reduce((t, w) => t + w.amount, 0),
    paid: wd.filter((w) => w.status === "DIBAYARKAN").reduce((t, w) => t + w.amount, 0),
  };
}

export function requestWithdrawal(vendorId: string, amount: number, bankAccount: string) {
  const min = getConfig().payoutMinWithdrawal;
  if (!bankAccount.trim()) return { ok: false as const, error: "Isi nomor rekening tujuan." };
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false as const, error: "Nominal penarikan tidak valid." };
  if (amount < min) return { ok: false as const, error: `Minimum penarikan Rp${min.toLocaleString("id-ID")}.` };
  if (amount > vendorBalance(vendorId).claimable) {
    return { ok: false as const, error: "Nominal melebihi dana yang bisa dicairkan." };
  }
  const req: WithdrawalRequest = {
    id: `WD-${Date.now().toString().slice(-6)}`,
    vendorId,
    amount,
    bankAccount: bankAccount.trim(),
    status: "MENUNGGU_PERSETUJUAN",
    requestedAt: new Date().toISOString(),
  };
  localStorage.setItem(WD_KEY, JSON.stringify([req, ...read()]));
  return { ok: true as const, request: req };
}

/** Admin menyetujui (dibayarkan) atau menolak penarikan vendor. */
export function decideWithdrawal(id: string, approve: boolean, note?: string) {
  const next = read().map((w) =>
    w.id === id
      ? {
          ...w,
          status: (approve ? "DIBAYARKAN" : "DITOLAK") as WithdrawalStatus,
          decidedAt: new Date().toISOString(),
          note,
        }
      : w,
  );
  localStorage.setItem(WD_KEY, JSON.stringify(next));
}

export const WITHDRAWAL_TONE: Record<WithdrawalStatus, string> = {
  MENUNGGU_PERSETUJUAN: "bg-accent/20 text-ink border-accent/40",
  DITOLAK: "bg-destructive/10 text-destructive border-destructive/30",
  DIBAYARKAN: "bg-success/10 text-success border-success/30",
};

export const ESCROW_LABEL: Record<EscrowState, string> = {
  DITAHAN: "Ditahan (pesanan berjalan)",
  MENUNGGU_MASA_TAHAN: "Menunggu masa tahan",
  BISA_DICAIRKAN: "Bisa dicairkan",
};
