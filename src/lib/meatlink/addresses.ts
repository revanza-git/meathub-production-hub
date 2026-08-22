import { supabase } from "@/integrations/supabase/client";

export type BuyerAddress = {
  id: string;
  label: string;
  buyer_name: string;
  company: string | null;
  phone: string;
  email: string | null;
  address: string;
  city: string | null;
  notes: string | null;
  is_default: boolean;
  created_at: string;
};

export type BuyerAddressInput = {
  label: string;
  buyer_name: string;
  company?: string;
  phone: string;
  email?: string;
  address: string;
  city?: string;
  notes?: string;
  is_default?: boolean;
};

const COLUMNS =
  "id, label, buyer_name, company, phone, email, address, city, notes, is_default, created_at";

export async function listAddresses(): Promise<BuyerAddress[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await supabase
    .from("ml_buyer_addresses")
    .select(COLUMNS)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as BuyerAddress[];
}

async function clearDefault(userId: string, keepId?: string) {
  let q = supabase
    .from("ml_buyer_addresses")
    .update({ is_default: false })
    .eq("user_id", userId)
    .eq("is_default", true);
  if (keepId) q = q.neq("id", keepId);
  const { error } = await q;
  if (error) throw error;
}

export async function saveAddress(input: BuyerAddressInput, id?: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error("Masuk terlebih dahulu untuk menyimpan alamat.");

  const payload = {
    user_id: userId,
    label: input.label.trim() || "Alamat",
    buyer_name: input.buyer_name.trim(),
    company: input.company?.trim() || null,
    phone: input.phone.trim(),
    email: input.email?.trim() || null,
    address: input.address.trim(),
    city: input.city?.trim() || null,
    notes: input.notes?.trim() || null,
    is_default: Boolean(input.is_default),
  };

  // The DB enforces a single default per buyer, so drop the old flag first.
  if (payload.is_default) await clearDefault(userId, id);

  if (id) {
    const { error } = await supabase
      .from("ml_buyer_addresses")
      .update(payload)
      .eq("id", id);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("ml_buyer_addresses").insert(payload);
  if (error) throw error;
}

export async function deleteAddress(id: string): Promise<void> {
  const { error } = await supabase.from("ml_buyer_addresses").delete().eq("id", id);
  if (error) throw error;
}

export async function makeDefault(id: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return;
  await clearDefault(userId, id);
  const { error } = await supabase
    .from("ml_buyer_addresses")
    .update({ is_default: true })
    .eq("id", id);
  if (error) throw error;
}
