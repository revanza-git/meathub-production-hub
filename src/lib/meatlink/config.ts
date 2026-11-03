export const TRANSFER_ACCOUNT = { bank: "BCA", number: "5271200847", holder: "Rizal Abdurrachman" } as const;

export const CONTACT_EMAIL = "cs@meatlink.id";

export function chatLink(message = "") {
  return `/chat?context=${encodeURIComponent(message.slice(0, 300))}`;
}

export const CATEGORIES = [
  { slug: "beef", name: "Beef", note: "Grassfed, grainfed, prime cuts" },
  { slug: "wagyu", name: "Wagyu", note: "MB4 to MB12, AUS & JP" },
  { slug: "lamb", name: "Lamb", note: "NZ & AUS racks, legs, shoulder" },
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
