/**
 * Meatlink.id Phase 1 operating constants.
 * Update WHATSAPP_NUMBER to the live Meatlink WhatsApp Business line.
 */

/** International format, digits only — used to build wa.me links. */
export const WHATSAPP_NUMBER = "628978872745";

export const CONTACT_EMAIL = "cs@meatlink.id";

export function waLink(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message.slice(0, 1200))}`;
}

export const CATEGORIES = [
  { slug: "beef", name: "Beef", note: "Grassfed, grainfed, prime cuts" },
  { slug: "wagyu", name: "Wagyu", note: "MB4 to MB12, AUS & JP" },
  { slug: "lamb", name: "Lamb", note: "NZ & AUS racks, legs, shoulder" },
  { slug: "poultry", name: "Poultry", note: "Chicken, duck, specialty" },
  { slug: "seafood", name: "Seafood", note: "Frozen & chilled programmes" },
] as const;

export const RECENTLY_SOURCED = [
  {
    product: "Australian Wagyu Ribeye MB6-7",
    location: "Jakarta",
    segment: "HORECA",
    volume: "80 kg / month",
    status: "Successfully matched",
  },
  {
    product: "NZ Lamb Rack Frenched",
    location: "Bali",
    segment: "Fine dining",
    volume: "120 kg / month",
    status: "Successfully matched",
  },
  {
    product: "US Prime Tenderloin",
    location: "Surabaya",
    segment: "Hotel group",
    volume: "220 kg / month",
    status: "Successfully matched",
  },
] as const;
