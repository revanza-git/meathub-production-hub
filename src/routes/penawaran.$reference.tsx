import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Clock3, MessageCircle } from "lucide-react";
import { SiteLayout } from "@/components/site/site-layout";
import { useBi } from "@/lib/i18n";
import { waLink } from "@/lib/meatlink/config";
import { getTrackedRfq } from "@/lib/meatlink/rfq.functions";

const searchSchema = z.object({ token: z.string().catch("") });

export const Route = createFileRoute("/penawaran/$reference")({
  validateSearch: searchSchema,
  component: TrackedQuotePage,
  head: () => ({
    meta: [
      { title: "Status Permintaan Penawaran — Meatlink" },
      {
        name: "description",
        content: "Lihat status dan respons permintaan penawaran Meatlink melalui tautan privat.",
      },
      { property: "og:title", content: "Status Permintaan Penawaran — Meatlink" },
      {
        property: "og:description",
        content: "Lihat perkembangan permintaan penawaran Meatlink Anda.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

type Item = {
  product_cut?: string;
  grade?: string;
  volume?: string;
  origin_preference?: string;
  brand_preference?: string;
};
const statusLabels: Record<string, [string, string]> = {
  new: ["Diterima", "Received"],
  in_review: ["Sedang ditinjau", "In review"],
  quoted: ["Penawaran tersedia", "Quote available"],
  won: ["Dikonfirmasi", "Confirmed"],
  lost: ["Ditutup", "Closed"],
};

function TrackedQuotePage() {
  const { reference } = Route.useParams();
  const { token } = Route.useSearch();
  const getRequest = useServerFn(getTrackedRfq);
  const bi = useBi();
  const query = useQuery({
    queryKey: ["tracked-rfq", reference, token],
    enabled: Boolean(token),
    retry: false,
    queryFn: () => getRequest({ data: { referenceNo: reference, token } }),
  });

  return (
    <SiteLayout>
      <main className="bg-bone px-5 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-3xl">
          <p className="eyebrow text-crimson">{bi("Status penawaran", "Quote status")}</p>
          <h1 className="mt-3 font-display text-4xl text-ink sm:text-5xl">{reference}</h1>
          {!token || query.error ? (
            <div className="mt-8 border border-line bg-card p-7">
              <h2 className="font-display text-2xl text-ink">
                {bi("Tautan tidak dapat dibuka", "This link cannot be opened")}
              </h2>
              <p className="mt-3 text-sm text-ash">
                {bi(
                  "Pastikan Anda menggunakan tautan lengkap yang diberikan setelah mengirim permintaan atau melalui email Meatlink.",
                  "Use the complete link provided after submission or in your Meatlink email.",
                )}
              </p>
            </div>
          ) : query.isLoading ? (
            <p className="mt-8 text-sm text-ash">{bi("Memuat permintaan…", "Loading request…")}</p>
          ) : query.data ? (
            <div className="mt-8 grid gap-5">
              <section className="border border-line bg-card p-6 sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="font-display text-2xl text-ink">{query.data.company_name}</h2>
                    <p className="mt-2 text-sm text-ash">
                      {bi("Tujuan", "Deliver to")}: {query.data.delivery_location} ·{" "}
                      {bi("Dibutuhkan", "Needed")}: {query.data.required_delivery_date}
                    </p>
                  </div>
                  <span className="eyebrow border border-crimson px-3 py-2 text-crimson">
                    {bi(
                      ...(statusLabels[query.data.status] ?? [
                        query.data.status,
                        query.data.status,
                      ]),
                    )}
                  </span>
                </div>
                <ul className="mt-6 grid gap-2 border-t border-line pt-5">
                  {((query.data.items ?? []) as Item[]).map((item, index) => (
                    <li key={`${item.product_cut}-${index}`} className="text-sm text-ink">
                      <span className="text-ash">{index + 1}.</span> {item.product_cut}
                      {item.grade ? ` (${item.grade})` : ""} — {item.volume}
                    </li>
                  ))}
                </ul>
              </section>
              <section className="border border-line bg-card p-6 sm:p-8">
                <div className="flex items-center gap-2 text-crimson">
                  <Clock3 className="h-4 w-4" aria-hidden="true" />
                  <p className="eyebrow">{bi("Respons Meatlink", "Meatlink response")}</p>
                </div>
                {query.data.admin_response ? (
                  <>
                    <p className="mt-5 whitespace-pre-line text-sm leading-7 text-ink">
                      {query.data.admin_response}
                    </p>
                    {query.data.response_valid_until ? (
                      <p className="mt-5 text-xs text-ash">
                        {bi("Berlaku hingga", "Valid until")} {query.data.response_valid_until}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="mt-5 text-sm leading-7 text-ash">
                    {bi(
                      "Tim sourcing sedang meninjau kebutuhan Anda. Respons akan muncul di halaman ini setelah tersedia.",
                      "Our sourcing team is reviewing your requirements. The response will appear here when ready.",
                    )}
                  </p>
                )}
              </section>
              <div className="flex flex-col gap-3 sm:flex-row">
                <a
                  href={waLink(`Halo Meatlink, saya ingin menindaklanjuti ${reference}.`)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="eyebrow inline-flex items-center justify-center gap-2 bg-crimson px-6 py-4 text-bone"
                >
                  <MessageCircle className="h-4 w-4" />
                  {bi("Tanyakan via WhatsApp", "Ask via WhatsApp")}
                </a>
                <Link
                  to="/produk"
                  className="eyebrow inline-flex justify-center border border-line px-6 py-4 text-ink hover:border-crimson"
                >
                  {bi("Lihat produk", "Browse products")}
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </SiteLayout>
  );
}
