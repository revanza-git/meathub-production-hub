import type { ProductCategory } from "@/lib/meatlink/catalog";

export type CategoryPage = {
  slug: string;
  value: ProductCategory;
  label: string;
  tagline: string;
  intro: string;
};

/** URL-facing category landing pages (/kategori/$slug). */
export const CATEGORY_PAGES: CategoryPage[] = [
  {
    slug: "prime-cut",
    value: "PRIME_CUT",
    label: "Prime Cut",
    tagline: "Ribeye, striploin, tenderloin, wagyu",
    intro:
      "Potongan premium untuk steakhouse, hotel dan fine dining. Grade wagyu dan angus dari importir terverifikasi, harga per kilogram ditampilkan terbuka.",
  },
  {
    slug: "second-cut",
    value: "SECOND_CUT",
    label: "Second Cut",
    tagline: "Short plate, brisket, chuck, shank",
    intro:
      "Potongan bernilai untuk volume harian: katering, restoran casual, hotel dan retail. Konsisten secara spesifikasi dan siap kirim ke seluruh Indonesia.",
  },
  {
    slug: "offal",
    value: "OFFAL",
    label: "Offal",
    tagline: "Lidah, hati, babat, jeroan pilihan",
    intro:
      "Jeroan pilihan dengan penanganan rantai dingin terjaga, cocok untuk menu tradisional, hotpot dan olahan volume besar.",
  },
  {
    slug: "bone",
    value: "BONE",
    label: "Bone",
    tagline: "Marrow bone, soup bone, potongan tulang",
    intro:
      "Tulang untuk kaldu, sup dan olahan bertulang, tersedia dalam potongan siap pakai untuk dapur komersial.",
  },
];

export function categoryBySlug(slug: string): CategoryPage | undefined {
  return CATEGORY_PAGES.find((c) => c.slug === slug);
}

export function slugForCategory(value: ProductCategory): string {
  return CATEGORY_PAGES.find((c) => c.value === value)?.slug ?? "prime-cut";
}
