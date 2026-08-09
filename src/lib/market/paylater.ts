/**
 * TOP (paylater B2B) adapter — BRD v1.2 jalur 2.
 *
 * Vendor is NEVER in a receivable position against the buyer: the paylater
 * partner disburses full cash to the vendor at transaction completion and the
 * buyer settles with the partner per tenor.
 *
 * This build ships the FAKE adapter only — no API credentials yet. Swapping in
 * the real integration means replacing `fakePaylaterProvider` and nothing else.
 */

export type PaylaterEligibility = {
  eligible: boolean;
  /** Approved credit limit in IDR. */
  limit: number;
  /** Remaining limit in IDR. */
  available: number;
  /** Maximum financing tenor in days before instalment interest applies. */
  maxTenorDays: number;
  /** Instalment options in months when the buyer exceeds the tenor. */
  instalmentMonths: number[];
  reason?: string;
};

export type PaylaterDisbursement = {
  id: string;
  orderId: string;
  amount: number;
  dueDate: string;
  status: "DISBURSED_TO_VENDOR";
  createdAt: string;
};

export interface PaylaterProvider {
  name: string;
  checkEligibility(input: { buyerCompany: string; amount: number }): Promise<PaylaterEligibility>;
  disburse(input: { orderId: string; amount: number }): Promise<PaylaterDisbursement>;
}

const MAX_LIMIT = 2_000_000_000;
const MAX_TENOR_DAYS = 60;

export const fakePaylaterProvider: PaylaterProvider = {
  name: "Mitra Paylater B2B (simulasi)",
  async checkEligibility({ buyerCompany, amount }) {
    // Deterministic fake: limit derived from company name length, capped at plafon.
    const limit = Math.min(MAX_LIMIT, 250_000_000 + buyerCompany.trim().length * 25_000_000);
    const used = Math.round(limit * 0.18);
    const available = limit - used;
    return {
      eligible: amount <= available,
      limit,
      available,
      maxTenorDays: MAX_TENOR_DAYS,
      instalmentMonths: [6, 12, 24],
      reason:
        amount > available
          ? "Nilai transaksi melebihi sisa limit paylater. Gunakan CBD atau turunkan nilai pesanan."
          : undefined,
    };
  },
  async disburse({ orderId, amount }) {
    return {
      id: `TOP-${Date.now().toString().slice(-8)}`,
      orderId,
      amount,
      dueDate: new Date(Date.now() + MAX_TENOR_DAYS * 86400000).toISOString(),
      status: "DISBURSED_TO_VENDOR",
      createdAt: new Date().toISOString(),
    };
  },
};

export const PAYLATER_TERMS = [
  "Vendor menerima pembayaran cash penuh dari mitra paylater — bukan dari Anda.",
  `Tenor pembiayaan maksimum ${MAX_TENOR_DAYS} hari; lewat tenor dikenakan bunga cicilan 6, 12, atau 24 bulan.`,
  "Plafon limit hingga Rp2 miliar per buyer, ditentukan oleh credit analyst mitra.",
  "Risiko kredit sepenuhnya ditanggung mitra paylater, bukan vendor MEATHUB.",
];

/** Feature flag: TOP is simulated until the partner API is connected. */
export const PAYLATER_ENABLED = true;
export const PAYLATER_SIMULATION_NOTE =
  "Jalur TOP masih simulasi — integrasi API mitra paylater belum aktif pada build ini.";
