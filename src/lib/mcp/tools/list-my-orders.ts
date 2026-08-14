import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_orders",
  title: "List my orders",
  description:
    "List the signed-in user's Meatlink orders with status, quantity, payment term and notes. Newest first.",
  inputSchema: {
    status: z
      .enum(["PENDING", "CONFIRMED", "ON_HOLD", "REJECTED", "DELIVERED"])
      .optional()
      .describe("Optional status filter."),
    limit: z.number().int().optional().describe("Maximum rows to return; defaults to 20."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const take = Math.min(Math.max(limit ?? 20, 1), 100);
    let query = supabase
      .from("buyer_orders")
      .select(
        "id, order_no, product_text, qty_kg, payment_term, status, delivery_location, needed_by, buyer_notes, vendor_note, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(take);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { count: data?.length ?? 0, orders: data ?? [] },
    };
  },
});
