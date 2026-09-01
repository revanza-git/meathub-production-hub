import { useEffect, useState } from "react";

export type ShopMode = "bulk" | "retail";
export type SaleUnit = "RETAIL" | "LOAF" | "CTN" | "TON";

export const SALE_UNITS: readonly SaleUnit[] = ["RETAIL", "LOAF", "CTN", "TON"];

export const UNIT_LABEL: Record<SaleUnit, { id: string; en: string }> = {
  RETAIL: { id: "Ritel", en: "Retail" },
  LOAF: { id: "Loaf", en: "Loaf" },
  CTN: { id: "Karton", en: "Carton" },
  TON: { id: "Ton", en: "Ton" },
};

const STORAGE_KEY = "meatlink.mode";
const EVENT = "meatlink:mode";

export function getShopMode(): ShopMode | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "bulk" || v === "retail" ? v : null;
}

export function setShopMode(mode: ShopMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, mode);
  window.dispatchEvent(new Event(EVENT));
}

/** Reactive shopping-mode hook persisted in localStorage. */
export function useShopMode(): [ShopMode | null, (mode: ShopMode) => void] {
  const [mode, setMode] = useState<ShopMode | null>(null);
  useEffect(() => {
    const sync = () => setMode(getShopMode());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return [mode, setShopMode];
}

/** Sale units a mode unlocks in the catalogue. */
export function modeUnits(mode: ShopMode): SaleUnit[] {
  return mode === "retail" ? ["RETAIL"] : ["LOAF", "CTN", "TON"];
}

/** Short bilingual badge describing which channels a product sells in. */
export function channelsBadge(channels: string[] | null | undefined): { id: string; en: string } {
  const set = new Set(channels && channels.length > 0 ? channels : ["LOAF", "CTN", "TON"]);
  const retail = set.has("RETAIL");
  const bulk = set.has("LOAF") || set.has("CTN") || set.has("TON");
  if (retail && bulk) return { id: "Ritel & B2B", en: "Retail & B2B" };
  if (retail) return { id: "Ritel saja", en: "Retail only" };
  if (!set.has("LOAF")) return { id: "B2B — min. karton", en: "B2B — carton min." };
  return { id: "B2B — loaf s/d ton", en: "B2B — loaf to ton" };
}
