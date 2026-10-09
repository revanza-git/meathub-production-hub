type ActionOrder = {
  status: string;
  payment_method: string;
  paid_at?: string | null;
  payment_ref?: string | null;
  payment_proof_url?: string | null;
  buyer_confirmed_at?: string | null;
};

/** Presentation only: never authorizes a payment or status transition. */
export function orderNextAction(order: ActionOrder) {
  if (order.status === "CANCELLED" || order.status === "COMPLETED") return "details";
  if (order.status === "SHIPPED") return order.buyer_confirmed_at ? "tracking" : "receive";
  if (order.status === "PROCESSING") return "tracking";
  if (order.status === "PAID" || order.paid_at) return "prepare";
  if (order.payment_method === "TERMS_REQUEST") return "terms";
  if (order.payment_ref?.startsWith("Midtrans ") || order.payment_ref?.startsWith("Midtrans Live ")) return "previous_payment";
  if (order.payment_proof_url) return "verify";
  return "pay";
}