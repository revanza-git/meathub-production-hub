import { createFileRoute } from "@tanstack/react-router";

/**
 * Scheduled ops endpoint. Called by the database scheduler (pg_cron) with the
 * shared secret in `x-ops-secret`. Runs the unpaid-order sweep, the low-stock
 * alert and the daily digest; each job dedupes itself.
 */
export const Route = createFileRoute("/api/public/ops-cron")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["OPS_CRON_SECRET"];
        if (!secret) return new Response("Not configured", { status: 503 });

        const provided = request.headers.get("x-ops-secret") ?? "";
        if (provided.length !== secret.length || provided !== secret) {
          return new Response("Unauthorized", { status: 401 });
        }

        let jobs: string[] | undefined;
        try {
          const body = (await request.json()) as { jobs?: unknown };
          if (Array.isArray(body?.jobs)) jobs = body.jobs.filter((j): j is string => typeof j === "string");
        } catch {
          jobs = undefined;
        }

        try {
          const { runOpsCron } = await import("@/lib/meatlink/ops.server");
          const result = await runOpsCron(jobs);
          return Response.json({ ok: true, result });
        } catch (error) {
          console.error("[ops-cron] failed", error);
          return Response.json(
            { ok: false, error: error instanceof Error ? error.message : "unknown" },
            { status: 500 },
          );
        }
      },
    },
  },
});
