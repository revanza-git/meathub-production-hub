import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { MlRole } from "@/lib/meatlink/orders";

export type AuthState = {
  loading: boolean;
  user: User | null;
  role: MlRole | null;
  contactComplete: boolean;
};

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ loading: true, user: null, role: null, contactComplete: false });

  useEffect(() => {
    let active = true;

    async function load(user: User | null) {
      if (!user) {
        if (active) setState({ loading: false, user: null, role: null, contactComplete: false });
        return;
      }
      const [roles, profile] = await Promise.all([
        supabase.from("ml_user_roles").select("role").eq("user_id", user.id).limit(1).maybeSingle(),
        supabase.from("profiles").select("email, phone").eq("id", user.id).maybeSingle(),
      ]);
      if (active) setState({
        loading: false,
        user,
        role: (roles.data?.role as MlRole) ?? "buyer",
        contactComplete: !profile.error && !!profile.data?.email?.trim() && !!profile.data?.phone?.trim(),
      });
    }

    void supabase.auth.getUser().then(({ data }) => load(data.user ?? null));

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      void load(session?.user ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}

export function homeForRole(role: MlRole | null) {
  if (role === "admin") return "/admin/orders" as const;
  if (role === "vendor") return "/vendor/catalog" as const;
  return "/app/orders" as const;
}
