import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_available_stock",
  title: "List available stock",
  description:
    "List aggregated meat stock available on Meatlink (product name, category, total kg). Vendor identities are not exposed.",
  inputSchema: {
    search: z.string().optional().describe("Optional text filter on the product name."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase.rpc("ml_public_stock");
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const term = search?.trim().toLowerCase();
    const rows = (data ?? []).filter((r) =>
      term ? r.product_name.toLowerCase().includes(term) : true,
    );
    return {
      content: [{ type: "text", text: JSON.stringify(rows) }],
      structuredContent: { count: rows.length, rows },
    };
  },
});
