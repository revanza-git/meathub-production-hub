import { createFileRoute, redirect } from "@tanstack/react-router";

type SearchParams = { q?: string };

/** Alias for the catalog search — /search?q=… redirects into /produk. */
export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>): SearchParams => {
    const q = typeof search.q === "string" && search.q.trim() ? search.q.trim() : undefined;
    return q ? { q } : {};
  },
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/produk", search: search.q ? { q: search.q } : {} });
  },
});
