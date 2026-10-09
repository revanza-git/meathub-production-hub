import { createFileRoute } from "@tanstack/react-router";
import { StoreOrdersPage } from "./app.pesanan";

export const Route = createFileRoute("/_authenticated/app/orders/")({
head: () => ({ meta: [{ title: "Pesanan Saya — Meatlink.id" }, { name: "description", content: "Riwayat pesanan katalog dan pesanan khusus, pembayaran, serta pengiriman Meatlink." }, { property: "og:title", content: "Pesanan Saya — Meatlink.id" }, { property: "og:description", content: "Riwayat pesanan katalog dan pesanan khusus, pembayaran, serta pengiriman Meatlink." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: StoreOrdersPage,
});
