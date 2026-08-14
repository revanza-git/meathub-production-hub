import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell, Panel, RoleGate } from "@/components/app/app-shell";
import { Field, SelectInput, TextArea, TextInput } from "@/components/site/form-kit";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PAYMENT_TERMS, type PaymentTerm } from "@/lib/meatlink/orders";

export const Route = createFileRoute("/_authenticated/app/orders/new")({
  component: NewOrderPage,
});

function NewOrderPage() {
  return (
    <AppShell
      title="New order"
      intro="Describe what you need. Our team matches it against live supplier stock and confirms."
    >
      <RoleGate allow="buyer">
        <NewOrderForm />
      </RoleGate>
    </AppShell>
  );
}

function NewOrderForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({
    buyer_name: "",
    product_text: "",
    qty_kg: "",
    payment_term: "CBD" as PaymentTerm,
    delivery_location: "",
    needed_by: "",
    buyer_notes: "",
  });

  useEffect(() => {
    const meta = user?.user_metadata as { display_name?: string } | undefined;
    if (meta?.display_name) setForm((f) => (f.buyer_name ? f : { ...f, buyer_name: meta.display_name! }));
  }, [user]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const qty = Number(form.qty_kg);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error("Enter a quantity in kilograms.");
      return;
    }
    setPending(true);
    try {
      const { error } = await supabase.from("buyer_orders").insert({
        user_id: user.id,
        buyer_name: form.buyer_name.trim(),
        product_text: form.product_text.trim(),
        qty_kg: qty,
        payment_term: form.payment_term,
        delivery_location: form.delivery_location.trim() || null,
        needed_by: form.needed_by || null,
        buyer_notes: form.buyer_notes.trim() || null,
      });
      if (error) throw error;
      toast.success("Order submitted. Status is Pending.");
      void navigate({ to: "/app/orders" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit the order");
    } finally {
      setPending(false);
    }
  }

  return (
    <Panel className="max-w-3xl p-6 lg:p-8">
      <form onSubmit={submit} className="grid gap-5">
        <Field label="Buyer name" required>
          <TextInput
            required
            value={form.buyer_name}
            onChange={(e) => set("buyer_name", e.target.value)}
            placeholder="Company or contact name"
          />
        </Field>
        <Field label="Product" required hint="Free text — describe the cut, grade and origin you want.">
          <TextInput
            required
            value={form.product_text}
            onChange={(e) => set("product_text", e.target.value)}
            placeholder="e.g. Australian Wagyu Ribeye MB6-7"
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Quantity (kg)" required>
            <TextInput
              required
              inputMode="decimal"
              value={form.qty_kg}
              onChange={(e) => set("qty_kg", e.target.value)}
              placeholder="120"
            />
          </Field>
          <Field label="Payment system" required>
            <SelectInput
              value={form.payment_term}
              onChange={(e) => set("payment_term", e.target.value as PaymentTerm)}
            >
              {PAYMENT_TERMS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Delivery location">
            <TextInput
              value={form.delivery_location}
              onChange={(e) => set("delivery_location", e.target.value)}
              placeholder="City / warehouse"
            />
          </Field>
          <Field label="Needed by">
            <TextInput
              type="date"
              value={form.needed_by}
              onChange={(e) => set("needed_by", e.target.value)}
            />
          </Field>
        </div>
        <Field label="Notes">
          <TextArea
            value={form.buyer_notes}
            onChange={(e) => set("buyer_notes", e.target.value)}
            placeholder="Packaging, tolerance on grade, delivery windows…"
          />
        </Field>
        <div>
          <button
            type="submit"
            disabled={pending}
            className="eyebrow bg-crimson px-6 py-4 text-bone transition-colors hover:bg-crimson-deep disabled:opacity-60"
          >
            {pending ? "Submitting…" : "Submit order"}
          </button>
        </div>
      </form>
    </Panel>
  );
}
