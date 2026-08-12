import { createFileRoute } from "@tanstack/react-router";
import { PageHero, SiteLayout } from "@/components/site/site-layout";
import { SupplierForm } from "@/components/site/supplier-form";

export const Route = createFileRoute("/supply")({
  head: () => ({
    meta: [
      { title: "Supply Through Meatlink — supplier application" },
      {
        name: "description",
        content:
          "Apply to join the Meatlink.id supplier network. Share your categories, origins, coverage and terms to receive matched buyer requests.",
      },
      { property: "og:title", content: "Supply Through Meatlink.id" },
      {
        property: "og:description",
        content: "Join the verified supplier network and receive qualified B2B meat demand.",
      },
    ],
  }),
  component: SupplyPage,
});

function SupplyPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Supply through Meatlink"
        title="Join the supplier network."
        intro="Tell us what you carry and where you deliver. We'll verify your profile and start matching you against live buyer demand."
      />
      <section className="bg-bone">
        <div className="mx-auto max-w-4xl px-5 py-16 lg:px-8 lg:py-20">
          <SupplierForm />
        </div>
      </section>
    </SiteLayout>
  );
}
