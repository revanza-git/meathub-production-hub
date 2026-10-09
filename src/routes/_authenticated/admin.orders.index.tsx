import { createFileRoute } from "@tanstack/react-router";
import { AdminStorefrontOrdersPage } from "./admin.storefront-orders";

export const Route = createFileRoute("/_authenticated/admin/orders/")({
head: () => ({ meta: [{ title: "Kelola Pesanan — Meatlink.id" }, { name: "description", content: "Kelola pesanan katalog dan pesanan khusus, verifikasi pembayaran serta pengiriman." }, { property: "og:title", content: "Kelola Pesanan — Meatlink.id" }, { property: "og:description", content: "Kelola pesanan katalog dan pesanan khusus, verifikasi pembayaran serta pengiriman." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: AdminStorefrontOrdersPage,
});
