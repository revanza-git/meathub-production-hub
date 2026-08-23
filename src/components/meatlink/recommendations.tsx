import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBi } from "@/lib/i18n";

type Rec = { slug: string; product_name: string };
type Kind = "repeat" | "popular";

/**
 * Shows the signed-in buyer's repeat purchases, falling back to
 * best-sellers for guests.
 */
export function Recommendations() {
  const bi = useBi();
  const { data } = useQuery({
    queryKey: ["ml-recommendations"],
    queryFn: async (): Promise<{ kind: Kind; items: Rec[] }> => {
      const { data: auth } = await supabase.auth.getUser();
      if (auth.user) {
        const { data: mine } = await supabase.rpc("ml_my_frequent_products", { _limit: 6 });
        const items = (mine ?? []) as unknown as Rec[];
        if (items.length) return { kind: "repeat" as const, items };
      }
      const { data: popular } = await supabase.rpc("ml_popular_products", { _limit: 6 });
      return { kind: "popular" as const, items: (popular ?? []) as unknown as Rec[] };
    },
  });

  if (!data || data.items.length === 0) return null;

  return (
    <section className="border-t border-line bg-ink/[0.02]">
      <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <h2 className="eyebrow text-ash">{data.kind === "repeat"
            ? bi("Sering dibeli lagi", "Frequently reordered")
            : bi("Paling banyak dipesan", "Most ordered")}</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {data.items.map((r) => (
            <Link
              key={r.slug}
              to="/produk/$slug"
              params={{ slug: r.slug }}
              className="border border-line bg-background px-4 py-2 text-sm text-ink transition-colors hover:border-ink"
            >
              {r.product_name}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
