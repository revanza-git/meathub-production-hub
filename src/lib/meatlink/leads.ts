import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const text = (max: number) => z.string().trim().max(max);
const required = (label: string, max = 160) =>
  z
    .string()
    .trim()
    .min(1, { message: `${label} is required` })
    .max(max, { message: `${label} must be under ${max} characters` });

export const rfqItemSchema = z.object({
  category: text(60).optional().or(z.literal("")),
  product_cut: required("Product / cut"),
  origin_preference: text(120).optional().or(z.literal("")),
  brand_preference: text(120).optional().or(z.literal("")),
  grade: text(120).optional().or(z.literal("")),
  volume: required("Volume", 120),
  notes: text(300).optional().or(z.literal("")),
});

export type RfqItem = z.infer<typeof rfqItemSchema>;

export const emptyRfqItem = (): RfqItem => ({
  category: "",
  product_cut: "",
  origin_preference: "",
  brand_preference: "",
  grade: "",
  volume: "",
  notes: "",
});

export const rfqSchema = z.object({
  company_name: required("Company name"),
  contact_name: required("Contact name"),
  whatsapp: required("WhatsApp number", 32),
  email: text(255).email({ message: "Enter a valid email" }).optional().or(z.literal("")),
  delivery_location: required("Delivery location"),
  items: z
    .array(rfqItemSchema)
    .min(1, { message: "Add at least one item" })
    .max(30, { message: "Maximum 30 items per request" }),
  purchase_frequency: text(120).optional().or(z.literal("")),
  current_supplier: text(160).optional().or(z.literal("")),
  current_price: text(80).optional().or(z.literal("")),
  target_price: text(80).optional().or(z.literal("")),
  payment_terms: text(120).optional().or(z.literal("")),
  required_delivery_date: required("Required delivery date", 120),
  notes: text(1000).optional().or(z.literal("")),
});

export type RfqInput = z.infer<typeof rfqSchema>;

export const supplierSchema = z.object({
  company_name: required("Company name"),
  contact_name: required("Contact name"),
  whatsapp: required("WhatsApp number", 32),
  email: text(255).email({ message: "Enter a valid email" }).optional().or(z.literal("")),
  brands_represented: text(500).optional().or(z.literal("")),
  origins: text(300).optional().or(z.literal("")),
  product_categories: text(300).optional().or(z.literal("")),
  delivery_coverage: text(300).optional().or(z.literal("")),
  moq: text(120).optional().or(z.literal("")),
  payment_terms: text(160).optional().or(z.literal("")),
  notes: text(1000).optional().or(z.literal("")),
});

export type SupplierInput = z.infer<typeof supplierSchema>;

export async function submitRfq(input: RfqInput) {
  const { items, ...rest } = input;
  const first = items[0]!;
  const extraItems = items.slice(1);
  const itemSummary = extraItems.length
    ? extraItems
        .map(
          (i, idx) =>
            `Item ${idx + 2}: ${i.product_cut} — ${i.volume}` +
            [i.grade && `grade ${i.grade}`, i.origin_preference && `origin ${i.origin_preference}`, i.brand_preference && `brand ${i.brand_preference}`, i.notes]
              .filter(Boolean)
              .map((s) => ` | ${s}`)
              .join(""),
        )
        .join("\n")
    : "";

  const { data: auth } = await supabase.auth.getUser();

  const payload = {
    ...rest,
    user_id: auth.user?.id ?? null,
    items,
    category: first.category ?? "",
    product_cut: first.product_cut,
    origin_preference: first.origin_preference ?? "",
    brand_preference: first.brand_preference ?? "",
    grade: first.grade ?? "",
    volume: first.volume,
    notes: [rest.notes, first.notes, itemSummary].filter(Boolean).join("\n").slice(0, 4000),
  };

  const { error } = await supabase.from("quote_requests").insert(payload);
  if (error) throw new Error(error.message);
}

export async function submitSupplier(input: SupplierInput) {
  const { error } = await supabase.from("supplier_applications").insert(input);
  if (error) throw new Error(error.message);
}

export function rfqWhatsappMessage(v: RfqInput) {
  return [
    "Hi Meatlink, I just submitted an RFQ.",
    `Company: ${v.company_name}`,
    `Contact: ${v.contact_name}`,
    `Items (${v.items.length}):`,
    ...v.items.map(
      (i, idx) => `${idx + 1}. ${i.product_cut}${i.grade ? ` (${i.grade})` : ""} — ${i.volume}`,
    ),
    `Delivery to: ${v.delivery_location}`,
    `Needed by: ${v.required_delivery_date}`,
  ].join("\n");
}

export function supplierWhatsappMessage(v: SupplierInput) {
  return [
    "Hi Meatlink, I would like to supply through the network.",
    `Company: ${v.company_name}`,
    `Contact: ${v.contact_name}`,
    v.product_categories ? `Categories: ${v.product_categories}` : "",
    v.origins ? `Origins: ${v.origins}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
