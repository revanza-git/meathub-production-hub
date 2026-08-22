import { createHash, createHmac } from "crypto";

/** Server-only iPaymu Direct API client. Never import from client code. */

export type IpaymuMode = "sandbox" | "production";

function config() {
  const va = process.env["IPAYMU_VA"];
  const apiKey = process.env["IPAYMU_API_KEY"];
  const mode = (process.env["IPAYMU_MODE"] ?? "sandbox").toLowerCase() as IpaymuMode;
  if (!va || !apiKey) throw new Error("iPaymu belum dikonfigurasi.");
  const base = mode === "production" ? "https://my.ipaymu.com" : "https://sandbox.ipaymu.com";
  return { va, apiKey, mode, base };
}

function sign(body: unknown, va: string, apiKey: string) {
  const json = JSON.stringify(body);
  const bodyHash = createHash("sha256").update(json).digest("hex").toLowerCase();
  const stringToSign = `POST:${va}:${bodyHash}:${apiKey}`;
  return {
    json,
    signature: createHmac("sha256", apiKey).update(stringToSign).digest("hex"),
  };
}

async function call<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const { va, apiKey, base } = config();
  const { json, signature } = sign(body, va, apiKey);
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      va,
      signature,
      timestamp: new Date()
        .toISOString()
        .replace(/[-:TZ.]/g, "")
        .slice(0, 14),
    },
    body: json,
  });
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`iPaymu response tidak valid (${res.status})`);
  }
  const payload = parsed as { Status?: number; Message?: string; Data?: T };
  if (!res.ok || (payload.Status !== undefined && payload.Status !== 200)) {
    throw new Error(payload.Message ?? `iPaymu error (${res.status})`);
  }
  return payload.Data as T;
}

export type DirectPaymentResult = {
  TransactionId?: number | string;
  ReferenceId?: string;
  PaymentNo?: string;
  PaymentName?: string;
  Total?: number;
  Fee?: number;
  Expired?: string;
  QrString?: string;
  QrImage?: string;
  QrTemplate?: string;
};

export type CreatePaymentInput = {
  method: "va" | "qris";
  channel: string;
  amount: number;
  referenceId: string;
  buyerName: string;
  phone: string;
  email?: string | null;
  notifyUrl: string;
  products: { name: string; qty: number; price: number }[];
};

export async function createDirectPayment(input: CreatePaymentInput) {
  return call<DirectPaymentResult>("/api/v2/payment/direct", {
    name: input.buyerName.slice(0, 60),
    phone: input.phone.replace(/[^\d+]/g, "").slice(0, 20),
    email: input.email || "noreply@meatlink.id",
    amount: Math.round(input.amount),
    notifyUrl: input.notifyUrl,
    referenceId: input.referenceId,
    paymentMethod: input.method,
    paymentChannel: input.channel,
    product: input.products.map((p) => p.name.slice(0, 60)),
    qty: input.products.map((p) => String(p.qty)),
    price: input.products.map((p) => String(Math.round(p.price))),
    description: `Pesanan Meatlink ${input.referenceId}`,
  });
}

export type TransactionStatus = {
  TransactionId?: number | string;
  ReferenceId?: string;
  Status?: number;
  StatusDesc?: string;
  Amount?: number | string;
};

/** Server-side verification of a callback: never trust the webhook body alone. */
export async function fetchTransaction(trxId: string) {
  return call<TransactionStatus>("/api/v2/transaction", { transactionId: trxId });
}

export function ipaymuChannel(method: "BANK_TRANSFER" | "QRIS", channel?: string) {
  if (method === "QRIS") return { method: "qris" as const, channel: "qris" };
  return { method: "va" as const, channel: channel && channel.length > 1 ? channel : "bag" };
}
