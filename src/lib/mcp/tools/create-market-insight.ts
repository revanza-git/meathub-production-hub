import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_market_insight",
  title: "Create market insight",
  description:
    "Write a new Meatlink sourcing note about the Indonesian beef market. Always saved as a draft — a Meatlink admin reviews and publishes it. Cite the aggregates you relied on in data_refs.",
  inputSchema: {
    title: z.string().trim().min(1).max(160).describe("Short headline for the note."),
    body: z.string().trim().min(1).describe("The analysis, 2-5 sentences, concrete and practical."),
    category: z
      .enum(["demand", "pricing", "supply", "logistics", "regulation"])
      .optional()
      .describe("Note category. Defaults to demand."),
    region: z
      .string()
      .trim()
      .optional()
      .describe("Region the note applies to, e.g. Jakarta, Bali, Nasional."),
    period_label: z
      .string()
      .trim()
      .optional()
      .describe("Human period label, e.g. 'Agustus 2026' or 'Q3 2026'."),
    confidence: z
      .enum(["low", "medium", "high"])
      .optional()
      .describe("How strongly the underlying data supports the note."),
    data_refs: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("JSON object of the numbers the note is based on."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const userId = ctx.getUserId();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("market_insights")
      .insert({
        title: input.title,
        body: input.body,
        category: input.category ?? "demand",
        region: input.region || "Nasional",
        period_label: input.period_label ?? null,
        confidence: input.confidence ?? "medium",
        data_refs: (input.data_refs ?? {}) as never,
        source: "agent",
        status: "draft",
        created_by: userId ?? null,
      })
      .select("id,title,status,created_at")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { insight: data },
    };
  },
});
