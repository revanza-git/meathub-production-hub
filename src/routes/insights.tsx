import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero, SiteLayout } from "@/components/site/site-layout";
import { RECENTLY_SOURCED } from "@/lib/meatlink/config";

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

          <p className="eyebrow mt-20 text-crimson">Recently sourced</p>
          <div className="mt-10 divide-y divide-line border border-line bg-card">
            {RECENTLY_SOURCED.map((item) => (
              <div
                key={item.product}
                className="grid gap-2 p-6 sm:grid-cols-4 sm:items-center sm:gap-6"
              >
                <span className="font-display text-lg">{item.product}</span>
                <span className="text-xs text-ash">{item.location}</span>
                <span className="text-xs text-ash">{item.volume}</span>
                <span className="eyebrow text-crimson sm:text-right">{item.status}</span>
              </div>
            ))}
          </div>

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
