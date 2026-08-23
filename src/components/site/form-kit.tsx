import { useBi } from "@/lib/i18n";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const base =
  "w-full border border-line bg-card px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ash/70 focus:border-crimson focus:ring-1 focus:ring-crimson";

export function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="eyebrow text-ash">
        {label}
        {required ? <span className="text-crimson"> *</span> : null}
      </span>
      <div className="mt-2">{children}</div>
      {hint && !error ? <span className="mt-1.5 block text-xs text-ash">{hint}</span> : null}
      {error ? <span className="mt-1.5 block text-xs text-crimson">{error}</span> : null}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${base} ${props.className ?? ""}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={4} {...props} className={`${base} ${props.className ?? ""}`} />;
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${base} ${props.className ?? ""}`} />;
}

export function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  const bi = useBi();
  return (
    <button
      type="submit"
      disabled={pending}
      className="eyebrow w-full bg-crimson px-6 py-4 text-bone transition-colors hover:bg-crimson-deep disabled:opacity-60 sm:w-auto"
    >
      {pending ? bi("Mengirim…", "Sending…") : children}
    </button>
  );
}
