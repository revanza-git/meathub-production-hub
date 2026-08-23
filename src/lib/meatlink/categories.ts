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
    tagline: "Tenderloin, sirloin, ribeye, shortloin, tomahawk, OP ribs, flat iron",
    intro:
      "Delapan kelompok potongan utama: tenderloin, sirloin/striploin, ribeye/cuberoll, shortloin (T-bone & porterhouse), tomahawk, OP ribs dan flat iron. Kategori ditentukan murni oleh jenis potongan, bukan oleh grade.",
  },
  {
    slug: "second-cut",
    value: "SECOND_CUT",
    label: "Second Cut",
    tagline: "Picanha, rump, knuckle, short plate, brisket, chuck",
    intro:
      "Semua potongan di luar delapan kelompok prime — termasuk picanha/rump cap, knuckle, oyster blade, short plate, brisket dan chuck. Bernilai untuk volume harian dan siap kirim ke seluruh Indonesia.",

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
