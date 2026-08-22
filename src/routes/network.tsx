import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { PageHero, SiteLayout } from "@/components/site/site-layout";
import buyersImg from "@/assets/for-buyers.jpg";
import suppliersImg from "@/assets/for-suppliers.jpg";

export const Route = createFileRoute("/network")({
  head: () => ({
    meta: [
      { title: "Buyers & Suppliers — How the Meatlink.id network works" },
      {
        name: "description",
        content:
          "One page for both sides of the Meatlink network: how HORECA and retail buyers source meat on spec, and how importers, distributors and producers receive qualified demand.",
      },
      { property: "og:title", content: "Buyers & Suppliers — Meatlink.id" },
      {
        property: "og:description",
        content:
          "Buyers send one brief and get matched quotes. Suppliers receive pre-qualified demand with real spec and volume.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NetworkPage,
});

const PAINS = [
  ["Five chats, one price", "Every order becomes a manual hunt across brokers and group chats."],
  ["Spec drift", "What arrives isn't always the grade, origin or trim you agreed on."],
  ["No leverage", "Without market visibility you can't tell a fair price from a padded one."],
  ["Supply gaps", "When your regular supplier runs out, you start from zero."],
];

const GAINS = [
  ["One point of contact", "Send the spec once. We handle the outreach and follow-up."],
  ["Matched, not listed", "You get shortlisted suppliers who actually carry your grade and volume."],
  ["Price context", "We tell you where your target price sits against the current market."],
  ["Backup supply", "A verified second source when your primary can't deliver."],
];

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

function NetworkPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Buyers & suppliers"
        title={
          <>
            Two sides of one network,
            <br />
            <span className="italic text-bone/85">matched on spec.</span>
          </>
        }
        intro="Buyers send a single brief and get matched with vetted suppliers. Suppliers receive real demand instead of cold leads."
      />

      <nav
        aria-label="Sections"
        className="border-b border-line bg-bone"
      >
        <div className="mx-auto flex max-w-7xl gap-6 px-5 py-4 lg:px-8">
          <a href="#buyers" className="eyebrow text-ash transition-colors hover:text-crimson">
            For buyers
          </a>
          <a href="#suppliers" className="eyebrow text-ash transition-colors hover:text-crimson">
            For suppliers
          </a>
        </div>
      </nav>

      <section id="buyers" className="scroll-mt-24 bg-bone">
        <div className="mx-auto max-w-7xl px-5 pt-16 lg:px-8">
          <p className="eyebrow text-crimson">For buyers</p>
          <h2 className="mt-4 max-w-3xl font-display text-3xl sm:text-4xl">
            Sourcing that works like a buying team, not a directory.
          </h2>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ash">
            Built for chefs, purchasing managers and owners who need the right cut, at the right
            grade, on the day they need it.
          </p>
        </div>
        <div className="mx-auto mt-12 grid max-w-7xl gap-px border-y border-line bg-line lg:grid-cols-2">
          <div className="bg-bone p-8 lg:p-14">
            <p className="eyebrow text-crimson">What you deal with today</p>
            <ul className="mt-8 space-y-7">
              {PAINS.map(([title, body]) => (
                <li key={title}>
                  <h3 className="font-display text-xl">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ash">{body}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-noir p-8 text-bone lg:p-14">
            <p className="eyebrow text-crimson">What Meatlink gives you</p>
            <ul className="mt-8 space-y-7">
              {GAINS.map(([title, body]) => (
                <li key={title}>
                  <h3 className="font-display text-xl">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-bone/60">{body}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-sand">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 lg:grid-cols-2 lg:px-8">
          <img
            src={buyersImg}
            alt="Chef slicing premium beef in a professional kitchen"
            loading="lazy"
            width={1200}
            height={912}
            className="h-full w-full object-cover"
          />
          <div>
            <p className="eyebrow text-crimson">Who we serve</p>
            <h2 className="mt-5 font-display text-3xl sm:text-4xl">
              Fine dining, hotel groups, caterers, butchers and specialty retail.
            </h2>
            <p className="mt-6 text-sm leading-relaxed text-ash">
              Whether you need 40 kg of wagyu a month for a single restaurant or a repeatable
              programme across multiple outlets, the process is the same: one brief, matched
              suppliers, a relationship you keep.
            </p>
            <Link
              to="/request-quote"
              className="eyebrow mt-8 inline-flex items-center gap-2 bg-crimson px-7 py-4 text-bone transition-colors hover:bg-crimson-deep"
            >
              Request a Quote <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section id="suppliers" className="scroll-mt-24 bg-bone">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
          <p className="eyebrow text-crimson">For suppliers</p>
          <h2 className="mt-4 max-w-3xl font-display text-3xl sm:text-4xl">
            Qualified buyers, matched to what you carry.
          </h2>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ash">
            Meatlink routes real buying requests from restaurants, hotels and retailers to the
            suppliers who can genuinely fill them.
          </p>
          <div className="mt-12 grid gap-px border border-line bg-line sm:grid-cols-2">
            {BENEFITS.map((b) => (
              <article key={b.title} className="bg-card p-8 lg:p-10">
                <h3 className="font-display text-2xl">{b.title}</h3>
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
            <h2 className="mt-5 font-display text-3xl sm:text-4xl">We vet before we introduce.</h2>
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
