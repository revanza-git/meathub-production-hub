import { createFileRoute } from "@tanstack/react-router";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/**
 * Public read proxy for the private `admin-inventory` storage bucket.
 * Only serves files under items/ with a known image extension, so the bucket
 * itself can stay private (no direct storage URLs exposed).
 */
export const Route = createFileRoute("/api/public/img/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const path = String(params._splat ?? "");
        const ext = path.split(".").pop()?.toLowerCase() ?? "";
        const contentType = CONTENT_TYPES[ext];
        if (!/^items\/[\w-]+\/[\w.-]+$/.test(path) || path.includes("..") || !contentType) {
          return new Response("Not found", { status: 404 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from("admin-inventory").download(path);
        if (error || !data) return new Response("Not found", { status: 404 });

        return new Response(data, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
          },
        });
      },
    },
  },
});
