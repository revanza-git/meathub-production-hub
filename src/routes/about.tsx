import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero, SiteLayout } from "@/components/site/site-layout";
import heroImg from "@/assets/hero-wagyu.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Meatlink.id — Better Meat, Better Connections" },
      {
        name: "description",
        content:
          "Meatlink.id is a B2B meat sourcing network built by operators, connecting Indonesian buyers with verified importers and suppliers.",
      },
      { property: "og:title", content: "About Meatlink.id" },
      {
        property: "og:description",
        content: "A sourcing network built by people who move premium meat every day.",
      },
    ],
  }),
  component: AboutPage,
});

const VALUES = [
  ["Honest spec", "We describe product the way it actually arrives — grade, origin, trim, yield."],
  ["Neutral matching", "The best fit for your brief wins, not the supplier with the loudest pitch."],
  ["Long relationships", "We're building a network that people return to, not a one-off lead engine."],
];

function AboutPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="About us"
        title={
          <>
            Better meat.
            <br />
            <span className="italic text-bone/85">Better connections.</span>
          </>
        }
        intro="Meatlink.id was founded to fix how premium meat is sourced in Indonesia: personally, transparently and without the guesswork."
      />

      <section className="bg-bone">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="eyebrow text-crimson">Our story</p>
            <h2 className="mt-5 font-display text-3xl sm:text-4xl">
              Built alongside people who handle product daily.
            </h2>
            <div className="mt-6 space-y-5 text-sm leading-relaxed text-ash">
              <p>
                Meatlink grew out of hands-on trade experience with EV Butchers — cutting, grading
                and delivering premium meat to demanding kitchens. That work made one thing obvious:
                the bottleneck in Indonesian meat supply isn't product, it's connection.
              </p>
              <p>
                Buyers can't see who really carries what. Good importers can't see who's genuinely
                buying. Meatlink sits in the middle as a human layer that knows both sides and makes
                the introduction that fits.
              </p>
              <p>
                We're starting deliberately simple: one request form, one team working the network,
                real answers. No marketplace theatre.
              </p>
            </div>
          </div>
          <img
            src={heroImg}
            alt="Premium marbled beef cut on butcher paper"
            loading="lazy"
            width={1600}
            height={1200}
            className="h-full w-full object-cover"
          />
        </div>
      </section>

      <section className="bg-noir text-bone">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <p className="eyebrow text-crimson">What we stand for</p>
          <div className="mt-12 grid gap-px bg-white/10 lg:grid-cols-3">
            {VALUES.map(([title, body]) => (
              <div key={title} className="bg-noir p-8">
                <h2 className="font-display text-2xl">{title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-bone/60">{body}</p>
              </div>
            ))}
          </div>
          <div className="mt-14 flex flex-wrap gap-3">
            <Link
              to="/request-quote"
              className="eyebrow bg-crimson px-7 py-4 text-bone transition-colors hover:bg-crimson-deep"
            >
              Request a Quote
            </Link>
            <Link
              to="/contact"
              className="eyebrow border border-white/25 px-7 py-4 text-bone transition-colors hover:bg-white/10"
            >
              Talk to us
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
