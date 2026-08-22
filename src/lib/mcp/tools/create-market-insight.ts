import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import {
  containsInternalMarketData,
  evaluateMarketRelevance,
  type MarketObservation,
} from "./market-insight-relevance";

export default defineTool({
  name: "create_market_insight",
  title: "Create market insight",
  description:
    "Write a current, actionable Indonesian beef sourcing note. Always saved as a draft. Requires recent official public Indonesian market observations plus cited structural data; never use Meatlink internal marketplace data.",
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
    audience: z.enum(["buyer", "supplier", "both"]).describe("Who can act on the recommendation."),
    time_horizon_days: z
      .number()
      .int()
      .min(1)
      .max(180)
      .describe("How long the recommendation is intended to remain useful."),
    observation_ids: z
      .array(z.string().uuid())
      .min(1)
      .max(20)
      .describe("Recent public_market_observations that establish present-day relevance."),
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
    const privacyText = `${input.title}\n${input.body}\n${JSON.stringify(input.data_refs ?? {})}`;
    if (containsInternalMarketData(privacyText)) {
      return {
        content: [
          {
            type: "text",
            text: "Insight rejected: Meatlink internal marketplace data must not appear in public market analysis",
          },
        ],
        isError: true,
      };
    }

    const uniqueObservationIds = [...new Set(input.observation_ids)];
    const { data: observations, error: observationError } = await supabase
      .from("public_market_observations")
      .select(
        "id,source_name,source_url,signal_type,commodity,market_level,region,observed_on,price_idr_per_kg,value,unit,summary,verification_status",
      )
      .in("id", uniqueObservationIds);
    if (observationError) {
      return { content: [{ type: "text", text: observationError.message }], isError: true };
    }
    if ((observations?.length ?? 0) !== uniqueObservationIds.length) {
      return {
        content: [{ type: "text", text: "One or more market observations are unavailable" }],
        isError: true,
      };
    }

    let relevance;
    try {
      relevance = evaluateMarketRelevance(
        (observations ?? []) as MarketObservation[],
        input.confidence ?? "medium",
      );
    } catch (error) {
      return {
        content: [
          { type: "text", text: error instanceof Error ? error.message : "Invalid market context" },
        ],
        isError: true,
      };
    }

    const dataRefs = {
      ...(input.data_refs ?? {}),
      recommendation_context: {
        audience: input.audience,
        time_horizon_days: input.time_horizon_days,
        ...relevance,
      },
    };
    const { data, error } = await supabase
      .from("market_insights")
      .insert({
        title: input.title,
        body: input.body,
        category: input.category ?? "demand",
        region: input.region || "Nasional",
        period_label: input.period_label ?? null,
        confidence: relevance.confidence,
        data_refs: dataRefs as never,
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
