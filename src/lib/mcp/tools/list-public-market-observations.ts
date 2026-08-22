import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_public_market_observations",
  title: "List public Indonesian market observations",
  description:
    "List recent price, policy, industry, seasonal, and macro observations from approved Indonesian government sources. Contains no Meatlink marketplace data.",
  inputSchema: {
    max_age_days: z.number().int().min(1).max(365).optional(),
    signal_type: z.enum(["price", "industry", "policy", "seasonal", "macro"]).optional(),
    region: z.string().trim().optional(),
    verification_status: z.enum(["candidate", "verified"]).optional(),
    limit: z.number().int().min(1).max(100).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ max_age_days, signal_type, region, verification_status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - (max_age_days ?? 30));

    const supabase = supabaseForUser(ctx);
    const query = (supabase as any)
      .from("public_market_observations")
      .select(
        "id,source_name,source_url,signal_type,commodity,market_level,region,observed_on,price_idr_per_kg,value,unit,summary,verification_status,created_at",
      )
      .gte("observed_on", cutoff.toISOString().slice(0, 10))
      .neq("verification_status", "rejected")
      .order("observed_on", { ascending: false })
      .limit(limit ?? 50);
    if (signal_type) query.eq("signal_type", signal_type);
    if (region) query.eq("region", region);
    if (verification_status) query.eq("verification_status", verification_status);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { count: data?.length ?? 0, observations: data ?? [] },
    };
  },
});
