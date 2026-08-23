import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_market_insights",
  title: "List market insights",
  description:
    "List existing Meatlink market insight notes (sourcing notes) so you can avoid duplicates and follow up on earlier periods. Newest first.",
  inputSchema: {
    status: z
      .enum(["draft", "published", "archived"])
      .optional()
      .describe("Optional status filter."),
    region: z.string().trim().optional().describe("Optional region filter, e.g. Jakarta."),
    limit: z.number().int().min(1).max(100).optional().describe("Maximum rows; defaults to 20."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, region, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("market_insights")
      .select(
        "id,title,body,title_en,body_en,category,region,period_label,source,confidence,status,display_rank,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (status) query = query.eq("status", status);
    if (region) query = query.eq("region", region);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { count: data?.length ?? 0, insights: data ?? [] },
    };
  },
});
