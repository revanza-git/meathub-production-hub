import { createHash, timingSafeEqual } from "node:crypto";

export type MidtransEnvironment = "sandbox" | "production";
export const paymentReference = (environment: MidtransEnvironment, orderId: string) =>
  `${environment === "production" ? "Midtrans Live " : "Midtrans "}${orderId}`;
export function paymentReferenceDetails(ref: string | null | undefined): { environment: MidtransEnvironment; orderId: string } | null {
  if (ref?.startsWith("Midtrans Live ")) return { environment: "production", orderId: ref.slice(14) };
  if (ref?.startsWith("Midtrans ")) return { environment: "sandbox", orderId: ref.slice(9) };
  return null;
}

/** Never infer the charge environment from which credentials happen to be present. */
export function chargeEnvironment(): MidtransEnvironment {
  return process.env["MIDTRANS_MODE"] === "production" ? "production" : "sandbox";
}

function config(environment: MidtransEnvironment) {
  const key = process.env[environment === "production" ? "MIDTRANS_PRODUCTION_SERVER_KEY" : "MIDTRANS_SANDBOX_SERVER_KEY"];
  if (!key) throw new Error(`Kunci Midtrans ${environment} belum tersedia.`);
  return { key, base: environment === "production" ? "https://api.midtrans.com/v2" : "https://api.sandbox.midtrans.com/v2" };
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
  settlement_time?: string;
};

async function midtransRequest(environment: MidtransEnvironment, path: string, body?: Record<string, unknown>) {
  const { key, base } = config(environment);
  const response = await fetch(`${base}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(body ? { "X-Override-Notification": "https://meatlink.id/api/public/midtrans-callback" } : {}),
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
  environment: MidtransEnvironment;
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
  return midtransRequest(input.environment, "/charge", {
    ...method,
    transaction_details: { order_id: input.orderId, gross_amount: Math.round(input.amount) },
    customer_details: { first_name: input.name.slice(0, 50), email: input.email || undefined, phone: input.phone },
    custom_expiry: { expiry_duration: 24, unit: "hour" },
  });
}

export async function getMidtransStatus(orderId: string, environment: MidtransEnvironment) {
  return midtransRequest(environment, `/${encodeURIComponent(orderId)}/status`);
}

export function validMidtransSignature(payload: Record<string, unknown>, environment: MidtransEnvironment) {
  const signature = payload.signature_key;
  if (typeof signature !== "string" || !/^[a-f0-9]{128}$/i.test(signature)) return false;
  const { key } = config(environment);
  const expected = createHash("sha512")
    .update(`${payload.order_id}${payload.status_code}${payload.gross_amount}${key}`)
    .digest("hex");
  return timingSafeEqual(Buffer.from(signature.toLowerCase(), "hex"), Buffer.from(expected, "hex"));
}

export function isMidtransPaid(transaction: MidtransTransaction) {
  return transaction.transaction_status === "settlement" ||
    (transaction.transaction_status === "capture" && transaction.fraud_status === "accept");
}