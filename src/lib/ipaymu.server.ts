/**
 * iPaymu Direct API client (server-only).
 *
 * Docs: POST {base}/api/v2/payment/direct  and  POST {base}/api/v2/transaction
 * Auth headers: va, signature, timestamp.
 * Signature = HMAC-SHA256( "POST:{va}:{sha256(body)}:{apiKey}", apiKey )
 *
 * Credentials are read inside functions (never at module scope) because env is
 * injected per request on the edge runtime.
 */

const enc = new TextEncoder();

function hex(buf: ArrayBuffer) {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(input: string) {
  return hex(await crypto.subtle.digest("SHA-256", enc.encode(input)));
}

async function hmacSha256Hex(key: string, message: string) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return hex(await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message)));
}

function credentials() {
  const va = process.env["IPAYMU_VA"];
  const apiKey = process.env["IPAYMU_API_KEY"];
  const mode = process.env["IPAYMU_MODE"] ?? "sandbox";
  if (!va || !apiKey) throw new Error("iPaymu belum dikonfigurasi (IPAYMU_VA / IPAYMU_API_KEY).");
  const base = mode === "production" ? "https://my.ipaymu.com" : "https://sandbox.ipaymu.com";
  return { va, apiKey, base, mode };
}

function timestamp() {
  const d = new Date();
  const p = (n: number, l = 2) => String(n).padStart(l, "0");
  return (
    `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}` +
    `${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`
  );
}

async function call<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const { va, apiKey, base } = credentials();
  const raw = JSON.stringify(body);
  const bodyHash = (await sha256Hex(raw)).toLowerCase();
  const signature = await hmacSha256Hex(apiKey, `POST:${va}:${bodyHash}:${apiKey}`);

  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      va,
      signature,
      timestamp: timestamp(),
    },
    body: raw,
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Respons iPaymu tidak valid (${res.status}).`);
  }
  return json as T;
}

export type IpaymuDirectResponse = {
  Status: number;
  Success?: boolean;
  Message?: string | string[];
  Data?: {
    SessionID?: string;
    TransactionId?: number | string;
    ReferenceId?: string;
    Via?: string;
    Channel?: string;
    PaymentNo?: string;
    PaymentName?: string;
    Total?: number;
    Fee?: number;
    Expired?: string;
    QrString?: string;
    QrImage?: string;
    QrTemplate?: string;
  };
};

export type IpaymuTransactionResponse = {
  Status: number;
  Message?: string | string[];
  Data?: {
    TransactionId?: number | string;
    ReferenceId?: string;
    Status?: number;
    StatusDesc?: string;
    Amount?: number;
    Fee?: number;
    PaidAt?: string;
    Via?: string;
    Channel?: string;
    PaymentNo?: string;
    Expired?: string;
  };
};

export type DirectPaymentInput = {
  name: string;
  phone: string;
  email: string;
  amount: number;
  referenceId: string;
  paymentMethod: string;
  paymentChannel: string;
  notifyUrl: string;
  comments?: string;
  /** minutes until the VA / QR expires */
  expiredMinutes?: number;
};

export async function directPayment(input: DirectPaymentInput) {
  return call<IpaymuDirectResponse>("/api/v2/payment/direct", {
    name: input.name,
    phone: input.phone,
    email: input.email,
    amount: Math.round(input.amount),
    notifyUrl: input.notifyUrl,
    expired: input.expiredMinutes ?? 60,
    expiredType: "minutes",
    referenceId: input.referenceId,
    comments: input.comments ?? `Pembayaran pesanan ${input.referenceId}`,
    paymentMethod: input.paymentMethod,
    paymentChannel: input.paymentChannel,
  });
}

export async function checkTransaction(transactionId: string) {
  return call<IpaymuTransactionResponse>("/api/v2/transaction", { transactionId });
}

/** iPaymu numeric status → our intent status. */
export function mapIpaymuStatus(code: number | undefined): "PENDING" | "PROCESSING" | "PAID" | "FAILED" | "EXPIRED" {
  switch (code) {
    case 1:
      return "PAID";
    case 0:
      return "PENDING";
    case 2:
      return "PROCESSING";
    case -2:
      return "EXPIRED";
    default:
      return "FAILED";
  }
}

export function isConfigured() {
  return Boolean(process.env["IPAYMU_VA"] && process.env["IPAYMU_API_KEY"]);
}
