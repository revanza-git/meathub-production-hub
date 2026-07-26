import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type UserRoleInfo = {
  userId: string;
  memberships: Array<{
    organization_id: string;
    role: string;
    organization: { id: string; display_name: string; type: string; status: string };
  }>;
  isInternal: boolean;
  isBuyer: boolean;
  isVendor: boolean;
};

const INTERNAL_ROLES = new Set([
  "hub_operator",
  "courier",
  "qc_officer",
  "finance_operator",
  "support",
  "platform_admin",
  "auditor",
]);
const BUYER_ROLES = new Set(["buyer_owner", "buyer_purchaser", "buyer_finance"]);
const VENDOR_ROLES = new Set(["vendor_admin", "vendor_operator"]);

/**
 * Returns the current user's org memberships + role classification.
 * Used by protected routes to decide buyer vs partner vs onboarding surface.
 */
export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UserRoleInfo> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("organization_members")
      .select("organization_id, role, organizations(id, display_name, type, status)")
      .eq("user_id", userId)
      .eq("status", "ACTIVE");
    if (error) throw error;
    const memberships = (data ?? []).map((m) => ({
      organization_id: m.organization_id,
      role: m.role,
      organization: m.organizations as {
        id: string;
        display_name: string;
        type: string;
        status: string;
      },
    }));
    return {
      userId,
      memberships,
      isInternal: memberships.some((m) => INTERNAL_ROLES.has(m.role)),
      isBuyer: memberships.some((m) => BUYER_ROLES.has(m.role)),
      isVendor: memberships.some((m) => VENDOR_ROLES.has(m.role)),
    };
  });
