import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { SiteLayout } from "@/components/site/site-layout";
import { CustomerChat } from "@/components/chat/customer-chat";
export const Route = createFileRoute("/chat")({
  validateSearch: z.object({ context: z.string().max(300).catch(""), conversation: z.string().uuid().optional().catch(undefined) }),
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
  const { context, conversation } = Route.useSearch();
  return (
    <SiteLayout>
      <section className="ml-in mx-auto max-w-2xl px-4 py-5 sm:py-8">
        <h1 className="mb-4 font-display text-2xl text-ink">Chat Meatlink</h1>
        <div className="flex h-[min(720px,70dvh)] min-h-[360px] flex-col overflow-hidden rounded-md border border-line bg-background">
          <CustomerChat context={context} conversationId={conversation} />
        </div>
      </section>
    </SiteLayout>
  );
}
