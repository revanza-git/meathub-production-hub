import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Role = "guest" | "buyer" | "vendor" | "admin";

const KEY = "meathub.demo.role";

type Ctx = { role: Role; setRole: (r: Role) => void; isLoggedIn: boolean };
const RoleContext = createContext<Ctx>({ role: "guest", setRole: () => {}, isLoggedIn: false });

export function DemoRoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>("guest");

  useEffect(() => {
    const saved = localStorage.getItem(KEY) as Role | null;
    if (saved) setRoleState(saved);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      role,
      isLoggedIn: role !== "guest",
      setRole: (r) => {
        setRoleState(r);
        localStorage.setItem(KEY, r);
      },
    }),
    [role],
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export const useDemoRole = () => useContext(RoleContext);

export const ROLE_LABEL: Record<Role, string> = {
  guest: "Tamu (belum login)",
  buyer: "Pembeli",
  vendor: "Vendor",
  admin: "Admin MEATHUB",
};
