import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listMyOrders } from "@/lib/orders.functions";

export const Route = createFileRoute("/_authenticated/buyer/orders")({
  head: () => ({ meta: [{ title: "Pesanan — MEATHUB" }, { name: "robots", content: "noindex" }] }),
  component: OrdersPage,
});

const fmt = (n: number) => `Rp ${Number(n).toLocaleString("id-ID")}`;

function OrdersPage() {
  const list = useServerFn(listMyOrders);
  const { data, isLoading } = useQuery({ queryKey: ["orders"], queryFn: () => list() });

  return (
    <AppShell title="MEATHUB" subtitle="Riwayat pesanan">
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Semua pesanan</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <div className="text-sm text-muted-foreground">Memuat…</div> : null}
            {data && data.length === 0 ? (
              <div className="text-sm text-muted-foreground">Belum ada pesanan.</div>
            ) : null}
            <ul className="divide-y">
              {(data ?? []).map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <Link to="/buyer/orders/$id" params={{ id: o.id }} className="font-medium hover:underline">
                      {o.order_no}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {new Date(o.placed_at).toLocaleString("id-ID")} · {Number(o.total_kg).toFixed(2)} kg
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{o.status.replaceAll("_", " ")}</Badge>
                    <div className="text-right font-semibold">{fmt(o.total_amount)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
