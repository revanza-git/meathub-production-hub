import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { Field, SubmitButton, TextArea, TextInput } from "./form-kit";
import { waLink } from "@/lib/meatlink/config";
import {
  submitSupplier,
  supplierSchema,
  supplierWhatsappMessage,
  type SupplierInput,
} from "@/lib/meatlink/leads";

const EMPTY: SupplierInput = {
  company_name: "",
  contact_name: "",
  whatsapp: "",
  email: "",
  brands_represented: "",
  origins: "",
  product_categories: "",
  delivery_coverage: "",
  moq: "",
  payment_terms: "",
  notes: "",
};

export function SupplierForm() {
  const [values, setValues] = useState<SupplierInput>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<SupplierInput | null>(null);

  function set<K extends keyof SupplierInput>(key: K, value: SupplierInput[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = supplierSchema.safeParse(values);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      toast.error("Please complete the required fields.");
      return;
    }
    setErrors({});
    setPending(true);
    try {
      await submitSupplier(parsed.data);
      setDone(parsed.data);
      toast.success("Application received.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send your application.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="border border-line bg-card p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-crimson" aria-hidden="true" />
        <h2 className="mt-5 font-display text-2xl">Thank you — we'll review your profile</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ash">
          Our team verifies every supplier before matching them with buyer demand. We'll reach out
          to discuss your range and coverage.
        </p>
        <a
          href={waLink(supplierWhatsappMessage(done))}
          target="_blank"
          rel="noreferrer noopener"
          className="eyebrow mt-6 inline-flex bg-crimson px-6 py-4 text-bone transition-colors hover:bg-crimson-deep"
        >
          Continue on WhatsApp
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="border border-line bg-card p-6 sm:p-8">
      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="eyebrow mb-5 text-crimson">Company details</legend>
        <Field label="Company name" required error={errors["company_name"]}>
          <TextInput
            value={values.company_name}
            onChange={(e) => set("company_name", e.target.value)}
          />
        </Field>
        <Field label="Contact person" required error={errors["contact_name"]}>
          <TextInput
            value={values.contact_name}
            onChange={(e) => set("contact_name", e.target.value)}
          />
        </Field>
        <Field label="WhatsApp number" required error={errors["whatsapp"]}>
          <TextInput
            value={values.whatsapp}
            onChange={(e) => set("whatsapp", e.target.value)}
            inputMode="tel"
            placeholder="+62 …"
          />
        </Field>
        <Field label="Email" error={errors["email"]}>
          <TextInput
            type="email"
            value={values.email ?? ""}
            onChange={(e) => set("email", e.target.value)}
          />
        </Field>
      </fieldset>

      <fieldset className="mt-10 grid gap-5 sm:grid-cols-2">
        <legend className="eyebrow mb-5 text-crimson">Your range</legend>
        <Field label="Product categories" error={errors["product_categories"]}>
          <TextInput
            value={values.product_categories ?? ""}
            onChange={(e) => set("product_categories", e.target.value)}
            placeholder="Beef, wagyu, lamb, poultry, seafood"
          />
        </Field>
        <Field label="Origins handled" error={errors["origins"]}>
          <TextInput
            value={values.origins ?? ""}
            onChange={(e) => set("origins", e.target.value)}
            placeholder="AUS, NZ, USA, JP, local"
          />
        </Field>
        <Field label="Brands represented" error={errors["brands_represented"]}>
          <TextInput
            value={values.brands_represented ?? ""}
            onChange={(e) => set("brands_represented", e.target.value)}
          />
        </Field>
        <Field label="Delivery coverage" error={errors["delivery_coverage"]}>
          <TextInput
            value={values.delivery_coverage ?? ""}
            onChange={(e) => set("delivery_coverage", e.target.value)}
            placeholder="Cities / islands served"
          />
        </Field>
        <Field label="Minimum order quantity" error={errors["moq"]}>
          <TextInput value={values.moq ?? ""} onChange={(e) => set("moq", e.target.value)} />
        </Field>
        <Field label="Payment terms offered" error={errors["payment_terms"]}>
          <TextInput
            value={values.payment_terms ?? ""}
            onChange={(e) => set("payment_terms", e.target.value)}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Anything else we should know" error={errors["notes"]}>
            <TextArea value={values.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
          </Field>
        </div>
      </fieldset>

      <div className="mt-10 flex flex-col items-start gap-4 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-ash">
          Listing is free. We only introduce you to buyers whose requirements match your range.
        </p>
        <SubmitButton pending={pending}>Submit application</SubmitButton>
      </div>
    </form>
  );
}
