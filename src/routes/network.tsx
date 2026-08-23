import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { PageHero, SiteLayout } from "@/components/site/site-layout";
import { useBi } from "@/lib/i18n";
import buyersImg from "@/assets/for-buyers.jpg";
import suppliersImg from "@/assets/for-suppliers.jpg";

export const Route = createFileRoute("/network")({
  head: () => ({
    meta: [
      { title: "Pembeli & Pemasok — Cara jaringan Meatlink.id bekerja" },
      {
        name: "description",
        content:
          "Satu halaman untuk kedua sisi jaringan Meatlink: bagaimana pembeli HORECA dan ritel mencari daging sesuai spesifikasi, dan bagaimana importir, distributor, dan produsen menerima permintaan yang terkualifikasi.",
      },
      { property: "og:title", content: "Pembeli & Pemasok — Meatlink.id" },
      {
        property: "og:description",
        content:
          "Pembeli mengirim satu brief dan mendapat penawaran yang cocok. Pemasok menerima permintaan nyata dengan spesifikasi dan volume jelas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NetworkPage,
});

type Pair = [string, string];

function NetworkPage() {
  const bi = useBi();

  const PAINS: Pair[] = [
    [
      bi("Lima obrolan, satu harga", "Five chats, one price"),
      bi(
        "Setiap pesanan berubah jadi perburuan manual lewat broker dan grup chat.",
        "Every order becomes a manual hunt across brokers and group chats.",
      ),
    ],
    [
      bi("Spesifikasi meleset", "Spec drift"),
      bi(
        "Barang yang datang tidak selalu sesuai grade, origin, atau trim yang disepakati.",
        "What arrives isn't always the grade, origin or trim you agreed on.",
      ),
    ],
    [
      bi("Tanpa posisi tawar", "No leverage"),
      bi(
        "Tanpa visibilitas pasar, sulit membedakan harga wajar dan harga yang digelembungkan.",
        "Without market visibility you can't tell a fair price from a padded one.",
      ),
    ],
    [
      bi("Pasokan kosong", "Supply gaps"),
      bi(
        "Saat pemasok langganan kehabisan stok, Anda mulai dari nol lagi.",
        "When your regular supplier runs out, you start from zero.",
      ),
    ],
  ];

  const GAINS: Pair[] = [
    [
      bi("Satu titik kontak", "One point of contact"),
      bi(
        "Kirim spesifikasi sekali. Kami yang menghubungi dan menindaklanjuti pemasok.",
        "Send the spec once. We handle the outreach and follow-up.",
      ),
    ],
    [
      bi("Dicocokkan, bukan sekadar daftar", "Matched, not listed"),
      bi(
        "Anda mendapat pemasok terpilih yang benar-benar punya grade dan volume Anda.",
        "You get shortlisted suppliers who actually carry your grade and volume.",
      ),
    ],
    [
      bi("Konteks harga", "Price context"),
      bi(
        "Kami beri tahu posisi target harga Anda dibanding kondisi pasar terkini.",
        "We tell you where your target price sits against the current market.",
      ),
    ],
    [
      bi("Pasokan cadangan", "Backup supply"),
      bi(
        "Sumber kedua yang terverifikasi saat pemasok utama tidak bisa mengirim.",
        "A verified second source when your primary can't deliver.",
      ),
    ],
  ];

  const BENEFITS: Pair[] = [
    [
      bi("Hanya permintaan terkualifikasi", "Qualified demand only"),
      bi(
        "Setiap permintaan yang kami teruskan punya nama bisnis, spesifikasi, volume, dan tanggal kirim.",
        "Every request we pass on has a named business, a spec, a volume and a delivery date attached.",
      ),
    ],
    [
      bi("Tanpa biaya pendaftaran", "No listing fees"),
      bi(
        "Bergabung dengan jaringan ini gratis. Kami dibayar atas hasil, bukan atas eksposur.",
        "Joining the network costs nothing. We're paid on the outcome, not on exposure.",
      ),
    ],
    [
      bi("Relasi tetap milik Anda", "You keep the relationship"),
      bi(
        "Kami memperkenalkan dan tetap mendampingi, tetapi kesepakatan pasokan ada antara Anda dan pembeli.",
        "We introduce and stay available, but the supply agreement is between you and the buyer.",
      ),
    ],
    [
      bi("Isi celah stok Anda", "Fill your gaps"),
      bi(
        "Salurkan SKU yang lambat berputar dan alokasi berlebih ke pembeli yang sedang mencarinya.",
        "Move slow-turning SKUs and surplus allocation to buyers actively looking for them.",
      ),
    ],
  ];

  const CRITERIA = [
    bi(
      "Bisnis resmi dan terdaftar dengan sumber yang dapat ditelusuri",
      "Legitimate, registered business with traceable sourcing",
    ),
    bi(
      "Rantai dingin terdokumentasi dari penyimpanan sampai pengiriman",
      "Documented cold chain from storage to delivery",
    ),
    bi(
      "Grading konsisten dan representasi spesifikasi yang jujur",
      "Consistent grading and honest spec representation",
    ),
    bi("Kapasitas melayani volume B2B berulang", "Capacity to serve repeat B2B volume"),
  ];

  return (
    <SiteLayout>
      <PageHero
        eyebrow={bi("Pembeli & pemasok", "Buyers & suppliers")}
        title={
          <>
            {bi("Dua sisi satu jaringan,", "Two sides of one network,")}
            <br />
            <span className="italic text-bone/85">
              {bi("dicocokkan pada spesifikasi.", "matched on spec.")}
            </span>
          </>
        }
        intro={bi(
          "Pembeli mengirim satu brief dan dicocokkan dengan pemasok terverifikasi. Pemasok menerima permintaan nyata, bukan sekadar lead dingin.",
          "Buyers send a single brief and get matched with vetted suppliers. Suppliers receive real demand instead of cold leads.",
        )}
      />

      <nav aria-label={bi("Bagian", "Sections")} className="border-b border-line bg-bone">
        <div className="mx-auto flex max-w-7xl gap-6 px-5 py-4 lg:px-8">
          <a href="#buyers" className="eyebrow text-ash transition-colors hover:text-crimson">
            {bi("Untuk pembeli", "For buyers")}
          </a>
          <a href="#suppliers" className="eyebrow text-ash transition-colors hover:text-crimson">
            {bi("Untuk pemasok", "For suppliers")}
          </a>
        </div>
      </nav>

      <section id="buyers" className="scroll-mt-24 bg-bone">
        <div className="mx-auto max-w-7xl px-5 pt-16 lg:px-8">
          <p className="eyebrow text-crimson">{bi("Untuk pembeli", "For buyers")}</p>
          <h2 className="mt-4 max-w-3xl font-display text-3xl sm:text-4xl">
            {bi(
              "Pengadaan yang bekerja seperti tim pembelian, bukan direktori.",
              "Sourcing that works like a buying team, not a directory.",
            )}
          </h2>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ash">
            {bi(
              "Dibuat untuk chef, manajer pembelian, dan pemilik usaha yang butuh potongan tepat, grade tepat, pada hari yang mereka butuhkan.",
              "Built for chefs, purchasing managers and owners who need the right cut, at the right grade, on the day they need it.",
            )}
          </p>
        </div>
        <div className="mx-auto mt-12 grid max-w-7xl gap-px border-y border-line bg-line lg:grid-cols-2">
          <div className="bg-bone p-8 lg:p-14">
            <p className="eyebrow text-crimson">
              {bi("Yang Anda hadapi hari ini", "What you deal with today")}
            </p>
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
            <p className="eyebrow text-crimson">
              {bi("Yang Meatlink berikan", "What Meatlink gives you")}
            </p>
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
            alt={bi(
              "Chef memotong daging sapi premium di dapur profesional",
              "Chef slicing premium beef in a professional kitchen",
            )}
            loading="lazy"
            width={1200}
            height={912}
            className="h-full w-full object-cover"
          />
          <div>
            <p className="eyebrow text-crimson">{bi("Siapa yang kami layani", "Who we serve")}</p>
            <h2 className="mt-5 font-display text-3xl sm:text-4xl">
              {bi(
                "Fine dining, grup hotel, katering, butcher, dan ritel spesialis.",
                "Fine dining, hotel groups, caterers, butchers and specialty retail.",
              )}
            </h2>
            <p className="mt-6 text-sm leading-relaxed text-ash">
              {bi(
                "Baik Anda butuh 40 kg wagyu per bulan untuk satu restoran atau program berulang untuk banyak outlet, prosesnya sama: satu brief, pemasok yang cocok, relasi yang tetap milik Anda.",
                "Whether you need 40 kg of wagyu a month for a single restaurant or a repeatable programme across multiple outlets, the process is the same: one brief, matched suppliers, a relationship you keep.",
              )}
            </p>
            <Link
              to="/request-quote"
              className="eyebrow mt-8 inline-flex items-center gap-2 bg-crimson px-7 py-4 text-bone transition-colors hover:bg-crimson-deep"
            >
              {bi("Minta Penawaran", "Request a Quote")}{" "}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section id="suppliers" className="scroll-mt-24 bg-bone">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
          <p className="eyebrow text-crimson">{bi("Untuk pemasok", "For suppliers")}</p>
          <h2 className="mt-4 max-w-3xl font-display text-3xl sm:text-4xl">
            {bi(
              "Pembeli terkualifikasi, dicocokkan dengan produk Anda.",
              "Qualified buyers, matched to what you carry.",
            )}
          </h2>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ash">
            {bi(
              "Meatlink menyalurkan permintaan nyata dari restoran, hotel, dan peritel ke pemasok yang benar-benar bisa memenuhinya.",
              "Meatlink routes real buying requests from restaurants, hotels and retailers to the suppliers who can genuinely fill them.",
            )}
          </p>
          <div className="mt-12 grid gap-px border border-line bg-line sm:grid-cols-2">
            {BENEFITS.map(([title, body]) => (
              <article key={title} className="bg-card p-8 lg:p-10">
                <h3 className="font-display text-2xl">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ash">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-noir text-bone">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="eyebrow text-crimson">{bi("Yang kami cari", "What we look for")}</p>
            <h2 className="mt-5 font-display text-3xl sm:text-4xl">
              {bi(
                "Kami verifikasi sebelum memperkenalkan.",
                "We vet before we introduce.",
              )}
            </h2>
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
              {bi("Pasok Lewat Meatlink", "Supply Through Meatlink")}{" "}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <img
            src={suppliersImg}
            alt={bi(
              "Karton ekspor daging sapi premium dengan potongan vacuum sealed",
              "Premium beef export carton with vacuum sealed cuts",
            )}
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
