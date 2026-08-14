import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_order",
  title: "Create order",
  description:
    "Create a new Meatlink order for the signed-in user. Quantity is in kilograms; payment term is CBD, TOP7, TOP14 or TOP30.",
  inputSchema: {
    buyer_name: z.string().trim().min(1).describe("Company or contact name placing the order."),
    product_text: z.string().trim().min(1).describe("Free-text product description."),
    qty_kg: z.number().positive().describe("Quantity in kilograms."),
    payment_term: z.enum(["CBD", "TOP7", "TOP14", "TOP30"]).describe("Payment term."),
    delivery_location: z.string().trim().optional().describe("Delivery city or address."),
    needed_by: z.string().trim().optional().describe("Required date, ISO format YYYY-MM-DD."),
    buyer_notes: z.string().trim().optional().describe("Extra notes for the Meatlink team."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const userId = ctx.getUserId();
    if (!userId) {
      return { content: [{ type: "text", text: "Missing user identity" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("buyer_orders")
      .insert({
        user_id: userId,
        buyer_name: input.buyer_name,
        product_text: input.product_text,
        qty_kg: input.qty_kg,
        payment_term: input.payment_term,
        delivery_location: input.delivery_location ?? null,
        needed_by: input.needed_by ?? null,
        buyer_notes: input.buyer_notes ?? null,
      })
      .select("id, order_no, status, created_at")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { order: data },
    };
  },
});
