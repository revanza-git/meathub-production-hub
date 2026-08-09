import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { useDemoRole, ROLE_LABEL, ROLE_NAV, ROLE_HOME, type Role } from "@/lib/market/role";

/**
 * Sub-navigasi dasbor per peran: menampilkan area kerja yang relevan
 * untuk peran aktif, plus pintasan ke dasbor peran lain (mode demo).
 */
export function RoleNav({ current }: { current: Role }) {
  const { role, setRole } = useDemoRole();
  const items = ROLE_NAV[current] ?? [];
  const others = (Object.keys(ROLE_NAV) as Role[]).filter((r) => r !== current && r !== "guest");

  return (
    <div className="mb-5 rounded-xl border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="bg-maroon text-white">{ROLE_LABEL[current]}</Badge>
        <span className="text-xs text-muted-foreground">Area kerja Anda</span>
      </div>

      <nav aria-label={`Menu ${ROLE_LABEL[current]}`} className="mt-3 flex flex-wrap gap-2">
        {items.map((it) => (
          <Link
            key={`${it.to}-${it.label}`}
            to={it.to as never}
            className="rounded-lg border border-border px-3 py-2 text-left transition-colors hover:border-maroon hover:bg-maroon/5"
            activeProps={{ className: "border-maroon bg-maroon/10" }}
            activeOptions={{ exact: true }}
          >
            <span className="block text-xs font-semibold text-ink">{it.label}</span>
            <span className="block text-[11px] text-muted-foreground">{it.desc}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
          Dasbor peran lain (demo)
        </span>
        {others.map((r) => (
          <Link
            key={r}
            to={ROLE_HOME[r] as never}
            onClick={() => setRole(r)}
            className="rounded-full border border-dashed border-accent px-3 py-1 text-[11px] text-ink-soft hover:bg-accent/10"
          >
            {ROLE_LABEL[r]}
          </Link>
        ))}
        {role !== current ? (
          <span className="text-[11px] text-muted-foreground">
            (peran aktif: {ROLE_LABEL[role]})
          </span>
        ) : null}
      </div>
    </div>
  );
}
