import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, MessageCircle, MapPin } from "lucide-react";
import { PageHero, SiteLayout } from "@/components/site/site-layout";
import { CONTACT_EMAIL, waLink } from "@/lib/meatlink/config";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Meatlink.id — talk to our sourcing team" },
      {
        name: "description",
        content:
          "Reach the Meatlink.id sourcing team by WhatsApp or email for B2B meat buying and supplier enquiries in Indonesia.",
      },
      { property: "og:title", content: "Contact Meatlink.id" },
      {
        property: "og:description",
        content: "Talk to the Meatlink sourcing team by WhatsApp or email.",
      },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Contact"
        title="Talk to our sourcing team."
        intro="For a specific product, send an RFQ — it reaches us with the detail we need. For anything else, use the channels below."
      />

      <section className="bg-bone">
        <div className="mx-auto grid max-w-7xl gap-px border-y border-line bg-line lg:grid-cols-3">
          <a
            href={waLink("Hi Meatlink, I'd like to talk about sourcing.")}
            target="_blank"
            rel="noreferrer noopener"
            className="group bg-card p-10 transition-colors hover:bg-noir"
          >
            <MessageCircle className="h-7 w-7 text-crimson" aria-hidden="true" />
            <h2 className="mt-6 font-display text-2xl text-ink group-hover:text-bone">WhatsApp</h2>
            <p className="mt-3 text-sm text-ash group-hover:text-bone/60">
              Fastest route to our team during business hours.
            </p>
          </a>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="group bg-card p-10 transition-colors hover:bg-noir"
          >
            <Mail className="h-7 w-7 text-crimson" aria-hidden="true" />
            <h2 className="mt-6 font-display text-2xl text-ink group-hover:text-bone">Email</h2>
            <p className="mt-3 text-sm text-ash group-hover:text-bone/60">{CONTACT_EMAIL}</p>
          </a>
          <div className="bg-card p-10">
            <MapPin className="h-7 w-7 text-crimson" aria-hidden="true" />
            <h2 className="mt-6 font-display text-2xl">Where we operate</h2>
            <p className="mt-3 text-sm text-ash">
              Jakarta and Bali, serving buyers and suppliers across Indonesia.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <h2 className="font-display text-3xl">Have a specific product in mind?</h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-ash">
            Submitting an RFQ gives us the spec, volume and timing up front, so the first reply you
            get is already useful.
          </p>
          <Link
            to="/request-quote"
            className="eyebrow mt-8 inline-flex bg-crimson px-7 py-4 text-bone transition-colors hover:bg-crimson-deep"
          >
            Request a Quote
          </Link>
        </div>
      </section>
    </SiteLayout>
  );
}
