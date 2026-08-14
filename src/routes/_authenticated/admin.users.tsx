import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell, Panel, RoleGate } from "@/components/app/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, type MlRole } from "@/lib/meatlink/orders";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsersPage,
});

const ROLE_LABEL: Record<MlRole, string> = {
  buyer: "Buyer",
  vendor: "Supplier",
  admin: "Admin",
};

type RoleRow = { id: string; user_id: string; role: MlRole; created_at: string };
type ProfileRow = { id: string; email: string; display_name: string | null; phone: string | null };

function AdminUsersPage() {
  return (
    <AppShell title="Users" intro="Accounts registered on the Meatlink workspace and their roles.">
      <RoleGate allow="admin">
        <UsersBody />
      </RoleGate>
    </AppShell>
  );
}

function UsersBody() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [roles, profiles] = await Promise.all([
        supabase.from("ml_user_roles").select("id, user_id, role, created_at"),
        supabase.from("profiles").select("id, email, display_name, phone"),
      ]);
      if (roles.error) throw roles.error;
      return {
        roles: (roles.data ?? []) as RoleRow[],
        profiles: (profiles.data ?? []) as ProfileRow[],
      };
    },
  });

  const byId = new Map((data?.profiles ?? []).map((p) => [p.id, p]));
  const rows = (data?.roles ?? []).slice().sort((a, b) => a.role.localeCompare(b.role));

  return isLoading ? (
    <p className="text-sm text-ash">Loading users…</p>
  ) : rows.length === 0 ? (
    <Panel className="p-10 text-center text-sm text-ash">No accounts yet.</Panel>
  ) : (
    <Panel className="overflow-x-auto">
      <table className="w-full min-w-[680px] text-left text-sm">
        <thead className="border-b border-line text-xs uppercase tracking-[0.16em] text-ash">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Phone</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Joined</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const p = byId.get(r.user_id);
            return (
              <tr key={r.id} className="border-b border-line/60 last:border-0">
                <td className="px-4 py-3 text-ink">{p?.display_name ?? "—"}</td>
                <td className="px-4 py-3 text-ash">{p?.email ?? r.user_id.slice(0, 8)}</td>
                <td className="px-4 py-3 text-ash">{p?.phone ?? "—"}</td>
                <td className="px-4 py-3 text-ink">{ROLE_LABEL[r.role]}</td>
                <td className="px-4 py-3 text-xs text-ash">{formatDate(r.created_at)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Panel>
  );
}
