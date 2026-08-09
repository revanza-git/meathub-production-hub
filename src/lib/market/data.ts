import heroMeat from "@/assets/hero-meat.jpg";
import imgTenderloin from "@/assets/product-tenderloin.jpg";
import imgRibs from "@/assets/product-ribs.jpg";
import imgSlice from "@/assets/product-slice.jpg";
import imgOxtail from "@/assets/product-oxtail.jpg";

export const HERO_IMAGE = heroMeat;

export type Category = {
  slug: string;
  name: string;
  icon: string;
  active: boolean;
};

export type Vendor = {
  id: string;
  slug: string;
  name: string;
  city: string;
  rating: number;
  productCount: number;
  verified: boolean;
  since: string;
  transactions: number;
  responseTime: string;
  description: string;
  settlementStatus: "NOT_CREATED" | "PENDING_KYC" | "UNDER_REVIEW" | "ACTIVE" | "REJECTED" | "SUSPENDED";
};

export type ProductVariant = {
  id: string;
  label: string;
  weightGram: number;
  price: number;
  stock: number;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  categorySlug: string;
  vendorId: string;
  image: string;
  price: number;
  originalPrice?: number;
  unit: string;
  rating: number;
  reviewCount: number;
  sold: number;
  stock: number;
  moq: number;
  halal: boolean;
  origin: string;
  imported: boolean;
  frozen: boolean;
  grade: string;
  cut: string;
  packaging: string;
  storageTemp: string;
  shelfLife: string;
  productionDate: string;
  description: string;
  variants: ProductVariant[];
  flash?: { endsInMinutes: number; sold: number; total: number };
  bestSeller?: boolean;
  createdAt: string;
};

export const CATEGORIES: Category[] = [
  { slug: "semua", name: "Semua Produk", icon: "🥩", active: true },
  { slug: "tenderloin", name: "Tenderloin", icon: "🍖", active: true },
  { slug: "sirloin", name: "Sirloin", icon: "🥩", active: true },
  { slug: "ribeye", name: "Ribeye", icon: "🍖", active: true },
  { slug: "brisket", name: "Brisket", icon: "🥓", active: true },
  { slug: "short-ribs", name: "Short Ribs", icon: "🍗", active: true },
  { slug: "buntut", name: "Buntut", icon: "🍲", active: true },
  { slug: "beef-slice", name: "Beef Slice", icon: "🥩", active: true },
  { slug: "daging-giling", name: "Daging Giling", icon: "🍔", active: true },
  { slug: "shabu-yakiniku", name: "Shabu & Yakiniku", icon: "🍲", active: true },
  { slug: "marinated", name: "Marinated Beef", icon: "🍢", active: true },
  { slug: "jeroan", name: "Jeroan", icon: "🫀", active: true },
  { slug: "frozen-beef", name: "Frozen Beef", icon: "🧊", active: true },
  { slug: "horeca", name: "Paket HORECA", icon: "📦", active: true },
];

export const VENDORS: Vendor[] = [
  {
    id: "v1",
    slug: "nusantara-protein",
    name: "PT Nusantara Protein Sejahtera",
    city: "Jakarta Utara",
    rating: 4.9,
    productCount: 8,
    verified: true,
    since: "2019",
    transactions: 4820,
    responseTime: "± 12 menit",
    description:
      "Importir tangan pertama daging sapi Australia & Selandia Baru dengan gudang cold storage berstandar HACCP.",
    settlementStatus: "ACTIVE",
  },
  {
    id: "v2",
    slug: "jakarta-meat-supply",
    name: "Jakarta Meat Supply",
    city: "Jakarta Barat",
    rating: 4.7,
    productCount: 6,
    verified: true,
    since: "2020",
    transactions: 2610,
    responseTime: "± 25 menit",
    description: "Spesialis suplai harian untuk restoran dan katering di seluruh Indonesia.",
    settlementStatus: "ACTIVE",
  },
  {
    id: "v3",
    slug: "prima-beef",
    name: "Prima Beef Indonesia",
    city: "Bekasi",
    rating: 4.8,
    productCount: 6,
    verified: true,
    since: "2018",
    transactions: 3940,
    responseTime: "± 18 menit",
    description: "Rumah potong terintegrasi bersertifikat halal MUI dan NKV.",
    settlementStatus: "ACTIVE",
  },
  {
    id: "v4",
    slug: "sumber-daging-makmur",
    name: "Sumber Daging Makmur",
    city: "Bogor",
    rating: 4.6,
    productCount: 5,
    verified: true,
    since: "2021",
    transactions: 1290,
    responseTime: "± 40 menit",
    description: "Daging sapi lokal pilihan dari peternakan mitra di Jawa Barat.",
    settlementStatus: "UNDER_REVIEW",
  },
  {
    id: "v5",
    slug: "coldcut-nusantara",
    name: "ColdCut Nusantara",
    city: "Tangerang",
    rating: 4.5,
    productCount: 3,
    verified: true,
    since: "2022",
    transactions: 870,
    responseTime: "± 35 menit",
    description: "Pusat slicing beku presisi untuk shabu, yakiniku, dan hotpot.",
    settlementStatus: "PENDING_KYC",
  },
  {
    id: "v6",
    slug: "bumi-pangan-protein",
    name: "Bumi Pangan Protein",
    city: "Depok",
    rating: 4.4,
    productCount: 4,
    verified: false,
    since: "2023",
    transactions: 310,
    responseTime: "± 1 jam",
    description: "Suplai protein untuk UMKM kuliner dan cloud kitchen.",
    settlementStatus: "PENDING_KYC",
  },
];

const IMAGES = [imgTenderloin, imgRibs, imgSlice, imgOxtail];

function mk(
  i: number,
  p: Omit<
    Product,
    | "id"
    | "slug"
    | "image"
    | "variants"
    | "rating"
    | "reviewCount"
    | "sold"
    | "createdAt"
    | "packaging"
    | "storageTemp"
    | "shelfLife"
    | "productionDate"
  > &
    Partial<Product>,
): Product {
  const slug = p.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return {
    id: `p${i}`,
    slug,
    image: IMAGES[i % IMAGES.length],
    rating: p.rating ?? 4.5 + ((i % 5) / 10),
    reviewCount: p.reviewCount ?? 12 + i * 7,
    sold: p.sold ?? 40 + i * 23,
    createdAt: p.createdAt ?? `2026-0${(i % 7) + 1}-1${i % 9}`,
    packaging: p.packaging ?? "Vacuum sealed",
    storageTemp: p.storageTemp ?? (p.frozen ? "-18°C" : "0–4°C"),
    shelfLife: p.shelfLife ?? (p.frozen ? "12 bulan" : "7 hari"),
    productionDate: p.productionDate ?? "20 Juli 2026",
    variants:
      p.variants ??
      [
        { id: `${slug}-500`, label: "500 gram", weightGram: 500, price: Math.round(p.price / 2), stock: p.stock },
        { id: `${slug}-1000`, label: "1 kg", weightGram: 1000, price: p.price, stock: p.stock },
        { id: `${slug}-5000`, label: "5 kg (carton)", weightGram: 5000, price: p.price * 4.7, stock: Math.max(2, Math.round(p.stock / 5)) },
      ],
    ...p,
  } as Product;
}

export const PRODUCTS: Product[] = [
  mk(0, { name: "Australian Ribeye MB2+ 1 KG", categorySlug: "ribeye", vendorId: "v1", price: 285000, originalPrice: 335000, unit: "kg", stock: 120, moq: 2, halal: true, origin: "Australia", imported: true, frozen: true, grade: "MB2+", cut: "Ribeye", description: "Ribeye Australia marbling score 2+, potongan steak house dengan serat lembut dan juicy.", bestSeller: true, flash: { endsInMinutes: 214, sold: 68, total: 120 } }),
  mk(1, { name: "Tenderloin Lokal Premium 1 KG", categorySlug: "tenderloin", vendorId: "v3", price: 198000, originalPrice: 225000, unit: "kg", stock: 80, moq: 1, halal: true, origin: "Indonesia", imported: false, frozen: false, grade: "Premium", cut: "Tenderloin", description: "Tenderloin sapi lokal segar dari RPH bersertifikat halal, cocok untuk steak dan sup.", bestSeller: true }),
  mk(2, { name: "Beef Slice Low Fat 500 GR", categorySlug: "beef-slice", vendorId: "v5", price: 76000, unit: "pack", stock: 220, moq: 4, halal: true, origin: "Indonesia", imported: false, frozen: true, grade: "Standard", cut: "Slice", description: "Slice tipis rendah lemak 1,5 mm untuk hotpot dan rice bowl." }),
  mk(3, { name: "Short Ribs AUS 1 KG", categorySlug: "short-ribs", vendorId: "v1", price: 265000, originalPrice: 299000, unit: "kg", stock: 45, moq: 2, halal: true, origin: "Australia", imported: true, frozen: true, grade: "Choice", cut: "Short Ribs", description: "Iga pendek potongan Korean style, ideal untuk galbi dan slow cook.", bestSeller: true, flash: { endsInMinutes: 214, sold: 31, total: 45 } }),
  mk(4, { name: "Brisket Lokal 2 KG", categorySlug: "brisket", vendorId: "v4", price: 172000, unit: "kg", stock: 60, moq: 2, halal: true, origin: "Indonesia", imported: false, frozen: false, grade: "Standard", cut: "Brisket", description: "Sandung lamur lokal berlapis lemak seimbang untuk smoked brisket dan soto." }),
  mk(5, { name: "Buntut Sapi Premium 1 KG", categorySlug: "buntut", vendorId: "v3", price: 189000, unit: "kg", stock: 35, moq: 1, halal: true, origin: "Indonesia", imported: false, frozen: true, grade: "Premium", cut: "Buntut", description: "Buntut sapi potongan rata dengan daging tebal untuk sop buntut restoran." }),
  mk(6, { name: "Daging Giling 80/20 1 KG", categorySlug: "daging-giling", vendorId: "v2", price: 112000, originalPrice: 128000, unit: "kg", stock: 300, moq: 5, halal: true, origin: "Indonesia", imported: false, frozen: true, grade: "Standard", cut: "Giling", description: "Giling rasio lemak 80/20, tekstur ideal untuk burger patty dan bolognese." }),
  mk(7, { name: "Sirloin Steak AUS 500 GR", categorySlug: "sirloin", vendorId: "v1", price: 148000, unit: "pack", stock: 90, moq: 2, halal: true, origin: "Australia", imported: true, frozen: true, grade: "MB1", cut: "Sirloin", description: "Sirloin porsi steak 250 gram per keping, siap grill." }),
  mk(8, { name: "Shabu-Shabu Beef Slice 500 GR", categorySlug: "shabu-yakiniku", vendorId: "v5", price: 98000, originalPrice: 115000, unit: "pack", stock: 180, moq: 4, halal: true, origin: "Australia", imported: true, frozen: true, grade: "Choice", cut: "Slice", description: "Slice 1,2 mm dengan marbling merata, digulung rapi siap saji.", bestSeller: true }),
  mk(9, { name: "Teriyaki Marinated Beef 500 GR", categorySlug: "marinated", vendorId: "v6", price: 89000, unit: "pack", stock: 140, moq: 4, halal: true, origin: "Indonesia", imported: false, frozen: true, grade: "Standard", cut: "Slice", description: "Daging marinasi saus teriyaki resep dapur MEATHUB, tinggal panggang." }),
  mk(10, { name: "Paket HORECA Rendang 10 KG", categorySlug: "horeca", vendorId: "v2", price: 1450000, originalPrice: 1620000, unit: "carton", stock: 24, moq: 1, halal: true, origin: "Indonesia", imported: false, frozen: true, grade: "Standard", cut: "Rendang Cut", description: "Paket grosir potongan rendang 3x3 cm, hemat untuk katering besar.", bestSeller: true }),
  mk(11, { name: "Paket Steak Restoran 5 KG", categorySlug: "horeca", vendorId: "v1", price: 1290000, unit: "carton", stock: 18, moq: 1, halal: true, origin: "Australia", imported: true, frozen: true, grade: "MB2+", cut: "Mixed Steak", description: "Kombinasi ribeye, sirloin, dan tenderloin porsi restoran." }),
  mk(12, { name: "Chuck Roll AUS 1 KG", categorySlug: "frozen-beef", vendorId: "v1", price: 168000, unit: "kg", stock: 110, moq: 2, halal: true, origin: "Australia", imported: true, frozen: true, grade: "Choice", cut: "Chuck Roll", description: "Chuck roll serbaguna untuk yakiniku, semur, dan slow cooking." }),
  mk(13, { name: "Knuckle Lokal 1 KG", categorySlug: "frozen-beef", vendorId: "v4", price: 124000, unit: "kg", stock: 95, moq: 3, halal: true, origin: "Indonesia", imported: false, frozen: true, grade: "Standard", cut: "Knuckle", description: "Bagian paha dalam rendah lemak, cocok untuk empal dan dendeng." }),
  mk(14, { name: "Iga Sapi Lokal 1 KG", categorySlug: "short-ribs", vendorId: "v4", price: 155000, unit: "kg", stock: 52, moq: 2, halal: true, origin: "Indonesia", imported: false, frozen: false, grade: "Standard", cut: "Iga", description: "Iga sapi lokal segar untuk sop iga dan bakar." }),
  mk(15, { name: "Wagyu Sirloin MB5 500 GR", categorySlug: "sirloin", vendorId: "v1", price: 585000, originalPrice: 650000, unit: "pack", stock: 20, moq: 1, halal: true, origin: "Australia", imported: true, frozen: true, grade: "MB5", cut: "Sirloin", description: "Wagyu cross-breed marbling 5, tekstur lumer untuk fine dining." }),
  mk(16, { name: "Tenderloin AUS MB3 1 KG", categorySlug: "tenderloin", vendorId: "v3", price: 398000, unit: "kg", stock: 30, moq: 1, halal: true, origin: "Australia", imported: true, frozen: true, grade: "MB3", cut: "Tenderloin", description: "Tenderloin impor premium, potongan center cut." }),
  mk(17, { name: "Yakiniku Beef Slice 500 GR", categorySlug: "shabu-yakiniku", vendorId: "v5", price: 105000, unit: "pack", stock: 160, moq: 4, halal: true, origin: "Australia", imported: true, frozen: true, grade: "Choice", cut: "Slice", description: "Slice 2 mm untuk panggangan yakiniku ala Jepang." }),
  mk(18, { name: "Babat Sapi Bersih 1 KG", categorySlug: "jeroan", vendorId: "v2", price: 68000, unit: "kg", stock: 70, moq: 2, halal: true, origin: "Indonesia", imported: false, frozen: true, grade: "Standard", cut: "Babat", description: "Babat sapi sudah dibersihkan dan direbus awal." }),
  mk(19, { name: "Hati Sapi Segar 1 KG", categorySlug: "jeroan", vendorId: "v2", price: 74000, unit: "kg", stock: 48, moq: 2, halal: true, origin: "Indonesia", imported: false, frozen: false, grade: "Standard", cut: "Hati", description: "Hati sapi segar potong harian dari RPH mitra." }),
  mk(20, { name: "Ribeye Lokal 1 KG", categorySlug: "ribeye", vendorId: "v4", price: 215000, unit: "kg", stock: 40, moq: 2, halal: true, origin: "Indonesia", imported: false, frozen: false, grade: "Premium", cut: "Ribeye", description: "Ribeye lokal segar dengan marbling ringan." }),
  mk(21, { name: "Brisket AUS Point End 2 KG", categorySlug: "brisket", vendorId: "v1", price: 342000, originalPrice: 385000, unit: "carton", stock: 26, moq: 1, halal: true, origin: "Australia", imported: true, frozen: true, grade: "Choice", cut: "Brisket", description: "Point end brisket berlemak untuk BBQ low & slow." }),
  mk(22, { name: "Beef Bacon Slice 250 GR", categorySlug: "beef-slice", vendorId: "v6", price: 62000, unit: "pack", stock: 130, moq: 6, halal: true, origin: "Indonesia", imported: false, frozen: true, grade: "Standard", cut: "Slice", description: "Beef bacon halal asap alami untuk breakfast menu." }),
  mk(23, { name: "Daging Giling Premium 90/10 1 KG", categorySlug: "daging-giling", vendorId: "v3", price: 134000, unit: "kg", stock: 150, moq: 3, halal: true, origin: "Indonesia", imported: false, frozen: true, grade: "Premium", cut: "Giling", description: "Giling rendah lemak untuk menu sehat dan meatball premium." }),
  mk(24, { name: "Bulgogi Marinated Beef 1 KG", categorySlug: "marinated", vendorId: "v6", price: 168000, unit: "kg", stock: 60, moq: 2, halal: true, origin: "Indonesia", imported: false, frozen: true, grade: "Standard", cut: "Slice", description: "Marinasi bulgogi manis gurih siap masak 3 menit." }),
  mk(25, { name: "Paket Grosir Beef Slice 10 KG", categorySlug: "horeca", vendorId: "v5", price: 1680000, unit: "carton", stock: 12, moq: 1, halal: true, origin: "Australia", imported: true, frozen: true, grade: "Choice", cut: "Slice", description: "Karton grosir slice untuk restoran all you can eat." }),
  mk(26, { name: "Oxtail Import 1 KG", categorySlug: "buntut", vendorId: "v1", price: 268000, unit: "kg", stock: 22, moq: 1, halal: true, origin: "Selandia Baru", imported: true, frozen: true, grade: "Choice", cut: "Buntut", description: "Buntut impor potongan besar untuk sop premium." }),
  mk(27, { name: "Flank Steak AUS 1 KG", categorySlug: "frozen-beef", vendorId: "v3", price: 232000, unit: "kg", stock: 38, moq: 2, halal: true, origin: "Australia", imported: true, frozen: true, grade: "Choice", cut: "Flank", description: "Flank steak berserat panjang, cocok untuk grill dan taco." }),
  mk(28, { name: "Sop Iga Pack 2 KG", categorySlug: "horeca", vendorId: "v4", price: 298000, unit: "carton", stock: 30, moq: 1, halal: true, origin: "Indonesia", imported: false, frozen: true, grade: "Standard", cut: "Iga", description: "Paket iga potong sop siap olah untuk warung dan katering." }),
  mk(29, { name: "Beef Cube Curry 1 KG", categorySlug: "frozen-beef", vendorId: "v6", price: 118000, originalPrice: 132000, unit: "kg", stock: 175, moq: 3, halal: true, origin: "Indonesia", imported: false, frozen: true, grade: "Standard", cut: "Cube", description: "Potongan dadu 3 cm untuk kari, gulai, dan semur." }),
];

export function vendorById(id: string) {
  return VENDORS.find((v) => v.id === id)!;
}
export function vendorBySlug(slug: string) {
  return VENDORS.find((v) => v.slug === slug);
}
export function productById(id: string) {
  return PRODUCTS.find((p) => p.id === id);
}
export function categoryBySlug(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug);
}

export type Review = {
  id: string;
  author: string;
  company: string;
  rating: number;
  date: string;
  body: string;
};

export const REVIEWS: Review[] = [
  { id: "r1", author: "Chef Andika", company: "Resto Sate Nusantara, Jakarta", rating: 5, date: "12 Juli 2026", body: "Marbling sesuai foto, datang masih beku keras. Sudah order 4 kali, konsisten." },
  { id: "r2", author: "Bu Ratna", company: "Katering Ratna Boga, Bekasi", rating: 4, date: "8 Juli 2026", body: "Kualitas bagus, pengiriman sempat telat 1 jam tapi tetap dingin." },
  { id: "r3", author: "Purchasing Hotel Arunika", company: "Hotel Arunika, Tangerang", rating: 5, date: "2 Juli 2026", body: "Invoice rapi, cocok untuk kebutuhan bulanan hotel kami." },
  { id: "r4", author: "Pak Yusuf", company: "Warung Steak Depok", rating: 4, date: "28 Juni 2026", body: "Harga bersaing untuk volume 20 kg ke atas." },
];

export const PROMOS = [
  {
    id: "promo-1",
    title: "Harga Grosir untuk Restoran",
    subtitle: "Hemat hingga Rp1,2 juta per karton untuk pembelian ≥ 20 kg",
    cta: "Lihat paket HORECA",
    href: "/produk?kategori=horeca",
  },
  {
    id: "promo-2",
    title: "Diskon hingga 15% Australian Beef",
    subtitle: "Ribeye, sirloin, dan short ribs pilihan importir tangan pertama",
    cta: "Belanja sekarang",
    href: "/produk?asal=impor",
  },
  {
    id: "promo-3",
    title: "Gratis Cold-Chain Delivery",
    subtitle: "Untuk pembelian minimum 20 kg",
    cta: "Cek syarat",
    href: "/produk",
  },
];

export const PAYMENT_METHODS = [
  { id: "qris", name: "QRIS", group: "E-Wallet" },
  { id: "gopay", name: "GoPay", group: "E-Wallet" },
  { id: "ovo", name: "OVO", group: "E-Wallet" },
  { id: "dana", name: "DANA", group: "E-Wallet" },
  { id: "shopeepay", name: "ShopeePay", group: "E-Wallet" },
  { id: "va", name: "Virtual Account", group: "Bank" },
  { id: "transfer", name: "Bank Transfer", group: "Bank" },
  { id: "card", name: "Kartu Kredit / Debit", group: "Kartu" },
] as const;

export const DELIVERY_OPTIONS = [
  { id: "regular", name: "MEATHUB Cold-Chain Regular", eta: "1–2 hari kerja", fee: 45000 },
  { id: "sameday", name: "MEATHUB Cold-Chain Same Day", eta: "Hari ini, sebelum 21.00", fee: 95000 },
  { id: "vendor", name: "Vendor Delivery", eta: "2–3 hari kerja", fee: 30000 },
] as const;
