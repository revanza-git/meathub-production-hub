import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero, SiteLayout } from "@/components/site/site-layout";
import { resolveFeatureImage, useFeaturedInventory } from "@/lib/meatlink/featured";
import { formatIdr } from "@/lib/meatlink/inventory";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "Market Insights — Meatlink.id meat sourcing intelligence" },
      {
        name: "description",
        content:
          "What Meatlink is seeing across the Indonesian meat trade: demand patterns, sourcing notes and recently matched requests.",
      },
      { property: "og:title", content: "Market Insights — Meatlink.id" },
      {
        property: "og:description",
        content: "Demand patterns and sourcing notes from the Indonesian meat trade.",
      },
    ],
  }),
  component: InsightsPage,
});

const NOTES = [
  {
    title: "Wagyu demand keeps moving up-grade",
    body: "Requests for MB6+ now outnumber MB4-5 in Jakarta fine dining. Availability tightens fastest in the last two weeks of each month.",
  },
  {
    title: "Lamb programmes favour fixed monthly volume",
    body: "Buyers locking a monthly rack allocation consistently land better landed cost than ad-hoc ordering.",
  },
  {
    title: "Bali sourcing rewards a second supplier",
    body: "Freight timing makes a verified backup source the single biggest reliability upgrade for island operators.",
  },
];

function InsightsPage() {
  const { data: featured = [] } = useFeaturedInventory(5);
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Market insights"
        title="What we're seeing in the trade."
        intro="Practical notes from the requests moving through the Meatlink network — no fluff, no vanity data."
      />

      <section className="bg-bone">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <p className="eyebrow text-crimson">Sourcing notes</p>
          <div className="mt-10 grid gap-px border border-line bg-line lg:grid-cols-3">
            {NOTES.map((n) => (
              <article key={n.title} className="bg-card p-8">
                <h2 className="font-display text-2xl leading-snug">{n.title}</h2>
                <p className="mt-4 text-sm leading-relaxed text-ash">{n.body}</p>
              </article>
            ))}
          </div>

          <div className="mt-20 flex items-end justify-between gap-4">
            <p className="eyebrow text-crimson">Recently sourced</p>
            {featured.length > 0 ? (
              <div className="flex gap-px bg-line">
                <button
                  type="button"
                  aria-label="Previous items"
                  onClick={() => scrollBy(-1)}
                  className="bg-card p-3 text-ink transition-colors hover:bg-noir hover:text-bone"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Next items"
                  onClick={() => scrollBy(1)}
                  className="bg-card p-3 text-ink transition-colors hover:bg-noir hover:text-bone"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </div>
          {featured.length === 0 ? (
            <p className="mt-10 border border-line bg-card p-6 text-sm text-ash">
              No featured stock published yet — check back shortly.
            </p>
          ) : (
            <div
              ref={trackRef}
              className="mt-10 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {featured.map((item) => (
                <article
                  key={item.id}
                  className="w-[85%] shrink-0 snap-start border border-line bg-card sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)]"
                >
                  <img
                    src={resolveFeatureImage(item.image_url)}
                    alt={item.name}
                    loading="lazy"
                    width={1200}
                    height={900}
                    className="h-48 w-full object-cover"
                  />
                  <div className="p-6">
                    <p className="eyebrow text-crimson">{item.origin}</p>
                    <h3 className="mt-3 font-display text-xl leading-snug">{item.name}</h3>
                    <dl className="mt-5 space-y-2 text-xs text-ash">
                      <div className="flex justify-between border-b border-line pb-2">
                        <dt>Brand</dt>
                        <dd className="text-ink">{item.brand || "Meatlink select"}</dd>
                      </div>
                      <div className="flex justify-between border-b border-line pb-2">
                        <dt>Average weight</dt>
                        <dd className="text-ink">{item.avg_weight_text ?? "On request"}</dd>
                      </div>
                      <div className="flex justify-between pt-1">
                        <dt>Indicative price</dt>
                        <dd className="text-crimson">{formatIdr(item.sale_price_idr)} / kg</dd>
                      </div>
                    </dl>
                  </div>
                </article>
              ))}
            </div>
          )}



          <div className="mt-14">
            <Link
              to="/request-quote"
              className="eyebrow inline-flex bg-crimson px-7 py-4 text-bone transition-colors hover:bg-crimson-deep"
            >
              Request a Quote
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
