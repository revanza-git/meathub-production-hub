import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero, SiteLayout } from "@/components/site/site-layout";
import { useBi } from "@/lib/i18n";
import { GRADE_BANDS, GRADE_HINT, GRADE_LABEL, type GradeBand } from "@/lib/meatlink/catalog";
import { GRADE_IMAGES } from "@/lib/meatlink/featured";

const SAMPLE: Record<GradeBand, string> = {
  UNGRADED: GRADE_IMAGES.UNGRADED,
  MB0_2: GRADE_IMAGES.MB0_2,
  MB2_4: GRADE_IMAGES.MB2_4,
  MB4_6: GRADE_IMAGES.MB4_6,
  MB6_9: GRADE_IMAGES.MB6_9,
  MB9_12: GRADE_IMAGES.MB9_12,
};

export const Route = createFileRoute("/panduan-grade")({
  head: () => ({
    meta: [
      { title: "Panduan Grade Marbling Daging — Meatlink.id" },
      {
        name: "description",
        content:
          "Sampel visual grade marbling daging: Ungraded, MB 0–2, MB 2–4, MB 4–6, MB 6–9 dan MB 9–12, dengan panduan pemakaian per grade.",
      },
      { property: "og:title", content: "Panduan Grade Marbling Daging — Meatlink.id" },
      {
        property: "og:description",
        content: "Kenali perbedaan marbling dari Ungraded sampai MB 9–12 sebelum memesan.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://meatlink.id/panduan-grade" }],
  }),
  component: GradeGuidePage,
});

function GradeGuidePage() {
  const bi = useBi();
  return (
    <SiteLayout>
      <PageHero
        eyebrow={bi("Panduan", "Guide")}
        title={
          <>
            {bi("Grade marbling,", "Marbling grades,")}
            <br />
            <span className="italic text-bone/85">{bi("secara visual.", "seen side by side.")}</span>
          </>
        }
        intro={bi(
          "Marbling adalah sebaran lemak di dalam otot. Makin tinggi angkanya, makin rapat seratnya. Gambar berikut adalah sampel ilustratif — produk asli dapat sedikit berbeda per brand dan cut.",
          "Marbling is the intramuscular fat spread. The higher the number, the denser the threads. The samples below are illustrative — actual product varies slightly by brand and cut.",
        )}
      />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
          {GRADE_BANDS.map((band) => (
            <article key={band} className="bg-background p-6">
              <img
                src={SAMPLE[band]}
                alt={bi(
                  `Sampel marbling grade ${GRADE_LABEL[band]}`,
                  `Marbling sample for grade ${GRADE_LABEL[band]}`,
                )}
                loading="lazy"
                width={640}
                height={640}
                className="aspect-square w-full object-cover"
              />
              <h2 className="mt-5 font-display text-xl text-ink">{GRADE_LABEL[band]}</h2>
              <p className="mt-2 text-sm text-ash">{bi(GRADE_HINT[band].id, GRADE_HINT[band].en)}</p>
              <Link
                to="/produk"
                search={{ grade: [band] }}
                className="mt-4 inline-block text-xs uppercase tracking-[0.14em] text-crimson underline"
              >
                {bi("Lihat produk grade ini", "Browse this grade")}
              </Link>
            </article>
          ))}
        </div>

        <p className="mt-10 max-w-3xl text-sm text-ash">
          {bi(
            "Grade pada katalog diturunkan dari spesifikasi pemasok (mis. MB7, MB9+, A5). Produk grass-fed dan grain-fed tanpa penilaian marbling dicatat sebagai Ungraded.",
            "Catalogue grades come from supplier specifications (e.g. MB7, MB9+, A5). Grass-fed and grain-fed products without a marbling score are recorded as Ungraded.",
          )}
        </p>
      </section>
    </SiteLayout>
  );
}
