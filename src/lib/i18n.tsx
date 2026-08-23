import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Lang = "id" | "en";

const STORAGE_KEY = "meatlink.lang";

/** Bilingual dictionary. Add keys as pages are localised. */
export const DICT = {
  // --- header / utility bar -------------------------------------------------
  "nav.products": { id: "Produk", en: "Products" },
  "nav.promo": { id: "Promo", en: "Deals" },
  "nav.sourcing": { id: "Special Sourcing", en: "Special Sourcing" },
  "nav.insights": { id: "Market Insights", en: "Market Insights" },
  "nav.network": { id: "Buyers & Suppliers", en: "Buyers & Suppliers" },
  "nav.about": { id: "Tentang Kami", en: "About Us" },
  "nav.contact": { id: "Kontak", en: "Contact" },
  "nav.sell": { id: "Jual lewat Meatlink", en: "Sell with Meatlink" },
  "header.coverage": {
    id: "PENGIRIMAN KE SELURUH INDONESIA · RANTAI DINGIN TERJAGA",
    en: "NATIONWIDE DELIVERY ACROSS INDONESIA · UNBROKEN COLD CHAIN",
  },
  "header.categories": { id: "Kategori", en: "Categories" },
  "header.allProducts": { id: "Lihat semua produk", en: "View all products" },
  "header.searchLabel": { id: "Cari produk daging", en: "Search meat products" },
  "header.searchPlaceholder": {
    id: "Cari cut, brand atau asal negara…",
    en: "Search cut, brand or origin…",
  },
  "header.search": { id: "Cari", en: "Search" },
  "header.account": { id: "Akun", en: "Account" },
  "header.cart": { id: "Keranjang", en: "Cart" },
  "header.shopProducts": { id: "Belanja Produk", en: "Shop Products" },
  "header.openMenu": { id: "Buka menu", en: "Open menu" },
  "header.closeMenu": { id: "Tutup menu", en: "Close menu" },
  "lang.label": { id: "Bahasa", en: "Language" },

  // --- footer ---------------------------------------------------------------
  "footer.helpTitle": {
    id: "Belum menemukan yang Anda cari?",
    en: "Can't find what you're looking for?",
  },
  "footer.helpBody": {
    id: "Tim kami siap membantu mencarikan daging sesuai spesifikasi Anda.",
    en: "Our team is ready to help you source the exact meat you need.",
  },
  "footer.requestQuote": { id: "Minta Penawaran", en: "Request a Quote" },
  "footer.about": {
    id: "Jaringan sourcing daging B2B yang menghubungkan restoran, hotel, katering dan retailer dengan importir serta pemasok premium terpercaya.",
    en: "A B2B meat sourcing network connecting restaurants, hotels, caterers and retailers with trusted importers and premium suppliers.",
  },
  "footer.buyers": { id: "Pembeli", en: "Buyers" },
  "footer.howSourcing": { id: "Cara sourcing bekerja", en: "How sourcing works" },
  "footer.requestQuoteLink": { id: "Minta penawaran", en: "Request a quote" },
  "footer.marketInsights": { id: "Market insights", en: "Market insights" },
  "footer.suppliers": { id: "Pemasok", en: "Suppliers" },
  "footer.whySupply": { id: "Kenapa memasok lewat Meatlink", en: "Why supply through Meatlink" },
  "footer.supply": { id: "Jadi pemasok Meatlink", en: "Supply through Meatlink" },
  "footer.aboutUs": { id: "Tentang kami", en: "About us" },
  "footer.contact": { id: "Kontak", en: "Contact" },
  "footer.legal": { id: "Syarat · Privasi", en: "Terms · Privacy" },

  // --- home -----------------------------------------------------------------
  "home.hero.eyebrow": {
    id: "Better Meat | Better Connections",
    en: "Better Meat | Better Connections",
  },
  "home.hero.title1": {
    id: "Daging premium untuk setiap skala usaha,",
    en: "Premium meat for every scale of business,",
  },
  "home.hero.title2": { id: "siap pesan hari ini.", en: "ready to order today." },
  "home.hero.body": {
    id: "Prime cut, second cut, offal dan bone dari importir terverifikasi. Harga per kilogram terbuka, stok diperbarui setiap hari, pengiriman ke seluruh Indonesia — untuk resto, hotel, katering, toko daging maupun reseller.",
    en: "Prime cuts, second cuts, offal and bones from verified importers. Transparent per-kilogram pricing, stock updated daily, delivery across Indonesia — for restaurants, hotels, caterers, meat shops and resellers.",
  },
  "home.hero.shop": { id: "Belanja Produk", en: "Shop Products" },
  "home.hero.categories": { id: "Lihat Kategori", en: "Browse Categories" },
  "home.hero.special": { id: "Butuh spesifikasi khusus?", en: "Need a special specification?" },

  "home.category.eyebrow": { id: "Belanja per kategori", en: "Shop by category" },
  "home.category.title": { id: "Belanja per Kategori", en: "Shop by Category" },
  "home.category.all": { id: "Semua produk", en: "All products" },
  "home.category.shop": { id: "Belanja", en: "Shop" },

  "home.available.eyebrow": { id: "Siap kirim", en: "Ready to ship" },
  "home.available.title": { id: "Tersedia Sekarang", en: "Available Now" },
  "home.available.all": { id: "Lihat semua", en: "View all" },

  "home.origin.eyebrow": { id: "Asal produk", en: "Product origin" },
  "home.origin.title": { id: "Belanja per Asal", en: "Shop by Origin" },

  "home.benefits.eyebrow": { id: "KENAPA MEATLINK", en: "WHY MEATLINK" },
  "home.benefits.title": {
    id: "Dibangun untuk pembelian bisnis, terbuka untuk berbagai skala.",
    en: "Built for business buying, open to every scale.",
  },
  "home.benefits.body": {
    id: "Pembelian rutin dalam volume besar maupun order kecil untuk toko dan reseller berjalan di alur yang sama: harga jelas, stok nyata, dokumen lengkap.",
    en: "Large recurring volumes and small orders for shops and resellers run through the same flow: clear pricing, real stock, complete documents.",
  },
  "home.benefit.verified.title": { id: "Pasokan terverifikasi", en: "Verified supply" },
  "home.benefit.verified.body": {
    id: "Setiap importir dan pemasok diperiksa legalitas, dokumen dan konsistensinya sebelum masuk katalog.",
    en: "Every importer and supplier is checked for legality, documents and consistency before entering the catalog.",
  },
  "home.benefit.cold.title": { id: "Rantai dingin terjaga", en: "Unbroken cold chain" },
  "home.benefit.cold.body": {
    id: "Produk frozen dan chilled ditangani sesuai standar suhu dari gudang sampai lokasi Anda.",
    en: "Frozen and chilled products are handled to temperature standards from warehouse to your door.",
  },
  "home.benefit.payment.title": { id: "Pembayaran fleksibel", en: "Flexible payment" },
  "home.benefit.payment.body": {
    id: "Transfer VA, QRIS, bayar di tempat, atau tempo (TOP) untuk perusahaan yang telah disetujui.",
    en: "VA transfer, QRIS, cash on delivery, or terms (TOP) for approved companies.",
  },
  "home.benefit.delivery.title": { id: "Pengiriman nasional", en: "Nationwide delivery" },
  "home.benefit.delivery.body": {
    id: "Jadwal kirim dan estimasi tiba tercatat pada setiap pesanan, lengkap dengan nomor resi.",
    en: "Dispatch schedules and ETAs are recorded on every order, complete with tracking numbers.",
  },
  "home.benefit.scale.title": { id: "Cocok untuk semua skala", en: "Fits every scale" },
  "home.benefit.scale.body": {
    id: "Dari resto, katering dan hotel sampai toko daging dan reseller — riwayat pesanan, pesan ulang sekali klik, dan harga kontrak untuk pembeli rutin.",
    en: "From restaurants, caterers and hotels to meat shops and resellers — order history, one-click reordering, and contract pricing for regular buyers.",
  },
  "home.benefit.sourcing.title": { id: "Special sourcing", en: "Special sourcing" },
  "home.benefit.sourcing.body": {
    id: "Spesifikasi di luar katalog tetap kami carikan lewat jaringan pemasok Meatlink.",
    en: "Specifications outside the catalog are sourced through the Meatlink supplier network.",
  },

  "home.cta.eyebrow": { id: "Special sourcing", en: "Special sourcing" },
  "home.cta.title": {
    id: "Tidak menemukan spesifikasi yang Anda cari?",
    en: "Not finding the specification you need?",
  },
  "home.cta.body": {
    id: "Kirim kebutuhan cut, grade, volume dan tanggal kirim. Tim kami mencarikannya lewat jaringan importir dan pemasok Meatlink.",
    en: "Send your cut, grade, volume and delivery date. Our team will source it through the Meatlink importer and supplier network.",
  },
  "home.cta.button": { id: "Kirim permintaan khusus", en: "Send a special request" },

  "home.faq.eyebrow": { id: "TANYA JAWAB", en: "FAQ" },
  "home.faq.title": {
    id: "Jangkauan layanan untuk berbagai skala pembeli",
    en: "Service coverage for buyers of every scale",
  },
  "home.faq.body": {
    id: "Dari bisnis besar sampai pembeli pribadi — semua mendapat katalog, harga, dan layanan yang sama-sama transparan.",
    en: "From large businesses to individual buyers — everyone gets the same catalog, pricing and transparent service.",
  },
  "home.faq.scale.q": {
    id: "Apakah Meatlink hanya melayani pembeli B2B?",
    en: "Does Meatlink only serve B2B buyers?",
  },
  "home.faq.scale.a": {
    id: "Tidak. Meski dirancang untuk kebutuhan bisnis — restoran, hotel, katering, dan toko daging — kami juga membuka order untuk reseller maupun pembeli ritel yang membutuhkan daging premium dalam jumlah kecil. Alur, harga, dan pengiriman tetap transparan di setiap skala.",
    en: "No. While built for business needs — restaurants, hotels, caterers and meat shops — we also accept orders from resellers and retail buyers who need premium meat in smaller quantities. The flow, pricing and delivery stay transparent at every scale.",
  },
  "home.faq.minimum.q": {
    id: "Berapa minimum jumlah pembelian?",
    en: "What is the minimum order quantity?",
  },
  "home.faq.minimum.a": {
    id: "Tidak ada minimum order yang rumit. Beberapa produk tersedia per kilogram atau per pack kecil, sehingga toko daging, katering kecil, dan pembeli pribadi bisa mulai berbelanja tanpa harus mengambil volume besar.",
    en: "There is no complicated minimum. Several products are available per kilogram or in small packs, so meat shops, small caterers and individual buyers can start ordering without committing to large volumes.",
  },
  "home.faq.coverage.q": {
    id: "Jangkauan pengiriman sampai ke mana?",
    en: "How far does delivery reach?",
  },
  "home.faq.coverage.a": {
    id: "Pengiriman kami menjangkau seluruh Indonesia. Produk frozen dan chilled dikemas sesuai standar rantai dingin, dengan jadwal kirim dan nomor resi yang tercatat di setiap pesanan.",
    en: "We deliver across Indonesia. Frozen and chilled products are packed to cold-chain standards, with dispatch schedules and tracking numbers recorded on every order.",
  },
  "home.faq.price.q": {
    id: "Apakah harga berbeda untuk order kecil dan besar?",
    en: "Does pricing differ for small and large orders?",
  },
  "home.faq.price.a": {
    id: "Harga yang tertera terbuka per kilogram. Pembeli volume rutin — restoran, hotel, katering, dan toko daging — bisa mendapatkan harga kontrak atau TOP (tempo) setelah disetujui. Pembeli kecil tetap menikmati harga katalog yang sama tanpa syarat tambahan.",
    en: "Listed prices are transparent per kilogram. Regular volume buyers — restaurants, hotels, caterers and meat shops — can obtain contract pricing or terms (TOP) once approved. Smaller buyers still get the same catalog price with no extra conditions.",
  },
  "home.faq.top.q": {
    id: "Apakah tersedia pembayaran tempo (TOP)?",
    en: "Is payment on terms (TOP) available?",
  },
  "home.faq.top.a": {
    id: "Ya, untuk pembeli bisnis dengan histori atau kontrak rutin. Pengajuan TOP diverifikasi tim kami dalam 1–2 hari kerja. Sementara itu, pembeli lain tetap bisa memilih transfer VA, QRIS, atau bayar di tempat.",
    en: "Yes, for business buyers with an order history or a recurring contract. TOP applications are verified by our team within 1–2 business days. Meanwhile, other buyers can still choose VA transfer, QRIS or cash on delivery.",
  },
  "home.faq.sourcing.q": {
    id: "Bisa request produk yang belum ada di katalog?",
    en: "Can I request products not yet in the catalog?",
  },
  "home.faq.sourcing.a": {
    id: "Bisa. Gunakan fitur Special Sourcing atau kirimkan kebutuhan spesifik Anda — cut, grade, brand, volume, dan tujuan. Tim Meatlink akan mencarikannya lewat jaringan importir dan pemasok terverifikasi.",
    en: "Yes. Use Special Sourcing or send your specific requirements — cut, grade, brand, volume and destination. The Meatlink team will source it through our verified importer and supplier network.",
  },

  "home.insights.eyebrow": { id: "Market insights", en: "Market insights" },
  "home.insights.title": { id: "Baru disourcing", en: "Recently sourced" },
  "home.insights.all": { id: "Semua insight", en: "All insights" },
  "home.insights.brand": { id: "Brand", en: "Brand" },
  "home.insights.avgWeight": { id: "Berat rata-rata", en: "Average weight" },
  "home.insights.onRequest": { id: "Atas permintaan", en: "On request" },
  "home.insights.indicative": { id: "Harga indikatif", en: "Indicative price" },
} as const;

export type TKey = keyof typeof DICT;

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (key: TKey) => string };

const LangContext = createContext<Ctx>({ lang: "id", setLang: () => {}, t: (k) => DICT[k].id });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("id");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "id") setLangState(stored);
    } catch {
      /* storage unavailable */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "en" ? "en" : "id";
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const t = useCallback((key: TKey) => DICT[key]?.[lang] ?? DICT[key]?.id ?? key, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}

/**
 * Inline bilingual helper for page-local copy that does not belong in DICT.
 * Usage: const bi = useBi(); bi("Kembali", "Back")
 */
export function useBi() {
  const { lang } = useContext(LangContext);
  return useCallback((id: string, en: string) => (lang === "en" ? en : id), [lang]);
}

/** Pick the right field from bilingual content (e.g. insights title/title_en). */
export function pickLocale(lang: Lang, id: string | null | undefined, en: string | null | undefined) {
  if (lang === "en") return en?.trim() || id || "";
  return id || en || "";
}

// --- shared domain label maps ------------------------------------------------

export const CATEGORY_LABEL_I18N: Record<string, Record<Lang, string>> = {
  PRIME_CUT: { id: "Prime Cut", en: "Prime Cut" },
  SECOND_CUT: { id: "Second Cut", en: "Second Cut" },
  OFFAL: { id: "Offal", en: "Offal" },
  BONE: { id: "Bone", en: "Bone" },
};

export const AVAILABILITY_LABEL_I18N: Record<string, Record<Lang, string>> = {
  IN_STOCK: { id: "Ready stok", en: "In stock" },
  LIMITED: { id: "Stok terbatas", en: "Limited stock" },
  PRE_ORDER: { id: "Pre-order", en: "Pre-order" },
};

export const ORDER_STATUS_LABEL_I18N: Record<string, Record<Lang, string>> = {
  NEW: { id: "Pesanan diterima", en: "Order received" },
  AWAITING_PAYMENT: { id: "Menunggu pembayaran", en: "Awaiting payment" },
  PAID: { id: "Pembayaran diterima", en: "Payment received" },
  PROCESSING: { id: "Sedang diproses", en: "Processing" },
  SHIPPED: { id: "Dalam pengiriman", en: "Shipped" },
  COMPLETED: { id: "Selesai", en: "Completed" },
  CANCELLED: { id: "Dibatalkan", en: "Cancelled" },
};

export const PAY_METHOD_LABEL_I18N: Record<string, Record<Lang, string>> = {
  BANK_TRANSFER: { id: "Transfer bank / VA", en: "Bank transfer / VA" },
  QRIS: { id: "QRIS", en: "QRIS" },
  WHATSAPP: { id: "WhatsApp", en: "WhatsApp" },
  CBD: { id: "Cash Before Delivery", en: "Cash before delivery" },
  TOP: { id: "Tempo (TOP)", en: "Terms (TOP)" },
};

/** Localised label lookup with graceful fallback to the raw code. */
export function useLabel() {
  const { lang } = useContext(LangContext);
  return useCallback(
    (map: Record<string, Record<Lang, string>>, code: string | null | undefined) =>
      (code && map[code]?.[lang]) || code || "—",
    [lang],
  );
}

