import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ClipboardList, Handshake, Search, ShieldCheck, Truck } from "lucide-react";
import { SiteLayout } from "@/components/site/site-layout";
import { CATEGORIES } from "@/lib/meatlink/config";
import { resolveFeatureImage, useFeaturedInventory } from "@/lib/meatlink/featured";
import { formatIdr } from "@/lib/meatlink/inventory";
import heroImg from "@/assets/hero-wagyu.jpg";
import buyersImg from "@/assets/for-buyers.jpg";
import suppliersImg from "@/assets/for-suppliers.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Meatlink.id — B2B Meat Sourcing Network in Indonesia" },
      {
        name: "description",
        content:
          "Meatlink.id is a B2B meat sourcing network. Send one request and our team matches you with verified importers and suppliers across Indonesia.",
      },
      { property: "og:title", content: "Meatlink.id — B2B meat sourcing network" },
      {
        property: "og:description",
        content:
          "One request, matched quotes from verified meat importers and suppliers across Indonesia.",
      },
    ],
  }),
  component: HomePage,
});

const STEPS = [
  {
    icon: ClipboardList,
    title: "Tell us what you need",
    body: "Submit one request with your cut, grade, volume and delivery date. No account required.",
  },
  {
    icon: Search,
    title: "We source the market",
    body: "Our team works the request across verified importers, distributors and specialty suppliers.",
  },
  {
    icon: Handshake,
    title: "You receive matched quotes",
    body: "We come back with the options that genuinely fit your spec, volume and payment terms.",
  },
  {
    icon: Truck,
    title: "Supply gets delivered",
    body: "You deal directly with the supplier we introduce, with Meatlink alongside the relationship.",
  },
];

function HomePage() {
  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-noir text-bone">
        <img
          src={heroImg}
          alt="Premium marbled wagyu ribeye on butcher paper"
          width={1600}
          height={1200}
          className="absolute inset-0 h-full w-full object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-noir via-noir/85 to-noir/30" />
        <div className="relative mx-auto max-w-7xl px-5 py-24 lg:px-8 lg:py-36">
          <div className="max-w-2xl fade-in-up">
            <p className="eyebrow text-crimson">Better Meat | Better Connections</p>
            <h1 className="mt-6 font-display text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">
              The meat you need.
              <br />
              <span className="italic text-bone/85">The connections you don't have.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-relaxed text-bone/70">
              Meatlink.id is a B2B sourcing network for restaurants, hotels, caterers and
              retailers. Send one request — we work our supplier network and come back with the
              quotes that actually match your spec.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/request-quote"
                className="eyebrow inline-flex items-center gap-2 bg-crimson px-7 py-4 text-bone transition-colors hover:bg-crimson-deep"
              >
                Request a Quote <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                to="/supply"
                className="eyebrow inline-flex items-center border border-white/25 px-7 py-4 text-bone transition-colors hover:bg-white/10"
              >
                Supply Through Meatlink
              </Link>
            </div>
          </div>
        </div>

        <div className="relative border-t border-white/10">
          <dl className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-white/10 px-5 lg:grid-cols-4 lg:px-8">
            {[
              ["Verified suppliers", "Importers & distributors we know personally"],
              ["One request", "No account, no browsing, no cold calls"],
              ["Full spec matching", "Cut, grade, origin, volume, terms"],
              ["Nationwide", "Jakarta, Bali and beyond"],
            ].map(([term, desc]) => (
              <div key={term} className="px-4 py-7 first:pl-0 lg:px-8">
                <dt className="eyebrow text-bone">{term}</dt>
                <dd className="mt-2 text-xs leading-relaxed text-bone/50">{desc}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Problem / promise */}
      <section className="bg-bone">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-2 lg:px-8 lg:py-28">
          <div>
            <p className="eyebrow text-crimson">The problem</p>
            <h2 className="mt-5 font-display text-3xl leading-tight sm:text-4xl">
              Sourcing good meat in Indonesia still runs on who you know.
            </h2>
          </div>
          <div className="space-y-6 text-sm leading-relaxed text-ash">
            <p>
              Buyers chase five WhatsApp groups for one price. Specs get lost in translation.
              Quality is inconsistent between deliveries, and the best importers are invisible
              unless someone introduces you.
            </p>
            <p>
              Meatlink exists to replace that scramble with a single, accountable point of contact.
              We already know the importers, the brands, the grades and the realistic price bands —
              so you don't have to build that network from scratch.
            </p>
            <Link
              to="/about"
              className="eyebrow inline-flex items-center gap-2 text-ink hover:text-crimson"
            >
              About Meatlink <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-sand">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
          <p className="eyebrow text-crimson">How it works</p>
          <h2 className="mt-5 max-w-2xl font-display text-3xl leading-tight sm:text-4xl">
            One request. A network working behind it.
          </h2>
          <ol className="mt-14 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <li key={step.title} className="bg-bone p-8">
                <div className="flex items-center justify-between">
                  <step.icon className="h-6 w-6 text-crimson" aria-hidden="true" />
                  <span className="font-display text-3xl text-line">0{i + 1}</span>
                </div>
                <h3 className="mt-6 font-display text-xl">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ash">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Categories */}
      <section className="bg-bone">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-crimson">What we source</p>
              <h2 className="mt-5 font-display text-3xl sm:text-4xl">Categories</h2>
            </div>
            <Link
              to="/request-quote"
              className="eyebrow inline-flex items-center gap-2 text-ink hover:text-crimson"
            >
              Can't see it? Ask anyway <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-12 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((c) => (
              <Link
                key={c.slug}
                to="/request-quote"
                className="group bg-card p-7 transition-colors hover:bg-noir"
              >
                <h3 className="font-display text-2xl text-ink transition-colors group-hover:text-bone">
                  {c.name}
                </h3>
                <p className="mt-3 text-xs leading-relaxed text-ash transition-colors group-hover:text-bone/60">
                  {c.note}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Two audiences */}
      <section className="bg-noir text-bone">
        <div className="mx-auto grid max-w-7xl gap-px bg-white/10 lg:grid-cols-2">
          {[
            {
              img: buyersImg,
              alt: "Chef slicing premium beef in a dark restaurant kitchen",
              eyebrow: "For buyers",
              title: "Stop chasing suppliers",
              body: "Restaurants, hotels, caterers and retailers get one contact, matched quotes and consistent spec — instead of a group chat full of guesses.",
              to: "/buyers" as const,
              cta: "How sourcing works",
            },
            {
              img: suppliersImg,
              alt: "Premium beef export carton with vacuum sealed cuts",
              eyebrow: "For suppliers",
              title: "Reach qualified demand",
              body: "Importers and distributors receive pre-qualified requests with real volume and spec, not tyre-kickers. Listing is free.",
              to: "/suppliers" as const,
              cta: "Why supply with us",
            },
          ].map((panel) => (
            <article key={panel.eyebrow} className="bg-noir">
              <img
                src={panel.img}
                alt={panel.alt}
                loading="lazy"
                width={1200}
                height={912}
                className="h-64 w-full object-cover opacity-80 lg:h-80"
              />
              <div className="p-8 lg:p-12">
                <p className="eyebrow text-crimson">{panel.eyebrow}</p>
                <h2 className="mt-5 font-display text-3xl">{panel.title}</h2>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-bone/65">{panel.body}</p>
                <Link
                  to={panel.to}
                  className="eyebrow mt-7 inline-flex items-center gap-2 text-bone hover:text-crimson"
                >
                  {panel.cta} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Market insights */}
      <FeaturedStock />


      {/* Trust */}
      <section className="bg-sand">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 lg:grid-cols-3 lg:px-8">
          {[
            {
              icon: ShieldCheck,
              title: "Verified network",
              body: "Every supplier is vetted on legitimacy, cold chain and consistency before we introduce them.",
            },
            {
              icon: Handshake,
              title: "Neutral by design",
              body: "We match on fit, not on who pays us the most. Your spec leads the conversation.",
            },
            {
              icon: Truck,
              title: "Built by operators",
              body: "Meatlink is built alongside EV Butchers — people who move product daily, not a directory.",
            },
          ].map((t) => (
            <div key={t.title}>
              <t.icon className="h-7 w-7 text-crimson" aria-hidden="true" />
              <h2 className="mt-5 font-display text-2xl">{t.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-ash">{t.body}</p>
            </div>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}

function FeaturedStock() {
  const { data: items = [] } = useFeaturedInventory(3);
  if (items.length === 0) return null;
  return (
    <section className="bg-bone">
      <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-crimson">Market insights</p>
            <h2 className="mt-5 font-display text-3xl sm:text-4xl">Recently sourced</h2>
          </div>
          <Link to="/insights" className="eyebrow text-ink hover:text-crimson">
            View all insights
          </Link>
        </div>
        <div className="mt-12 grid gap-px border border-line bg-line lg:grid-cols-3">
          {items.map((item) => (
            <article key={item.id} className="bg-card">
              <img
                src={resolveFeatureImage(item.image_url)}
                alt={item.name}
                loading="lazy"
                width={1200}
                height={900}
                className="h-56 w-full object-cover"
              />
              <div className="p-8">
                <p className="eyebrow text-crimson">{item.origin}</p>
                <h3 className="mt-4 font-display text-2xl leading-snug">{item.name}</h3>
                <dl className="mt-6 space-y-2 text-xs text-ash">
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
                    <dd className="text-crimson">{formatIdr(item.public_price_idr)} / kg</dd>
                  </div>
                </dl>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
