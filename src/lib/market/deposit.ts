/**
 * Deposit wallet (CBD jalur 2) — append-only ledger, demo/local persistence.
 *
 * Rules from BRD v1.2 decisions:
 *  - minimum top-up Rp100.000 (configurable)
 *  - no cap on balance, balance is refundable
 *  - every withdrawal must be approved by a MEATHUB admin
 */

import { getConfig } from "./pricing";

export type DepositEntryKind = "TOPUP" | "AUTO_CUT" | "REFUND" | "WITHDRAWAL";

export type DepositEntry = {
  id: string;
  kind: DepositEntryKind;
  /** Positive = credit, negative = debit. */
  amount: number;
  reference?: string;
  note?: string;
  createdAt: string;
};

export type WithdrawalStatus = "MENUNGGU_PERSETUJUAN" | "DISETUJUI" | "DITOLAK" | "DIBAYARKAN";

export type WithdrawalRequest = {
  id: string;
  amount: number;
  bankAccount: string;
  status: WithdrawalStatus;
  requestedAt: string;
  decidedAt?: string;
  note?: string;
};

const LEDGER_KEY = "meathub.demo.deposit.ledger";
const WD_KEY = "meathub.demo.deposit.withdrawals";

const SEED: DepositEntry[] = [
  {
    id: "DEP-0001",
    kind: "TOPUP",
    amount: 15000000,
    reference: "VA 8808 0000 1234 5678",
    note: "Top-up saldo awal",
    createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
  },
  {
    id: "DEP-0002",
    kind: "AUTO_CUT",
    amount: -4820000,
    reference: "MH-1003",
    note: "Auto-cut checkout CBD",
    createdAt: new Date(Date.now() - 9 * 86400000).toISOString(),
  },
  {
    id: "DEP-0003",
    kind: "REFUND",
    amount: 620000,
    reference: "MH-1009",
    note: "Refund retur valid 100%",
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
];

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function listEntries(): DepositEntry[] {
  const local = read<DepositEntry[]>(LEDGER_KEY, []);
  return [...local, ...SEED].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function balance(): number {
  return listEntries().reduce((s, e) => s + e.amount, 0);
}

function pushEntry(entry: Omit<DepositEntry, "id" | "createdAt">): DepositEntry {
  const full: DepositEntry = {
    ...entry,
    id: `DEP-${Date.now().toString().slice(-6)}`,
    createdAt: new Date().toISOString(),
  };
  const local = read<DepositEntry[]>(LEDGER_KEY, []);
  localStorage.setItem(LEDGER_KEY, JSON.stringify([full, ...local]));
  return full;
}

export function topUp(amount: number, reference?: string) {
  const min = getConfig().depositMinTopUp;
  if (amount < min) {
    return { ok: false as const, error: `Minimum top-up Rp${min.toLocaleString("id-ID")}.` };
  }
  return { ok: true as const, entry: pushEntry({ kind: "TOPUP", amount, reference, note: "Top-up saldo deposit" }) };
}

export function autoCut(amount: number, orderId: string) {
  if (amount > balance()) {
    return { ok: false as const, error: "Saldo deposit tidak mencukupi. Silakan top-up atau pilih Virtual Account." };
  }
  return {
    ok: true as const,
    entry: pushEntry({ kind: "AUTO_CUT", amount: -amount, reference: orderId, note: "Auto-cut checkout CBD" }),
  };
}

export function refundToDeposit(amount: number, orderId: string) {
  return pushEntry({ kind: "REFUND", amount, reference: orderId, note: "Refund retur valid 100%" });
}

/* --------------------------------------------------------- withdrawals */

export function listWithdrawals(): WithdrawalRequest[] {
  return read<WithdrawalRequest[]>(WD_KEY, []);
}

export function requestWithdrawal(amount: number, bankAccount: string) {
  if (amount <= 0) return { ok: false as const, error: "Nominal penarikan tidak valid." };
  if (amount > balance()) return { ok: false as const, error: "Nominal melebihi saldo deposit." };
  const req: WithdrawalRequest = {
    id: `WD-${Date.now().toString().slice(-6)}`,
    amount,
    bankAccount,
    status: "MENUNGGU_PERSETUJUAN",
    requestedAt: new Date().toISOString(),
  };
  localStorage.setItem(WD_KEY, JSON.stringify([req, ...listWithdrawals()]));
  return { ok: true as const, request: req };
}

/** Admin-only in the real system; demo exposes it from the admin console. */
export function decideWithdrawal(id: string, approve: boolean, note?: string) {
  const list = listWithdrawals();
  const target = list.find((w) => w.id === id);
  if (!target) return;
  const next = list.map((w) =>
    w.id === id
      ? { ...w, status: (approve ? "DIBAYARKAN" : "DITOLAK") as WithdrawalStatus, decidedAt: new Date().toISOString(), note }
      : w,
  );
  localStorage.setItem(WD_KEY, JSON.stringify(next));
  if (approve) {
    pushEntry({ kind: "WITHDRAWAL", amount: -target.amount, reference: id, note: "Penarikan saldo disetujui admin" });
  }
}

export const WITHDRAWAL_TONE: Record<WithdrawalStatus, string> = {
  MENUNGGU_PERSETUJUAN: "bg-accent/20 text-ink border-accent/40",
  DISETUJUI: "bg-accent/20 text-ink border-accent/40",
  DITOLAK: "bg-destructive/10 text-destructive border-destructive/30",
  DIBAYARKAN: "bg-success/10 text-success border-success/30",
};
