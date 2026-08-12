import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { PageHero, SiteLayout } from "@/components/site/site-layout";
import buyersImg from "@/assets/for-buyers.jpg";

export const Route = createFileRoute("/buyers")({
  head: () => ({
    meta: [
      { title: "For Buyers — Meatlink.id sourcing for HORECA and retail" },
      {
        name: "description",
        content:
          "Restaurants, hotels, caterers and retailers: send one request and Meatlink matches you with verified meat suppliers on spec, volume and terms.",
      },
      { property: "og:title", content: "For Buyers — Meatlink.id" },
      {
        property: "og:description",
        content: "One request, matched quotes from verified meat suppliers across Indonesia.",
      },
    ],
  }),
  component: BuyersPage,
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

function BuyersPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="For buyers"
        title={
          <>
            Sourcing that works like a<br />
            <span className="italic text-bone/85">buying team, not a directory.</span>
          </>
        }
        intro="Meatlink is built for chefs, purchasing managers and owners who need the right cut, at the right grade, on the day they need it."
      />

      <section className="bg-bone">
        <div className="mx-auto grid max-w-7xl gap-px border-y border-line bg-line lg:grid-cols-2">
          <div className="bg-bone p-8 lg:p-14">
            <p className="eyebrow text-crimson">What you deal with today</p>
            <ul className="mt-8 space-y-7">
              {PAINS.map(([title, body]) => (
                <li key={title}>
                  <h2 className="font-display text-xl">{title}</h2>
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
                  <h2 className="font-display text-xl">{title}</h2>
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
    </SiteLayout>
  );
}
