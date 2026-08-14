import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_market_snapshot",
  title: "Get market snapshot",
  description:
    "Aggregated Indonesian beef market data from Meatlink: house inventory by origin (kg, average base and public price, low-stock count), vendor stock by category, quote-request demand by category and region, order activity by status and payment term, plus tracked market metrics. Aggregate only — no company names, contacts or vendor identities.",
  inputSchema: {
    days: z
      .number()
      .int()
      .min(1)
      .max(730)
      .optional()
      .describe("Look-back window in days for demand and order activity. Defaults to 90."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ days }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase.rpc("ml_market_snapshot", { _days: days ?? 90 });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { snapshot: data },
    };
  },
});
