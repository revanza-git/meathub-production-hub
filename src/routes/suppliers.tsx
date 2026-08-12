import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { PageHero, SiteLayout } from "@/components/site/site-layout";
import suppliersImg from "@/assets/for-suppliers.jpg";

export const Route = createFileRoute("/suppliers")({
  head: () => ({
    meta: [
      { title: "For Suppliers — Reach qualified meat buyers with Meatlink.id" },
      {
        name: "description",
        content:
          "Importers, distributors and producers: receive pre-qualified meat buying requests with real spec and volume. Free to join the Meatlink network.",
      },
      { property: "og:title", content: "For Suppliers — Meatlink.id" },
      {
        property: "og:description",
        content: "Pre-qualified B2B meat demand, matched to what you actually carry.",
      },
    ],
  }),
  component: SuppliersPage,
});

const BENEFITS = [
  {
    title: "Qualified demand only",
    body: "Every request we pass on has a named business, a spec, a volume and a delivery date attached.",
  },
  {
    title: "No listing fees",
    body: "Joining the network costs nothing. We're paid on the outcome, not on exposure.",
  },
  {
    title: "You keep the relationship",
    body: "We introduce and stay available, but the supply agreement is between you and the buyer.",
  },
  {
    title: "Fill your gaps",
    body: "Move slow-turning SKUs and surplus allocation to buyers actively looking for them.",
  },
];

const CRITERIA = [
  "Legitimate, registered business with traceable sourcing",
  "Documented cold chain from storage to delivery",
  "Consistent grading and honest spec representation",
  "Capacity to serve repeat B2B volume",
];

function SuppliersPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="For suppliers"
        title={
          <>
            Qualified buyers,
            <br />
            <span className="italic text-bone/85">matched to what you carry.</span>
          </>
        }
        intro="Meatlink routes real buying requests from restaurants, hotels and retailers to the suppliers who can genuinely fill them."
      />

      <section className="bg-bone">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
          <p className="eyebrow text-crimson">Why supply through Meatlink</p>
          <div className="mt-12 grid gap-px border border-line bg-line sm:grid-cols-2">
            {BENEFITS.map((b) => (
              <article key={b.title} className="bg-card p-8 lg:p-10">
                <h2 className="font-display text-2xl">{b.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-ash">{b.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-noir text-bone">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="eyebrow text-crimson">What we look for</p>
            <h2 className="mt-5 font-display text-3xl sm:text-4xl">
              We vet before we introduce.
            </h2>
            <ul className="mt-8 space-y-4">
              {CRITERIA.map((c) => (
                <li key={c} className="flex gap-4 border-b border-white/10 pb-4 text-sm text-bone/70">
                  <span className="text-crimson">—</span>
                  {c}
                </li>
              ))}
            </ul>
            <Link
              to="/supply"
              className="eyebrow mt-9 inline-flex items-center gap-2 bg-crimson px-7 py-4 text-bone transition-colors hover:bg-crimson-deep"
            >
              Supply Through Meatlink <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <img
            src={suppliersImg}
            alt="Premium beef export carton with vacuum sealed cuts"
            loading="lazy"
            width={1200}
            height={912}
            className="h-full w-full object-cover opacity-85"
          />
        </div>
      </section>
    </SiteLayout>
  );
}
