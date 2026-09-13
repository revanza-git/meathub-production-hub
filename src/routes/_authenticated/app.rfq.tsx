import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell, Panel, RoleGate } from "@/components/app/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatDate } from "@/lib/meatlink/orders";

export const Route = createFileRoute("/_authenticated/app/rfq")({
  component: MyRfqPage,
  head: () => ({
    meta: [
      { title: "My quote requests — Meatlink" },
      {
        name: "description",
        content: "Track the quote requests you submitted to the Meatlink sourcing team.",
      },
      { property: "og:title", content: "My quote requests — Meatlink" },
      {
        property: "og:description",
        content: "Track the quote requests you submitted to the Meatlink sourcing team.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type RfqItem = {
  product_cut?: string | null;
  grade?: string | null;
  volume?: string | null;
  origin_preference?: string | null;
  brand_preference?: string | null;
};

type MyRfq = {
  id: string;
  company_name: string;
  delivery_location: string;
  required_delivery_date: string;
  status: string;
  created_at: string;
  notes: string | null;
  items: RfqItem[] | null;
  reference_no: string;
  admin_response: string | null;
  response_valid_until: string | null;
};

const STATUS_COPY: Record<string, { label: string; hint: string; className: string }> = {
  new: {
    label: "Received",
    hint: "Our sourcing team has your request and is reviewing it.",
    className: "border-line text-ash",
  },
  in_review: {
    label: "In review",
    hint: "We are matching your request against the supplier network.",
    className: "border-crimson/40 text-crimson",
  },
  quoted: {
    label: "Quoted",
    hint: "A quote has been sent to you — check WhatsApp or email.",
    className: "border-crimson text-crimson",
  },
  won: {
    label: "Confirmed",
    hint: "This request turned into a confirmed order.",
    className: "border-crimson text-crimson",
  },
  lost: {
    label: "Closed",
    hint: "This request is closed. Submit a new one any time.",
    className: "border-line text-ash",
  },
};

function MyRfqPage() {
  return (
    <AppShell
      title="My quote requests"
      intro="Everything you submitted through the request form, and where it stands."
      actions={
        <Link
          to="/request-quote"
          className="eyebrow bg-crimson px-6 py-4 text-bone transition-colors hover:bg-crimson-deep"
        >
          New request
        </Link>
      }
    >
      <RoleGate allow="buyer">
        <MyRfqBody />
      </RoleGate>
    </AppShell>
  );
}

function MyRfqBody() {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    enabled: Boolean(user),
    queryKey: ["my-quote-requests", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_requests")
        .select(
          "id, company_name, delivery_location, required_delivery_date, status, created_at, notes, items, reference_no, admin_response, response_valid_until",
        )
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as MyRfq[];
    },
  });

  if (isLoading) return <p className="text-sm text-ash">Loading…</p>;
  if (error) return <p className="text-sm text-crimson">{(error as Error).message}</p>;

  if (!data?.length) {
    return (
      <Panel className="p-8">
        <h2 className="font-display text-xl text-ink">No requests yet</h2>
        <p className="mt-2 max-w-lg text-sm text-ash">
          Requests you submit while signed in appear here with their status. Older requests sent
          before you created an account stay with our sourcing team on WhatsApp.
        </p>
        <Link
          to="/request-quote"
          className="eyebrow mt-6 inline-flex bg-crimson px-6 py-4 text-bone transition-colors hover:bg-crimson-deep"
        >
          Submit a request
        </Link>
      </Panel>
    );
  }

  return (
    <div className="grid gap-4">
      {data.map((r) => {
        const status = STATUS_COPY[r.status] ?? {
          label: r.status,
          hint: "",
          className: "border-line text-ash",
        };
        return (
          <Panel key={r.id} className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="eyebrow mb-2 text-crimson">{r.reference_no}</p>
                <h2 className="font-display text-xl text-ink">{r.company_name}</h2>
                <p className="mt-1 text-xs text-ash">
                  Submitted {formatDate(r.created_at)} · Deliver to {r.delivery_location} · Needed{" "}
                  {r.required_delivery_date}
                </p>
              </div>
              <span className={`eyebrow border px-3 py-2 ${status.className}`}>{status.label}</span>
            </div>

            {status.hint ? <p className="mt-3 text-sm text-ash">{status.hint}</p> : null}

            <ul className="mt-5 grid gap-2 border-t border-line pt-4">
              {(r.items ?? []).map((item, i) => (
                <li key={i} className="text-sm text-ink">
                  <span className="text-ash">{i + 1}.</span> {item.product_cut}
                  {item.grade ? ` (${item.grade})` : ""} — {item.volume}
                  {item.origin_preference ? ` · ${item.origin_preference}` : ""}
                  {item.brand_preference ? ` · ${item.brand_preference}` : ""}
                </li>
              ))}
            </ul>
            {r.admin_response ? (
              <div className="mt-5 border-t border-line pt-4">
                <p className="eyebrow text-crimson">Respons Meatlink</p>
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-ink">{r.admin_response}</p>
                {r.response_valid_until ? <p className="mt-3 text-xs text-ash">Valid until {r.response_valid_until}</p> : null}
              </div>
            ) : null}
          </Panel>
        );
      })}
    </div>
  );
}
