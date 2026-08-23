import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero, SiteLayout } from "@/components/site/site-layout";
import heroImg from "@/assets/hero-wagyu.jpg";
import { useBi } from "@/lib/i18n";

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

function AboutPage() {
  const bi = useBi();
  const values = [
    [
      bi("Spesifikasi jujur", "Honest specifications"),
      bi(
        "Kami menjelaskan produk sesuai kondisi saat diterima — grade, asal, trim, dan yield.",
        "We describe products as they actually arrive — grade, origin, trim and yield.",
      ),
    ],
    [
      bi("Pencocokan netral", "Neutral matching"),
      bi(
        "Produk yang paling sesuai dengan kebutuhan Anda yang diprioritaskan, bukan pemasok dengan promosi paling keras.",
        "The best fit for your brief wins, not the supplier with the loudest pitch.",
      ),
    ],
    [
      bi("Hubungan jangka panjang", "Long-term relationships"),
      bi(
        "Kami membangun jaringan yang kembali digunakan, bukan sekadar mesin prospek satu kali.",
        "We're building a network people return to, not a one-off lead engine.",
      ),
    ],
  ];

  return (
    <SiteLayout>
      <PageHero
        eyebrow={bi("Tentang kami", "About us")}
        title={
          <>
            {bi("Daging lebih baik.", "Better meat.")}
            <br />
            <span className="italic text-bone/85">
              {bi("Koneksi lebih baik.", "Better connections.")}
            </span>
          </>
        }
        intro={bi(
          "Meatlink.id didirikan untuk memperbaiki cara daging premium diperoleh di Indonesia: secara personal, transparan, dan tanpa ketidakpastian.",
          "Meatlink.id was founded to improve how premium meat is sourced in Indonesia: personally, transparently and without the guesswork.",
        )}
      />

      <section className="bg-bone">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="eyebrow text-crimson">{bi("Cerita kami", "Our story")}</p>
            <h2 className="mt-5 font-display text-3xl sm:text-4xl">
              {bi(
                "Dibangun bersama orang-orang yang menangani produk setiap hari.",
                "Built alongside people who handle products daily.",
              )}
            </h2>
            <div className="mt-6 space-y-5 text-sm leading-relaxed text-ash">
              <p>
                {bi(
                  "Meatlink tumbuh dari pengalaman langsung bersama EV Butchers — memotong, menilai grade, dan mengirimkan daging premium ke dapur dengan standar tinggi. Pengalaman itu menunjukkan satu hal: hambatan dalam pasokan daging Indonesia bukan produknya, melainkan koneksinya.",
                  "Meatlink grew out of hands-on trade experience with EV Butchers — cutting, grading and delivering premium meat to demanding kitchens. That work made one thing obvious: the bottleneck in Indonesian meat supply isn't product, it's connection.",
                )}
              </p>
              <p>
                {bi(
                  "Pembeli sulit mengetahui siapa yang benar-benar memiliki stok yang dibutuhkan. Importir berkualitas pun sulit menemukan pembeli yang serius. Meatlink hadir sebagai penghubung yang memahami kedua sisi dan mempertemukan kebutuhan yang tepat.",
                  "Buyers can't see who really carries what. Good importers can't see who's genuinely buying. Meatlink sits in the middle as a human layer that knows both sides and makes the introduction that fits.",
                )}
              </p>
              <p>
                {bi(
                  "Kami memulainya dengan sederhana: satu formulir permintaan, satu tim yang mengelola jaringan, dan jawaban nyata. Tanpa kerumitan yang tidak diperlukan.",
                  "We're starting deliberately simple: one request form, one team working the network, real answers. No marketplace theatre.",
                )}
              </p>
            </div>
          </div>
          <img
            src={heroImg}
            alt={bi("Potongan daging sapi marbling premium di atas kertas butcher", "Premium marbled beef cut on butcher paper")}
            loading="lazy"
            width={1600}
            height={1200}
            className="h-full w-full object-cover"
          />
        </div>
      </section>

      <section className="bg-noir text-bone">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <p className="eyebrow text-crimson">{bi("Prinsip kami", "What we stand for")}</p>
          <div className="mt-12 grid gap-px bg-white/10 lg:grid-cols-3">
            {values.map(([title, body]) => (
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
              {bi("Minta Penawaran", "Request a Quote")}
            </Link>
            <Link
              to="/contact"
              className="eyebrow border border-white/25 px-7 py-4 text-bone transition-colors hover:bg-white/10"
            >
              {bi("Hubungi kami", "Talk to us")}
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
