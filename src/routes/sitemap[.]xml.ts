import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type {} from "@tanstack/react-start";
import type { Database } from "@/integrations/supabase/types";

const BASE_URL = "https://meatlink.id";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const entries: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/about", changefreq: "monthly", priority: "0.6" },
  { path: "/network", changefreq: "monthly", priority: "0.8" },
  { path: "/supply", changefreq: "monthly", priority: "0.7" },
  { path: "/insights", changefreq: "weekly", priority: "0.7" },
  { path: "/request-quote", changefreq: "monthly", priority: "0.9" },
  { path: "/contact", changefreq: "monthly", priority: "0.6" },
  { path: "/produk", changefreq: "daily", priority: "0.9" },
  { path: "/promo", changefreq: "daily", priority: "0.8" },
  { path: "/kategori/prime-cut", changefreq: "daily", priority: "0.8" },
  { path: "/kategori/second-cut", changefreq: "daily", priority: "0.8" },
  { path: "/kategori/offal", changefreq: "daily", priority: "0.7" },
  { path: "/kategori/bone", changefreq: "daily", priority: "0.7" },
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
