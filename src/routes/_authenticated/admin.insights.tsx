import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, Panel, RoleGate } from "@/components/app/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/meatlink/orders";
import {
  INSIGHT_CATEGORIES,
  INSIGHT_CONFIDENCE,
  INSIGHT_SELECT,
  INSIGHT_STATUSES,
  type MarketInsight,
} from "@/lib/meatlink/insights";

export const Route = createFileRoute("/_authenticated/admin/insights")({
  component: AdminInsightsPage,
  head: () => ({
    meta: [
      { title: "Market insights — Meatlink admin" },
      {
        name: "description",
        content:
          "Review, edit and publish the sourcing notes written by the Meatlink analysis agent.",
      },
      { property: "og:title", content: "Market insights — Meatlink admin" },
      {
        property: "og:description",
        content: "Review, edit and publish agent-written sourcing notes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const FILTERS = ["all", ...INSIGHT_STATUSES] as const;
type Filter = (typeof FILTERS)[number];

function AdminInsightsPage() {
  return (
    <AppShell
      title="Market insights"
      intro="Sourcing notes for the public Insights page. Agent-written notes arrive as drafts — publish the ones you agree with."
    >
      <RoleGate allow="admin">
        <InsightsBody />
      </RoleGate>
    </AppShell>
  );
}

const inputClass =
  "w-full border border-line bg-card px-3 py-2 text-sm text-ink outline-none focus:border-crimson";

function InsightsBody() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-market-insights"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("market_insights")
        .select(INSIGHT_SELECT)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as MarketInsight[];
    },
  });

  const refresh = () => void qc.invalidateQueries({ queryKey: ["admin-market-insights"] });
  const rows = (data ?? []).filter((r) => (filter === "all" ? true : r.status === filter));

  async function createBlank(form: FormData) {
    const title = String(form.get("title") ?? "").trim();
    const body = String(form.get("body") ?? "").trim();
    const titleEn = String(form.get("title_en") ?? "").trim();
    const bodyEn = String(form.get("body_en") ?? "").trim();
    if (!title || !body || !titleEn || !bodyEn) {
      toast.error("Bahasa Indonesia and English title and body are required");
      return;
    }
    const { error } = await supabase.from("market_insights").insert({
      title,
      body,
      title_en: titleEn,
      body_en: bodyEn,
      category: String(form.get("category") ?? "demand"),
      region: String(form.get("region") ?? "").trim() || "Nasional",
      period_label: String(form.get("period_label") ?? "").trim() || null,
      source: "admin",
      status: "draft",
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Draft created");
    setCreating(false);
    refresh();
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`eyebrow border px-4 py-3 transition-colors ${
              filter === f
                ? "border-crimson bg-crimson text-bone"
                : "border-line bg-card text-ash hover:text-ink"
            }`}
          >
            {f}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="eyebrow ml-auto border border-line bg-card px-4 py-3 text-ink transition-colors hover:bg-noir hover:text-bone"
        >
          {creating ? "Cancel" : "New note"}
        </button>
      </div>

      {creating ? (
        <Panel className="p-6">
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void createBlank(new FormData(e.currentTarget));
            }}
          >
            <div className="grid gap-2">
              <p className="eyebrow text-crimson">Bahasa Indonesia</p>
              <input name="title" placeholder="Judul Bahasa Indonesia" className={inputClass} />
              <textarea
                name="body"
                placeholder="Isi Bahasa Indonesia"
                rows={4}
                className={inputClass}
              />
            </div>
            <div className="grid gap-2">
              <p className="eyebrow text-crimson">English</p>
              <input name="title_en" placeholder="English title" className={inputClass} />
              <textarea name="body_en" placeholder="English body" rows={4} className={inputClass} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <select name="category" className={inputClass} defaultValue="demand">
                {INSIGHT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input name="region" placeholder="Region (Nasional)" className={inputClass} />
              <input
                name="period_label"
                placeholder="Period (Agustus 2026)"
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              className="eyebrow justify-self-start bg-crimson px-6 py-3 text-bone transition-colors hover:bg-crimson-deep"
            >
              Save draft
            </button>
          </form>
        </Panel>
      ) : null}

      {isLoading ? <p className="text-sm text-ash">Loading…</p> : null}
      {!isLoading && rows.length === 0 ? (
        <Panel className="p-8">
          <p className="text-sm text-ash">
            No notes here yet. Connect Codex to the Meatlink agent endpoint and ask it to analyse
            the market — its drafts land in this list.
          </p>
        </Panel>
      ) : null}

      {!isLoading && rows.length > 0
        ? (() => {
            const pending = rows.filter((r) => !r.title_en?.trim() || !r.body_en?.trim()).length;
            return (
              <p className="text-xs text-ash">
                {pending === 0
                  ? `All ${rows.length} notes have Bahasa Indonesia and English versions.`
                  : `${pending} of ${rows.length} notes still need an English version.`}
              </p>
            );
          })()
        : null}

      {rows.map((row) => (
        <InsightCard key={row.id} row={row} onChanged={refresh} />
      ))}

    </div>
  );
}

function InsightCard({ row, onChanged }: { row: MarketInsight; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(row);

  async function patch(values: Partial<MarketInsight>) {
    if (values.status === "published" && (!row.title_en?.trim() || !row.body_en?.trim())) {
      toast.error("Add the English title and body before publishing");
      return;
    }
    const { error } = await supabase
      .from("market_insights")
      .update(values as never)
      .eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Saved");
    setEditing(false);
    onChanged();
  }

  async function remove() {
    const { error } = await supabase.from("market_insights").delete().eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Deleted");
    onChanged();
  }

  return (
    <Panel className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow text-crimson">
            {row.category} · {row.region}
            {row.period_label ? ` · ${row.period_label}` : ""}
          </p>
          <p className="mt-2 text-xs font-medium uppercase tracking-wide text-ash">
            Bahasa Indonesia
          </p>
          <h2 className="mt-1 font-display text-xl text-ink">{row.title}</h2>
          <p className="mt-1 text-xs text-ash">
            {row.source === "agent" ? "Written by agent" : "Written by admin"} · confidence{" "}
            {row.confidence} · {formatDate(row.created_at)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`eyebrow border px-3 py-2 ${
              row.status === "published"
                ? "border-crimson bg-crimson text-bone"
                : "border-line bg-card text-ash"
            }`}
          >
            {row.status}
          </span>
          {row.status === "published" ? (
            <button
              type="button"
              onClick={() => void patch({ status: "draft" })}
              className="eyebrow border border-line bg-card px-3 py-2 text-ink hover:bg-noir hover:text-bone"
            >
              Unpublish
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void patch({ status: "published" })}
              className="eyebrow border border-crimson bg-crimson px-3 py-2 text-bone hover:bg-crimson-deep"
            >
              Publish
            </button>
          )}
          {row.status === "archived" ? null : (
            <button
              type="button"
              onClick={() => void patch({ status: "archived" })}
              className="eyebrow border border-line bg-card px-3 py-2 text-ash hover:text-ink"
            >
              Archive
            </button>
          )}
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="eyebrow border border-line bg-card px-3 py-2 text-ash hover:text-ink"
          >
            {editing ? "Close" : "Edit"}
          </button>
          <button
            type="button"
            onClick={() => void remove()}
            className="eyebrow border border-line bg-card px-3 py-2 text-ash hover:text-ink"
          >
            Delete
          </button>
        </div>
      </div>

      <p className="mt-4 whitespace-pre-line border-t border-line pt-4 text-sm text-ash">
        {row.body}
      </p>
      {row.title_en && row.body_en ? (
        <div className="mt-4 border-t border-line pt-4" lang="en">
          <p className="text-xs font-medium uppercase tracking-wide text-ash">English</p>
          <h3 className="mt-1 font-display text-xl text-ink">{row.title_en}</h3>
          <p className="mt-3 whitespace-pre-line text-sm text-ash">{row.body_en}</p>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <span className="eyebrow border border-line bg-sand px-3 py-2 text-ash">
            Legacy — EN pending
          </span>
          <p className="min-w-0 text-xs text-ash">
            This note has no English version yet. Add it before publishing.
          </p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="eyebrow border border-crimson bg-crimson px-3 py-2 text-bone hover:bg-crimson-deep"
          >
            Add translation
          </button>
        </div>
      )}


      {editing ? (
        <form
          className="mt-5 grid gap-4 border-t border-line pt-5"
          onSubmit={(e) => {
            e.preventDefault();
            void patch({
              title: draft.title,
              body: draft.body,
              title_en: draft.title_en,
              body_en: draft.body_en,
              category: draft.category,
              region: draft.region,
              period_label: draft.period_label,
              confidence: draft.confidence,
              display_rank: draft.display_rank,
            });
          }}
        >
          <div className="grid gap-2">
            <p className="eyebrow text-crimson">Bahasa Indonesia</p>
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              className={inputClass}
            />
            <textarea
              value={draft.body}
              rows={5}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="grid gap-2" lang="en">
            <p className="eyebrow text-crimson">English</p>
            <input
              value={draft.title_en ?? ""}
              onChange={(e) => setDraft({ ...draft, title_en: e.target.value || null })}
              className={inputClass}
              placeholder="English title"
            />
            <textarea
              value={draft.body_en ?? ""}
              rows={5}
              onChange={(e) => setDraft({ ...draft, body_en: e.target.value || null })}
              className={inputClass}
              placeholder="English body"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <select
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              className={inputClass}
            >
              {INSIGHT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              {INSIGHT_CATEGORIES.includes(
                draft.category as (typeof INSIGHT_CATEGORIES)[number],
              ) ? null : (
                <option value={draft.category}>{draft.category}</option>
              )}
            </select>
            <input
              value={draft.region}
              onChange={(e) => setDraft({ ...draft, region: e.target.value })}
              className={inputClass}
              placeholder="Region"
            />
            <input
              value={draft.period_label ?? ""}
              onChange={(e) => setDraft({ ...draft, period_label: e.target.value || null })}
              className={inputClass}
              placeholder="Period"
            />
            <select
              value={draft.confidence}
              onChange={(e) => setDraft({ ...draft, confidence: e.target.value })}
              className={inputClass}
            >
              {INSIGHT_CONFIDENCE.map((c) => (
                <option key={c} value={c}>
                  confidence: {c}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={draft.display_rank ?? ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  display_rank: e.target.value === "" ? null : Number(e.target.value),
                })
              }
              className={inputClass}
              placeholder="Order"
            />
          </div>
          <button
            type="submit"
            className="eyebrow justify-self-start bg-crimson px-6 py-3 text-bone transition-colors hover:bg-crimson-deep"
          >
            Save changes
          </button>
        </form>
      ) : null}

      {row.data_refs && Object.keys(row.data_refs as object).length > 0 ? (
        <details className="mt-4 border-t border-line pt-4">
          <summary className="eyebrow cursor-pointer text-ash">Supporting data</summary>
          <pre className="mt-3 overflow-x-auto text-xs text-ash">
            {JSON.stringify(row.data_refs, null, 2)}
          </pre>
        </details>
      ) : null}
    </Panel>
  );
}
