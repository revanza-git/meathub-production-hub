import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "review_public_market_observation",
  title: "Review public market observation",
  description:
    "Verify or reject a candidate external market observation after checking its official source. Admin only.",
  inputSchema: {
    id: z.string().uuid(),
    verification_status: z.enum(["verified", "rejected"]),
    review_notes: z.string().trim().min(1).max(1000),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ id, verification_status, review_notes }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("public_market_observations")
      .update({
        verification_status,
        review_notes,
        reviewed_by: ctx.getUserId() ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id,verification_status,reviewed_at")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) {
      return { content: [{ type: "text", text: "Observation not found" }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { observation: data },
    };
  },
});
