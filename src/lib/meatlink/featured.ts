import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import boneImg from "@/assets/photo/bone.jpg.asset.json";
import brisketImg from "@/assets/photo/brisket.jpg.asset.json";
import chuckImg from "@/assets/photo/chuck.jpg.asset.json";
import gradeMb02Img from "@/assets/photo/grade-mb0-2.jpg.asset.json";
import gradeMb24Img from "@/assets/photo/grade-mb2-4.jpg.asset.json";
import gradeMb46Img from "@/assets/photo/grade-mb4-6.jpg.asset.json";
import gradeMb69Img from "@/assets/photo/grade-mb6-9.jpg.asset.json";
import gradeMb912Img from "@/assets/photo/grade-mb9-12.jpg.asset.json";
import gradeUngradedImg from "@/assets/photo/grade-ungraded.jpg.asset.json";
import knuckleImg from "@/assets/photo/knuckle.jpg.asset.json";
import lambRackImg from "@/assets/photo/lamb-rack.jpg.asset.json";
import offalImg from "@/assets/photo/offal.jpg.asset.json";
import opRibsImg from "@/assets/photo/op-ribs.jpg.asset.json";
import ribeyeImg from "@/assets/photo/ribeye.jpg.asset.json";
import shortRibImg from "@/assets/photo/short-rib.jpg.asset.json";
import sliceImg from "@/assets/photo/slice.jpg.asset.json";
import striploinImg from "@/assets/photo/striploin.jpg.asset.json";
import tboneImg from "@/assets/photo/tbone.jpg.asset.json";
import tenderloinImg from "@/assets/photo/tenderloin.jpg.asset.json";
import tomahawkImg from "@/assets/photo/tomahawk.jpg.asset.json";
import bone2Img from "@/assets/photo/bone-2.jpg.asset.json";
import bone3Img from "@/assets/photo/bone-3.jpg.asset.json";
import brisket2Img from "@/assets/photo/brisket-2.jpg.asset.json";
import chuck2Img from "@/assets/photo/chuck-2.jpg.asset.json";
import knuckle2Img from "@/assets/photo/knuckle-2.jpg.asset.json";
import knuckle3Img from "@/assets/photo/knuckle-3.jpg.asset.json";
import lambRack2Img from "@/assets/photo/lamb-rack-2.jpg.asset.json";
import lambRack3Img from "@/assets/photo/lamb-rack-3.jpg.asset.json";
import offal2Img from "@/assets/photo/offal-2.jpg.asset.json";
import offal3Img from "@/assets/photo/offal-3.jpg.asset.json";
import opRibs2Img from "@/assets/photo/op-ribs-2.jpg.asset.json";
import opRibs3Img from "@/assets/photo/op-ribs-3.jpg.asset.json";
import ribeye2Img from "@/assets/photo/ribeye-2.jpg.asset.json";
import ribeye3Img from "@/assets/photo/ribeye-3.jpg.asset.json";
import shortRib2Img from "@/assets/photo/short-rib-2.jpg.asset.json";
import shortRib3Img from "@/assets/photo/short-rib-3.jpg.asset.json";
import slice2Img from "@/assets/photo/slice-2.jpg.asset.json";
import slice3Img from "@/assets/photo/slice-3.jpg.asset.json";
import striploin2Img from "@/assets/photo/striploin-2.jpg.asset.json";
import striploin3Img from "@/assets/photo/striploin-3.jpg.asset.json";
import tbone2Img from "@/assets/photo/tbone-2.jpg.asset.json";
import tbone3Img from "@/assets/photo/tbone-3.jpg.asset.json";
import tenderloin2Img from "@/assets/photo/tenderloin-2.jpg.asset.json";
import tomahawk2Img from "@/assets/photo/tomahawk-2.jpg.asset.json";
import tomahawk3Img from "@/assets/photo/tomahawk-3.jpg.asset.json";
import type { InventoryItem } from "./inventory";

/** Real (non-AI) reference photography, licensed CC0/CC-BY — see docs/IMAGE_CREDITS.md. */
export const FEATURE_IMAGES = [
  { key: "ribeye", label: "Ribeye / cuberoll", src: ribeyeImg.url },
  { key: "tenderloin", label: "Tenderloin", src: tenderloinImg.url },
  { key: "striploin", label: "Striploin / sirloin", src: striploinImg.url },
  { key: "tomahawk", label: "Tomahawk", src: tomahawkImg.url },
  { key: "tbone", label: "T-bone / porterhouse", src: tboneImg.url },
  { key: "op-ribs", label: "OP ribs (rib bone-in)", src: opRibsImg.url },
  { key: "short-rib", label: "Short rib", src: shortRibImg.url },
  { key: "chuck", label: "Chuck", src: chuckImg.url },
  { key: "brisket", label: "Brisket", src: brisketImg.url },
  { key: "knuckle", label: "Knuckle / round", src: knuckleImg.url },
  { key: "slice", label: "Sliced beef", src: sliceImg.url },
  { key: "lamb-rack", label: "Lamb rack", src: lambRackImg.url },
  { key: "offal", label: "Offal", src: offalImg.url },
  { key: "bone", label: "Bone", src: boneImg.url },
] as const;

/** Marbling reference photos, one per grade band. */
export const GRADE_IMAGES: Record<string, string> = {
  UNGRADED: gradeUngradedImg.url,
  MB0_2: gradeMb02Img.url,
  MB2_4: gradeMb24Img.url,
  MB4_6: gradeMb46Img.url,
  MB6_9: gradeMb69Img.url,
  MB9_12: gradeMb912Img.url,
};

/** Legacy preset keys stored on inventory rows before the photo library refresh. */
const IMAGE_ALIASES: Record<string, string> = {
  "wagyu-ribeye": "ribeye",
  cuberoll: "ribeye",
  sirloin: "striploin",
};

export const FEATURED_RANKS = [1, 2, 3, 4, 5] as const;

/** Resolves a stored image reference (preset key or absolute URL) to a src. */
export function resolveFeatureImage(value: string | null | undefined): string {
  if (!value) return FEATURE_IMAGES[0].src;
  if (/^https?:\/\//i.test(value) || value.startsWith("/__l5e/") || value.startsWith("/"))
    return value;
  const key = IMAGE_ALIASES[value] ?? value;
  return FEATURE_IMAGES.find((i) => i.key === key)?.src ?? FEATURE_IMAGES[0].src;
}


/** Additional real photos per cut so repeated cuts don't all show the same picture. */
const CUT_VARIANTS: Record<string, readonly string[]> = {
  ribeye: [ribeyeImg.url, ribeye2Img.url, ribeye3Img.url],
  tenderloin: [tenderloinImg.url, tenderloin2Img.url],
  striploin: [striploinImg.url, striploin2Img.url, striploin3Img.url],
  tomahawk: [tomahawkImg.url, tomahawk2Img.url, tomahawk3Img.url],
  tbone: [tboneImg.url, tbone2Img.url, tbone3Img.url],
  "op-ribs": [opRibsImg.url, opRibs2Img.url, opRibs3Img.url],
  "short-rib": [shortRibImg.url, shortRib2Img.url, shortRib3Img.url],
  chuck: [chuckImg.url, chuck2Img.url],
  brisket: [brisketImg.url, brisket2Img.url],
  knuckle: [knuckleImg.url, knuckle2Img.url, knuckle3Img.url],
  slice: [sliceImg.url, slice2Img.url, slice3Img.url],
  "lamb-rack": [lambRackImg.url, lambRack2Img.url, lambRack3Img.url],
  offal: [offalImg.url, offal2Img.url, offal3Img.url],
  bone: [boneImg.url, bone2Img.url, bone3Img.url],
};

/** Stable hash so an item always keeps the same photo across renders and sessions. */
function seedIndex(seed: string, length: number): number {
  if (length <= 1) return 0;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % length;
}

/** Picks one of the real photos for a cut, varied deterministically by item. */
export function pickCutPhoto(key: string, seed: string): string {
  const pool = CUT_VARIANTS[key];
  if (!pool || pool.length === 0) return resolveFeatureImage(key);
  return pool[seedIndex(seed, pool.length)];
}

/** Cut keywords → photo key, most specific first. */
const CUT_MATCHES: readonly (readonly [string, string])[] = [
  ["tomahawk", "tomahawk"],
  ["porterhouse", "tbone"],
  ["t-bone", "tbone"],
  ["tbone", "tbone"],
  ["shortloin", "tbone"],
  ["op rib", "op-ribs"],
  ["op-rib", "op-ribs"],
  ["bone in ribeye", "op-ribs"],
  ["rib bone", "op-ribs"],
  ["prime rib", "op-ribs"],
  ["short rib", "short-rib"],
  ["shortrib", "short-rib"],
  ["short plate", "short-rib"],
  ["iga", "short-rib"],
  ["ribeye", "ribeye"],
  ["rib eye", "ribeye"],
  ["cube roll", "ribeye"],
  ["cuberoll", "ribeye"],
  ["ancho", "ribeye"],
  ["tenderloin", "tenderloin"],
  ["fillet", "tenderloin"],
  ["filet", "tenderloin"],
  ["chateaubriand", "tenderloin"],
  ["striploin", "striploin"],
  ["strip loin", "striploin"],
  ["ny strip", "striploin"],
  ["sirloin", "striploin"],
  ["contra file", "striploin"],
  ["brisket", "brisket"],
  ["sandung", "brisket"],
  ["chuck", "chuck"],
  ["blade", "chuck"],
  ["knuckle", "knuckle"],
  ["round", "knuckle"],
  ["topside", "knuckle"],
  ["silverside", "knuckle"],
  ["rump", "knuckle"],
  ["picanha", "knuckle"],
  ["slice", "slice"],
  ["shabu", "slice"],
  ["yakiniku", "slice"],
  ["lamb", "lamb-rack"],
  ["domba", "lamb-rack"],
  ["mutton", "lamb-rack"],
  ["liver", "offal"],
  ["hati", "offal"],
  ["tripe", "offal"],
  ["babat", "offal"],
  ["oxtail", "offal"],
  ["buntut", "offal"],
  ["tongue", "offal"],
  ["lidah", "offal"],
  ["marrow", "bone"],
  ["bone", "bone"],
  ["tulang", "bone"],
] as const;

function matchCut(text: string): string | null {
  const n = text.toLowerCase();
  return CUT_MATCHES.find(([needle]) => n.includes(needle))?.[1] ?? null;
}

/** Best-effort catalog artwork: admin image first, then cut match, grade match, category. */
export function resolveProductImage(
  imageUrl: string | null | undefined,
  name: string | null | undefined,
  category: string | null | undefined,
  gradeBand?: string | null,
  cutType?: string | null,
  seed?: string | null,
): string {
  if (imageUrl) return resolveFeatureImage(imageUrl);
  const variantSeed = `${seed ?? ""}|${name ?? ""}|${gradeBand ?? ""}`;
  const byCut = matchCut(cutType ?? "") ?? matchCut(name ?? "");
  if (byCut) return pickCutPhoto(byCut, variantSeed);
  if (category === "OFFAL") return pickCutPhoto("offal", variantSeed);
  if (category === "BONE") return pickCutPhoto("bone", variantSeed);
  if (gradeBand && GRADE_IMAGES[gradeBand]) return GRADE_IMAGES[gradeBand];
  if (category === "SECOND_CUT") return pickCutPhoto("chuck", variantSeed);
  return pickCutPhoto("striploin", variantSeed);
}


export type FeaturedItem = Pick<
  InventoryItem,
  "id" | "name" | "origin" | "brand" | "condition" | "avg_weight_text" | "featured_rank" | "image_url"
> & {
  /** Final public price per kg (promo price when active), computed server-side. */
  public_price_idr: number;
  /** Normal price per kg before any promo. */
  list_price_idr: number;
};

/** Public read of the admin-curated featured inventory, ordered 1 → 5.
 *  Uses a safe RPC so internal cost and stock figures never leave the server. */
export function useFeaturedInventory(limit = 5) {
  return useQuery({
    queryKey: ["featured-inventory", limit],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("ml_public_featured", { _limit: limit });
      if (error) throw error;
      return (data ?? []) as unknown as FeaturedItem[];
    },
  });
}

