import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const BASE_URL = "https://meatlink.id";

function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const AVAILABILITY: Record<string, string> = {
  IN_STOCK: "in_stock",
  LIMITED: "in_stock",
  PRE_ORDER: "preorder",
};

/** Google Merchant Center product feed (RSS 2.0 + g: namespace). */
export const Route = createFileRoute("/api/public/merchant-feed.xml")({
  server: {
    handlers: {
      GET: async () => {
        const supabase = createClient<Database>(
          process.env["SUPABASE_URL"]!,
          process.env["SUPABASE_PUBLISHABLE_KEY"]!,
          { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
        );

        const { data, error } = await supabase.rpc("ml_public_catalog", {
          _sort: "name_asc",
          _limit: 1000,
          _offset: 0,
        });

        if (error) {
          console.error("merchant-feed catalog read failed", error);
          return new Response("Feed unavailable", { status: 503 });
        }

        const items = (data ?? []).map((row) => {
          const price = Number(row.public_price_idr);
          const list = Number(row.list_price_idr ?? 0);
          const onPromo = list > 0 && price > 0 && list > price;
          const parts = [
            `    <g:id>${esc(row.slug)}</g:id>`,
            `    <g:title>${esc(row.name)}</g:title>`,
            `    <g:description>${esc(
              [row.brand, row.origin, row.condition, row.avg_weight_text]
                .filter(Boolean)
                .join(" · ") || row.name,
            )}</g:description>`,
            `    <g:link>${BASE_URL}/produk/${esc(row.slug)}</g:link>`,
            row.image_url ? `    <g:image_link>${esc(row.image_url)}</g:image_link>` : null,
            `    <g:availability>${AVAILABILITY[row.availability] ?? "in_stock"}</g:availability>`,
            `    <g:condition>new</g:condition>`,
            `    <g:price>${(onPromo ? list : price).toFixed(2)} IDR</g:price>`,
            onPromo ? `    <g:sale_price>${price.toFixed(2)} IDR</g:sale_price>` : null,
            row.brand ? `    <g:brand>${esc(row.brand)}</g:brand>` : null,
            `    <g:identifier_exists>no</g:identifier_exists>`,
            `    <g:product_type>${esc(row.category)}</g:product_type>`,
            `    <g:unit_pricing_measure>1kg</g:unit_pricing_measure>`,
          ].filter(Boolean);
          return `  <item>\n${parts.join("\n")}\n  </item>`;
        });

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">`,
          `<channel>`,
          `  <title>Meatlink.id — Katalog Daging B2B</title>`,
          `  <link>${BASE_URL}</link>`,
          `  <description>Katalog daging impor dan lokal Meatlink.id, harga per kilogram.</description>`,
          ...items,
          `</channel>`,
          `</rss>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
