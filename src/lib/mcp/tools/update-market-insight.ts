import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "update_market_insight",
  title: "Update market insight draft",
  description:
    "Revise an existing Meatlink sourcing note that is still a draft. Publishing is done by a Meatlink admin, not by this tool.",
  inputSchema: {
    id: z.string().trim().min(1).describe("Insight id to update."),
    title: z.string().trim().min(1).max(160).optional(),
    body: z.string().trim().min(1).optional(),
    category: z.enum(["demand", "pricing", "supply", "logistics", "regulation"]).optional(),
    region: z.string().trim().optional(),
    period_label: z.string().trim().optional(),
    confidence: z.enum(["low", "medium", "high"]).optional(),
    data_refs: z.record(z.string(), z.unknown()).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ id, ...rest }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const patch = Object.fromEntries(
      Object.entries(rest).filter(([, v]) => v !== undefined),
    ) as Record<string, unknown>;
    if (Object.keys(patch).length === 0) {
      return { content: [{ type: "text", text: "Nothing to update" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("market_insights")
      .update(patch as never)
      .eq("id", id)
      .eq("status", "draft")
      .select("id,title,status,updated_at")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) {
      return {
        content: [{ type: "text", text: "No draft insight found with that id" }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { insight: data },
    };
  },
});
