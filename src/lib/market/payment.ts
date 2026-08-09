/**
 * Payment status shared between the local demo order store and the
 * iPaymu-backed payment intents stored in the database.
 *
 * The client is NEVER the source of truth: a payment only becomes PAID via
 * the verified iPaymu callback (`/api/public/ipaymu/callback`) or a
 * server-side transaction check. No credentials belong in the client bundle.
 */
export type PaymentStatus = "PENDING" | "PROCESSING" | "PAID" | "FAILED" | "EXPIRED";
