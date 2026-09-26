import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  headers: z.array(z.string().max(120)).max(40),
  samples: z.array(z.record(z.string().max(120), z.string().max(160))).max(6),
});

export const analyzeInventorySheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: allowed, error } = await context.supabase.rpc("ml_has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (error || !allowed) throw new Error("Hanya admin dapat menganalisis inventaris.");
    const { IMPORT_COLUMNS } = await import("./inventory");
    const { suggestInventoryMapping } = await import("./inventory-ai.server");
    const safeHeaders = data.headers;
    const safeSamples = data.samples.map((sample) =>
      Object.fromEntries(safeHeaders.map((header) => [header, String(sample[header] ?? "").slice(0, 160)])),
    );
    const suggestions = await suggestInventoryMapping(safeHeaders, safeSamples, IMPORT_COLUMNS);
    const seenTargets = new Set<string>();
    const mapping = suggestions.mapping.filter(({ source, target }) => {
      if (!safeHeaders.includes(source) || !(IMPORT_COLUMNS as readonly string[]).includes(target) || seenTargets.has(target)) return false;
      seenTargets.add(target);
      return true;
    });
    return { mapping, warnings: suggestions.warnings.slice(0, 8).map((warning) => ({
      row: Math.max(2, Math.min(7, Math.round(warning.row) || 2)),
      message: warning.message.slice(0, 220),
    })) };
  });