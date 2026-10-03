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
  "nav.sourcing": { id: "Sourcing", en: "Sourcing" },
  "nav.insights": { id: "Insights", en: "Insights" },
  "nav.network": { id: "Network", en: "Network" },
  "nav.about": { id: "Tentang Kami", en: "About Us" },
  "nav.contact": { id: "Kontak", en: "Contact" },
  "nav.sell": { id: "Jual lewat Meatlink", en: "Sell with Meatlink" },
  "header.coverage": {
    id: "SOLUSI PENGADAAN DAGING · PENGIRIMAN KE SELURUH INDONESIA",
    en: "MEAT PROCUREMENT SOLUTIONS · DELIVERY ACROSS INDONESIA",
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
  "image.disclaimer": {
    id: "Gambar ilustrasi. Produk asli dapat sedikit berbeda.",
    en: "Illustrative image. Actual product may vary slightly.",
  },
  "ai.disclaimer": {
    id: "Hasil analisis AI — verifikasi sebelum digunakan sebagai dasar keputusan pembelian.",
    en: "AI-generated analysis — please verify before using it as a basis for purchasing decisions.",
  },

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
  "home.hero.title": {
    id: "Pengadaan Daging untuk Bisnis, Lebih Mudah dan Transparan.",
    en: "Business Meat Procurement, Made Easier and More Transparent.",
  },
  "home.hero.body": {
    id: "Prime cut, second cut, offal dan bone dari importir dan pemasok terpercaya. Harga per kilogram terbuka, informasi stok terkini, serta solusi pengadaan untuk restoran, hotel, katering, toko daging dan reseller.",
    en: "Prime cuts, second cuts, offal and bones from trusted importers and suppliers. Transparent per-kilogram pricing, current stock information, and procurement solutions for restaurants, hotels, caterers, meat shops and resellers.",
  },
  "home.hero.shop": { id: "Belanja Produk", en: "Shop Products" },
  "home.hero.quote": { id: "Minta Penawaran", en: "Request a Quote" },
  "home.hero.audienceLabel": { id: "Untuk kebutuhan", en: "Built for" },
  "home.hero.audience.restaurant": { id: "Restoran", en: "Restaurants" },
  "home.hero.audience.hotel": { id: "Hotel", en: "Hotels" },
  "home.hero.audience.catering": { id: "Katering", en: "Caterers" },
  "home.hero.audience.butcher": { id: "Toko Daging", en: "Butcher Shops" },
  "home.hero.audience.retailer": { id: "Retailer", en: "Retailers" },
  "home.hero.audience.reseller": { id: "Reseller", en: "Resellers" },

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
    id: "Pengadaan daging yang jelas dari awal.",
    en: "Clearer meat procurement from the start.",
  },
  "home.benefits.body": {
    id: "MeatLink membantu bisnis menemukan produk, membandingkan informasi, dan memilih jalur pembelian yang sesuai. Pembeli ritel tetap dapat berbelanja pada produk yang tersedia.",
    en: "MeatLink helps businesses find products, compare information, and choose the right purchasing path. Retail buyers can still shop eligible products.",
  },
  "home.benefit.selection.title": { id: "Pilihan Produk", en: "Product Selection" },
  "home.benefit.selection.body": {
    id: "Jelajahi berbagai cut, grade dan origin untuk kebutuhan operasional bisnis.",
    en: "Explore a range of cuts, grades and origins for your operational needs.",
  },
  "home.benefit.transparent.title": { id: "Harga Transparan", en: "Transparent Pricing" },
  "home.benefit.transparent.body": {
    id: "Lihat harga per kilogram dan informasi produk secara jelas sebelum melakukan pembelian.",
    en: "See per-kilogram prices and clear product information before purchasing.",
  },
  "home.benefit.flexible.title": { id: "Fleksibel untuk Pengadaan", en: "Flexible Procurement" },
  "home.benefit.flexible.body": {
    id: "Belanja langsung melalui katalog atau kirim kebutuhan khusus untuk volume dan spesifikasi tertentu.",
    en: "Shop directly through the catalog or submit specific volume and specification requirements.",
  },

  "home.paths.eyebrow": { id: "Dua cara pengadaan", en: "Two ways to procure" },
  "home.paths.title": { id: "Pilih jalur sesuai kebutuhan bisnis Anda.", en: "Choose the path that fits your business needs." },
  "home.paths.standardLabel": { id: "Pengadaan standar", en: "Standard procurement" },
  "home.paths.standardTitle": { id: "Belanja langsung dari katalog", en: "Shop directly from the catalog" },
  "home.paths.standardBody": {
    id: "Temukan produk berdasarkan cut, origin, grade, ukuran dan kebutuhan bisnis Anda.",
    en: "Find products by cut, origin, grade, size, and your business requirements.",
  },
  "home.paths.standardButton": { id: "Lihat Produk", en: "View Products" },
  "home.paths.customLabel": { id: "Pengadaan khusus / volume besar", en: "Custom / bulk procurement" },
  "home.paths.customTitle": { id: "Perlu spesifikasi atau volume tertentu?", en: "Need a specific specification or volume?" },
  "home.paths.customBody": {
    id: "Kirim kebutuhan cut, grade, volume dan jadwal pengiriman. MeatLink akan membantu mencarikan produk melalui jaringan pemasok.",
    en: "Send your cut, grade, volume, and delivery schedule. MeatLink will help source products through its supplier network.",
  },
  "home.paths.customButton": { id: "Minta Penawaran", en: "Request a Quote" },

  "home.faq.eyebrow": { id: "TANYA JAWAB", en: "FAQ" },
  "home.faq.title": {
    id: "Jangkauan layanan untuk berbagai skala pembeli",
    en: "Service coverage for buyers of every scale",
  },
  "home.faq.body": {
    id: "Fokus utama kami adalah pengadaan bisnis, dengan pilihan produk tertentu yang tetap tersedia untuk pembeli ritel.",
    en: "Our primary focus is business procurement, with selected products still available to retail buyers.",
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
    id: "Pengiriman dapat menjangkau berbagai wilayah di Indonesia. Penanganan disesuaikan dengan karakteristik produk dan area tujuan untuk membantu menjaga kualitas selama perjalanan.",
    en: "Delivery can reach regions across Indonesia. Handling is adapted to product characteristics and destination areas to help maintain quality in transit.",
  },
  "home.faq.price.q": {
    id: "Apakah harga berbeda untuk order kecil dan besar?",
    en: "Does pricing differ for small and large orders?",
  },
  "home.faq.price.a": {
    id: "Harga katalog ditampilkan secara terbuka per kilogram dan dapat berbeda menurut satuan pembelian. Untuk kebutuhan rutin atau volume tertentu, pembeli bisnis dapat meminta penawaran khusus.",
    en: "Catalog prices are shown transparently per kilogram and may vary by purchasing unit. Business buyers can request a tailored quote for recurring or specific volumes.",
  },
  "home.faq.top.q": {
    id: "Opsi pembayaran apa yang tersedia?",
    en: "What payment options are available?",
  },
  "home.faq.top.a": {
    id: "Opsi pembayaran tersedia sesuai transaksi dan profil pembeli. Informasi yang berlaku akan ditampilkan atau dikonfirmasi pada proses pemesanan.",
    en: "Payment options are available according to the transaction and buyer profile. Applicable information will be shown or confirmed during ordering.",
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
      const cookie = document.cookie
        .split("; ")
        .find((c) => c.startsWith(`${STORAGE_KEY}=`))
        ?.split("=")[1];
      const stored = window.localStorage.getItem(STORAGE_KEY) ?? cookie;
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
      document.cookie = `${STORAGE_KEY}=${next}; path=/; max-age=31536000; samesite=lax`;
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
  BANK_TRANSFER: { id: "Transfer langsung BCA", en: "Direct BCA transfer" },
  QRIS: { id: "QRIS", en: "QRIS" },
  WHATSAPP: { id: "WhatsApp", en: "WhatsApp" },
  CBD: { id: "Cash Before Delivery", en: "Cash before delivery" },
  TOP: { id: "Tempo (TOP)", en: "Terms (TOP)" },
  TERMS_REQUEST: { id: "Pengajuan termin — belum disetujui", en: "Payment terms request — not approved" },
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


// --- form validation messages -----------------------------------------------

/**
 * Validation messages are stored in schemas as language-neutral codes
 * (`err:required`, `err:max:160`, …) and localised at render time.
 */
export const VErr = {
  required: "err:required",
  max: (n: number) => `err:max:${n}`,
  email: "err:email",
  phone: "err:phone",
  minItems: "err:min_items",
  maxItems: (n: number) => `err:max_items:${n}`,
  fileSize: (mb: number) => `err:file_size:${mb}`,
  fileType: "err:file_type",
} as const;

export function formatValidationError(lang: Lang, message: string): string {
  if (!message.startsWith("err:")) return message;
  const [, code, arg] = message.split(":");
  const en = lang === "en";
  switch (code) {
    case "required":
      return en ? "This field is required" : "Kolom ini wajib diisi";
    case "max":
      return en ? `Maximum ${arg} characters` : `Maksimal ${arg} karakter`;
    case "email":
      return en ? "Enter a valid email address" : "Masukkan alamat email yang valid";
    case "phone":
      return en ? "Enter a valid phone number" : "Masukkan nomor telepon yang valid";
    case "min_items":
      return en ? "Add at least one item" : "Tambahkan minimal satu item";
    case "max_items":
      return en ? `Maximum ${arg} items per request` : `Maksimal ${arg} item per permintaan`;
    case "file_size":
      return en ? `Maximum file size is ${arg} MB` : `Ukuran file maksimal ${arg} MB`;
    case "file_type":
      return en
        ? "File must be JPG, PNG, WEBP, or PDF"
        : "Format file harus JPG, PNG, WEBP, atau PDF";
    default:
      return message;
  }
}

/** Localise a validation message code produced by a zod schema. */
export function useErr() {
  const { lang } = useContext(LangContext);
  return useCallback((message: string) => formatValidationError(lang, message), [lang]);
}

/* -------------------------------------------------------------------------- */
/* Locale-aware number / currency / date formatting                            */
/* -------------------------------------------------------------------------- */

export function localeTag(lang: Lang) {
  return lang === "en" ? "en-GB" : "id-ID";
}

export function formatNumberLocale(lang: Lang, value: number | string, maximumFractionDigits = 0) {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "-";
  return new Intl.NumberFormat(localeTag(lang), { maximumFractionDigits }).format(n);
}

export function formatMoneyLocale(lang: Lang, value: number | string) {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n) || n <= 0) return lang === "en" ? "On request" : "Atas permintaan";
  return lang === "en"
    ? `IDR ${formatNumberLocale("en", n)}`
    : `Rp ${formatNumberLocale("id", n)}`;
}

export function formatQtyLocale(lang: Lang, value: number | string) {
  return `${formatNumberLocale(lang, value, 2)} kg`;
}

export function formatDateLocale(lang: Lang, value: string | Date) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString(localeTag(lang), {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatLongDateLocale(lang: Lang, value: string | Date) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString(localeTag(lang), { day: "2-digit", month: "long", year: "numeric" });
}

export function formatDateTimeLocale(lang: Lang, value: string | Date) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString(localeTag(lang), {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Hook returning locale-bound formatters that follow the ID/EN toggle. */
export function useFormat() {
  const { lang } = useContext(LangContext);
  return useMemo(
    () => ({
      lang,
      locale: localeTag(lang),
      money: (v: number | string) => formatMoneyLocale(lang, v),
      number: (v: number | string, digits?: number) => formatNumberLocale(lang, v, digits),
      qty: (v: number | string) => formatQtyLocale(lang, v),
      date: (v: string | Date) => formatDateLocale(lang, v),
      longDate: (v: string | Date) => formatLongDateLocale(lang, v),
      dateTime: (v: string | Date) => formatDateTimeLocale(lang, v),
    }),
    [lang],
  );
}
