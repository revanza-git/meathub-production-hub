/**
 * Mock payment service.
 *
 * This is a deliberate abstraction boundary. A future backend can implement
 * `PaymentService` with real Xendit XenPlatform server-side calls + webhooks.
 * The frontend must NEVER be the source of truth for payment success — in
 * production, `status` should only come from a verified backend webhook.
 * No secret keys belong in this file or anywhere in the client bundle.
 */

export type PaymentStatus = "PENDING" | "PROCESSING" | "PAID" | "FAILED" | "EXPIRED";

export type PaymentIntent = {
  id: string;
  orderId: string;
  method: string;
  amount: number;
  status: PaymentStatus;
  createdAt: string;
  expiresAt: string;
  instructions: string;
};

export interface PaymentService {
  createIntent(input: { orderId: string; method: string; amount: number }): Promise<PaymentIntent>;
  /** In production this is replaced by a backend webhook. Demo only. */
  simulate(intent: PaymentIntent, outcome: PaymentStatus): Promise<PaymentIntent>;
}

const INSTRUCTIONS: Record<string, string> = {
  qris: "Pindai kode QR pada aplikasi pembayaran Anda.",
  gopay: "Buka aplikasi Gojek dan setujui permintaan pembayaran.",
  ovo: "Buka aplikasi OVO dan masukkan PIN Anda.",
  dana: "Buka aplikasi DANA dan konfirmasi pembayaran.",
  shopeepay: "Buka aplikasi Shopee dan konfirmasi pembayaran.",
  va: "Transfer ke nomor Virtual Account demo 8808 0000 1234 5678.",
  transfer: "Transfer manual ke rekening demo MEATHUB, lalu unggah bukti.",
  card: "Masukkan data kartu pada halaman pembayaran mitra (demo).",
};

export const mockPaymentService: PaymentService = {
  async createIntent({ orderId, method, amount }) {
    return {
      id: `PAY-${Date.now().toString().slice(-8)}`,
      orderId,
      method,
      amount,
      status: "PENDING",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      instructions: INSTRUCTIONS[method] ?? "Ikuti instruksi pembayaran demo.",
    };
  },
  async simulate(intent, outcome) {
    return { ...intent, status: outcome };
  },
};
