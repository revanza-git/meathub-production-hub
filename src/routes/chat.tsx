import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { SiteLayout } from "@/components/site/site-layout";
import { CustomerChat } from "@/components/chat/customer-chat";
export const Route = createFileRoute("/chat")({
  validateSearch: z.object({ context: z.string().max(300).catch("") }),
  head: () => ({
    meta: [
      { title: "Chat Meatlink — Bantuan pelanggan" },
      {
        name: "description",
        content: "Hubungi tim Meatlink tentang produk, pesanan, dan pembayaran.",
      },
      { property: "og:title", content: "Chat pelanggan Meatlink" },
      { property: "og:description", content: "Percakapan langsung dengan tim Meatlink." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Page,
});
function Page() {
  const { context } = Route.useSearch();
  return (
    <SiteLayout>
      <section className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="mb-6 font-display text-3xl text-ink">Chat Meatlink</h1>
        <div className="flex h-[min(680px,80dvh)] flex-col overflow-hidden rounded-md border border-line bg-background">
          <CustomerChat context={context} />
        </div>
      </section>
    </SiteLayout>
  );
}
