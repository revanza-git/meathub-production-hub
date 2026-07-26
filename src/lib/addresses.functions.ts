import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ServiceZone = "JKT_INNER" | "JKT_OUTER" | "BODETABEK" | "OUT_OF_ZONE";

export type Address = {
  id: string;
  organization_id: string;
  label: string;
  recipient_name: string;
  phone: string;
  address_lines: string;
  district: string | null;
  city: string;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  service_zone: ServiceZone | null;
  is_active: boolean;
  created_at: string;
};

/**
 * Very rough service-zone resolver for MVP. Real geocoding is a founder-decision
 * item (Google/Mapbox). This maps by city keyword so buyers can complete flows.
 */
function resolveServiceZone(city: string): ServiceZone {
  const c = city.trim().toLowerCase();
  if (["jakarta pusat", "jakarta selatan", "jakarta barat"].some((x) => c.includes(x))) return "JKT_INNER";
  if (["jakarta timur", "jakarta utara"].some((x) => c.includes(x))) return "JKT_OUTER";
  if (["bogor", "depok", "tangerang", "bekasi", "bodetabek"].some((x) => c.includes(x))) return "BODETABEK";
  return "OUT_OF_ZONE";
}

export const listAddresses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ organization_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<Address[]> => {
    const { data: rows, error } = await context.supabase
      .from("addresses")
      .select(
        "id, organization_id, label, recipient_name, phone, address_lines, district, city, postal_code, latitude, longitude, service_zone, is_active, created_at",
      )
      .eq("organization_id", data.organization_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []) as Address[];
  });

const UpsertSchema = z.object({
  id: z.string().uuid().optional(),
  organization_id: z.string().uuid(),
  label: z.string().min(1).max(60),
  recipient_name: z.string().min(1).max(120),
  phone: z.string().min(6).max(30),
  address_lines: z.string().min(4).max(400),
  district: z.string().max(120).optional().nullable(),
  city: z.string().min(2).max(120),
  postal_code: z.string().max(20).optional().nullable(),
});

export const upsertAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    const zone = resolveServiceZone(data.city);
    const payload = {
      organization_id: data.organization_id,
      label: data.label,
      recipient_name: data.recipient_name,
      phone: data.phone,
      address_lines: data.address_lines,
      district: data.district ?? null,
      city: data.city,
      postal_code: data.postal_code ?? null,
      service_zone: zone,
      is_active: true,
    };
    if (data.id) {
      const { error } = await context.supabase.from("addresses").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id, service_zone: zone };
    }
    const { data: row, error } = await context.supabase
      .from("addresses")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string, service_zone: zone };
  });

export const deleteAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("addresses").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
