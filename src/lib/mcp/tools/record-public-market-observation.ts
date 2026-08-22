import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

const sourceHosts: Record<string, string[]> = {
  pihps_bi: ["bi.go.id"],
  sp2kp_kemendag: ["sp2kp.kemendag.go.id", "kemendag.go.id"],
  bapanas: ["badanpangan.go.id"],
  kementan: ["pertanian.go.id"],
  bps: ["bps.go.id"],
  bank_indonesia: ["bi.go.id"],
};

function isApprovedOfficialUrl(source: string, rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") return false;
    return (sourceHosts[source] ?? []).some(
      (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
    );
  } catch {
    return false;
  }
}

export default defineTool({
  name: "record_public_market_observation",
  title: "Record public Indonesian market observation",
  description:
    "Record a dated candidate observation from an approved Indonesian government source. Admin only. This stores external public evidence, never Meatlink marketplace data.",
  inputSchema: {
    source_name: z.enum([
      "pihps_bi",
      "sp2kp_kemendag",
      "bapanas",
      "kementan",
      "bps",
      "bank_indonesia",
    ]),
    source_url: z.string().url(),
    signal_type: z.enum(["price", "industry", "policy", "seasonal", "macro"]),
    commodity: z.string().trim().min(1).max(120).optional(),
    market_level: z.enum([
      "producer",
      "rph_wholesale",
      "retail",
      "import",
      "industry",
      "policy",
      "macro",
    ]),
    region: z.string().trim().min(1).max(120).optional(),
    observed_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    price_idr_per_kg: z.number().nonnegative().optional(),
    value: z.number().optional(),
    unit: z.string().trim().max(80).optional(),
    summary: z.string().trim().min(1).max(1000),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    if (!isApprovedOfficialUrl(input.source_name, input.source_url)) {
      return {
        content: [{ type: "text", text: "Source URL does not match the selected official source" }],
        isError: true,
      };
    }
    if (input.signal_type === "price" && input.price_idr_per_kg === undefined) {
      return {
        content: [{ type: "text", text: "A price signal requires price_idr_per_kg" }],
        isError: true,
      };
    }

    const observed = new Date(`${input.observed_on}T00:00:00.000Z`);
    if (Number.isNaN(observed.getTime())) {
      return { content: [{ type: "text", text: "Invalid observation date" }], isError: true };
    }

    const supabase = supabaseForUser(ctx);
    const { data, error } = await (supabase as any)
      .from("public_market_observations")
      .insert({
        ...input,
        commodity: input.commodity ?? "Daging Sapi",
        region: input.region ?? "Nasional",
        verification_status: "candidate",
        created_by: ctx.getUserId() ?? null,
      })
      .select("id,source_name,signal_type,observed_on,verification_status,created_at")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { observation: data },
    };
  },
});
