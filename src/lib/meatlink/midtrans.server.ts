import { createHash, timingSafeEqual } from "node:crypto";

/** Core API credentials stay on the server; sandbox is deliberately hard-coded until live rollout. */
function config() {
  const key = process.env["MIDTRANS_SANDBOX_SERVER_KEY"];
  if (!key) throw new Error("Kunci Midtrans sandbox belum tersedia.");
  return { key, base: "https://api.sandbox.midtrans.com/v2" };
}

export type MidtransTransaction = {
  order_id: string;
  transaction_id: string;
  transaction_status: string;
  fraud_status?: string;
  gross_amount: string;
  status_code?: string;
  status_message?: string;
  va_numbers?: { bank: string; va_number: string }[];
  permata_va_number?: string;
  bill_key?: string;
  biller_code?: string;
  actions?: { name: string; url: string }[];
  transaction_time?: string;
};

async function midtransRequest(path: string, body?: Record<string, unknown>) {
  const { key, base } = config();
  const response = await fetch(`${base}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(body ? { "X-Override-Notification": `${(process.env["SITE_URL"] || "https://meatlink.id").replace(/\/$/, "")}/api/public/midtrans-callback` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = (await response.json()) as MidtransTransaction;
  if (!response.ok) {
    console.error("[midtrans] request failed", response.status, result.status_code, result.status_message);
    throw new Error(`Midtrans menolak transaksi (${result.status_code || response.status}).`);
  }
  return result;
}

export async function createMidtransCharge(input: {
  orderId: string;
  amount: number;
  method: "BANK_TRANSFER" | "QRIS";
  bank: string;
  name: string;
  email: string | null;
  phone: string;
}) {
  const bank = input.bank;
  const method = input.method === "QRIS"
    ? { payment_type: "qris", qris: { acquirer: "gopay" } }
    : bank === "mandiri"
      ? { payment_type: "echannel", echannel: { bill_info1: "Payment for", bill_info2: "Meatlink order" } }
      : { payment_type: "bank_transfer", bank_transfer: { bank } };
  return midtransRequest("/charge", {
    ...method,
    transaction_details: { order_id: input.orderId, gross_amount: Math.round(input.amount) },
    customer_details: { first_name: input.name.slice(0, 50), email: input.email || undefined, phone: input.phone },
    custom_expiry: { expiry_duration: 24, unit: "hour" },
  });
}

export async function getMidtransStatus(orderId: string) {
  return midtransRequest(`/${encodeURIComponent(orderId)}/status`);
}

export function validMidtransSignature(payload: Record<string, unknown>) {
  const { key } = config();
  const signature = payload.signature_key;
  if (typeof signature !== "string" || !/^[a-f0-9]{128}$/i.test(signature)) return false;
  const expected = createHash("sha512")
    .update(`${payload.order_id}${payload.status_code}${payload.gross_amount}${key}`)
    .digest("hex");
  return timingSafeEqual(Buffer.from(signature.toLowerCase(), "hex"), Buffer.from(expected, "hex"));
}

export function isMidtransPaid(transaction: MidtransTransaction) {
  return transaction.transaction_status === "settlement" ||
    (transaction.transaction_status === "capture" && transaction.fraud_status === "accept");
}