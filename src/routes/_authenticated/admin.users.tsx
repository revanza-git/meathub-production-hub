import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell, Panel, RoleGate } from "@/components/app/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
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
type AuditRow = {
  id: string;
  target_user_id: string;
  actor_user_id: string | null;
  from_role: MlRole | null;
  to_role: MlRole;
  reason: string | null;
  created_at: string;
};

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
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [roles, profiles, audit] = await Promise.all([
        supabase.from("ml_user_roles").select("id, user_id, role, created_at"),
        supabase.from("profiles").select("id, email, display_name, phone"),
        supabase
          .from("ml_role_audit")
          .select("id, target_user_id, actor_user_id, from_role, to_role, reason, created_at")
          .order("created_at", { ascending: false })
          .limit(30),
      ]);
      if (roles.error) throw roles.error;
      return {
        roles: (roles.data ?? []) as RoleRow[],
        profiles: (profiles.data ?? []) as ProfileRow[],
        audit: (audit.data ?? []) as AuditRow[],
      };
    },
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: MlRole }) => {
      const { error } = await supabase.rpc("ml_set_user_role", {
        _user_id: userId,
        _role: role,
        _reason: "Changed from admin console",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role updated.");
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update role"),
  });

  const byId = new Map((data?.profiles ?? []).map((p) => [p.id, p]));
  const rows = (data?.roles ?? []).slice().sort((a, b) => a.role.localeCompare(b.role));

  if (isLoading) return <p className="text-sm text-ash">Loading users…</p>;
  if (rows.length === 0)
    return <Panel className="p-10 text-center text-sm text-ash">No accounts yet.</Panel>;

  return (
    <div className="grid gap-8">
      <Panel className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
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
              const isSelf = r.user_id === user?.id;
              return (
                <tr key={r.id} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-3 text-ink">{p?.display_name ?? "—"}</td>
                  <td className="px-4 py-3 text-ash">{p?.email ?? r.user_id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-ash">{p?.phone ?? "—"}</td>
                  <td className="px-4 py-3">
                    <select
                      value={r.role}
                      disabled={setRole.isPending || (isSelf && r.role === "admin")}
                      onChange={(e) =>
                        setRole.mutate({ userId: r.user_id, role: e.target.value as MlRole })
                      }
                      className="border border-line bg-bone px-3 py-2 text-sm text-ink disabled:opacity-60"
                      aria-label={`Role for ${p?.email ?? r.user_id}`}
                    >
                      {(Object.keys(ROLE_LABEL) as MlRole[]).map((role) => (
                        <option key={role} value={role}>
                          {ROLE_LABEL[role]}
                        </option>
                      ))}
                    </select>
                    {isSelf && r.role === "admin" ? (
                      <span className="ml-2 text-xs text-ash">(you)</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-xs text-ash">{formatDate(r.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>

      <section>
        <h2 className="font-display text-xl text-ink">Role change history</h2>
        <Panel className="mt-3 divide-y divide-line/60">
          {(data?.audit ?? []).length === 0 ? (
            <p className="p-6 text-sm text-ash">No role changes recorded yet.</p>
          ) : (
            (data?.audit ?? []).map((a) => (
              <div key={a.id} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm">
                <span className="text-ink">
                  {byId.get(a.target_user_id)?.email ?? a.target_user_id.slice(0, 8)} —{" "}
                  {a.from_role ? ROLE_LABEL[a.from_role] : "none"} → {ROLE_LABEL[a.to_role]}
                </span>
                <span className="text-xs text-ash">
                  by {a.actor_user_id ? (byId.get(a.actor_user_id)?.email ?? "admin") : "system"} ·{" "}
                  {formatDate(a.created_at)}
                </span>
              </div>
            ))
          )}
        </Panel>
      </section>
    </div>
  );
}

