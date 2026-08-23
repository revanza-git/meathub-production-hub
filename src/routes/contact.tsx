import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, MessageCircle, MapPin } from "lucide-react";
import { PageHero, SiteLayout } from "@/components/site/site-layout";
import { useBi } from "@/lib/i18n";
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
  const bi = useBi();

  return (
    <SiteLayout>
      <PageHero
        eyebrow={bi("Kontak", "Contact")}
        title={bi("Bicarakan kebutuhan Anda dengan tim kami.", "Talk to our sourcing team.")}
        intro={bi(
          "Untuk produk tertentu, kirim permintaan penawaran agar tim kami menerima spesifikasi yang dibutuhkan. Untuk keperluan lainnya, hubungi kami melalui kanal berikut.",
          "For a specific product, send an RFQ — it reaches us with the detail we need. For anything else, use the channels below.",
        )}
      />

      <section className="bg-bone">
        <div className="mx-auto grid max-w-7xl gap-px border-y border-line bg-line lg:grid-cols-3">
          <a
            href={waLink(
              bi(
                "Halo Meatlink, saya ingin mendiskusikan kebutuhan produk.",
                "Hi Meatlink, I'd like to discuss my sourcing needs.",
              ),
            )}
            target="_blank"
            rel="noreferrer noopener"
            className="group bg-card p-10 transition-colors hover:bg-noir"
          >
            <MessageCircle className="h-7 w-7 text-crimson" aria-hidden="true" />
            <h2 className="mt-6 font-display text-2xl text-ink group-hover:text-bone">WhatsApp</h2>
            <p className="mt-3 text-sm text-ash group-hover:text-bone/60">
              {bi(
                "Cara tercepat menghubungi tim kami selama jam operasional.",
                "The fastest way to reach our team during business hours.",
              )}
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
            <h2 className="mt-6 font-display text-2xl">
              {bi("Wilayah layanan", "Where we operate")}
            </h2>
            <p className="mt-3 text-sm text-ash">
              {bi(
                "Berbasis di Jakarta dan Bali, melayani pembeli dan pemasok di seluruh Indonesia.",
                "Based in Jakarta and Bali, serving buyers and suppliers across Indonesia.",
              )}
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <h2 className="font-display text-3xl">
            {bi("Sudah memiliki produk tertentu dalam pikiran?", "Have a specific product in mind?")}
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-ash">
            {bi(
              "Kirim permintaan penawaran dengan spesifikasi, volume, dan waktu yang dibutuhkan agar respons pertama kami langsung relevan.",
              "Submitting an RFQ gives us the specification, volume and timing up front, so the first reply you receive is already useful.",
            )}
          </p>
          <Link
            to="/request-quote"
            className="eyebrow mt-8 inline-flex bg-crimson px-7 py-4 text-bone transition-colors hover:bg-crimson-deep"
          >
            {bi("Minta Penawaran", "Request a Quote")}
          </Link>
        </div>
      </section>
    </SiteLayout>
  );
}
