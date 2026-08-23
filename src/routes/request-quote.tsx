import { createFileRoute } from "@tanstack/react-router";
import { useBi } from "@/lib/i18n";
import { PageHero, SiteLayout } from "@/components/site/site-layout";
import { RfqForm } from "@/components/site/rfq-form";

export const Route = createFileRoute("/request-quote")({
  head: () => ({
    meta: [
      { title: "Request a Quote — Meatlink.id meat sourcing" },
      {
        name: "description",
        content:
          "Tell Meatlink what meat you need — cut, grade, origin, volume and delivery date — and our team returns matched quotes from verified suppliers.",
      },
      { property: "og:title", content: "Request a Quote — Meatlink.id" },
      {
        property: "og:description",
        content: "Send one sourcing brief. Get matched supplier quotes. No account needed.",
      },
    ],
  }),
  component: RequestQuotePage,
});

function RequestQuotePage() {
  const bi = useBi();
  return (
    <SiteLayout>
      <PageHero
        eyebrow={bi("Minta penawaran", "Request a quote")}
        title={bi("Ceritakan kebutuhan Anda.", "Tell us what you need.")}
        intro={bi(
          "Makin detail informasinya, makin tepat penawaran yang kami cocokkan. Pengisian hanya sekitar dua menit.",
          "The more detail you give, the sharper the match. Everything below takes about two minutes.",
        )}
      />
      <section className="bg-bone">
        <div className="mx-auto max-w-4xl px-5 py-16 lg:px-8 lg:py-20">
          <RfqForm />
        </div>
      </section>
    </SiteLayout>
  );
}
