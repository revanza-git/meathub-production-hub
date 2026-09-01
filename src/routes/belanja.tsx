import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Legacy shopping-mode picker. The mode is now a filter inside the catalogue,
 * so this URL permanently forwards to /produk to keep one indexable catalogue.
 */
export const Route = createFileRoute("/belanja")({
  beforeLoad: () => {
    throw redirect({ to: "/produk", search: {} });
  },
  component: () => null,
});
