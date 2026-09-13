import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { registerServiceWorker } from "@/lib/pwa-register";
import { ConsentBanner } from "@/components/site/consent-banner";
import { LanguageProvider, useBi } from "@/lib/i18n";
import { trackPageView } from "@/lib/analytics";


function NotFoundComponent() {
  const bi = useBi();
  return (
    <div className="flex min-h-screen items-center justify-center bg-noir px-4 text-bone">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl">404</h1>
        <h2 className="mt-4 font-display text-xl">
          {bi("Halaman tidak ditemukan", "Page not found")}
        </h2>
        <p className="mt-2 text-sm text-bone/60">
          {bi(
            "Halaman yang Anda cari tidak tersedia atau sudah dipindahkan.",
            "The page you are looking for doesn't exist or has been moved.",
          )}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/" className="eyebrow inline-flex bg-crimson px-5 py-3 text-bone">
            {bi("Kembali ke beranda", "Back to home")}
          </Link>
          <Link
            to="/produk"
            className="eyebrow inline-flex border border-bone/30 px-5 py-3 text-bone"
          >
            {bi("Lihat produk", "Browse products")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. Try again or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Meatlink.id — B2B meat sourcing network" },
      {
        name: "description",
        content:
          "Meatlink.id connects Indonesian restaurants, hotels and retailers with trusted meat importers and suppliers. Send one RFQ, get matched quotes.",
      },
      { name: "author", content: "Meatlink.id" },
      {
        name: "google-site-verification",
        content: "uMDzlbny2GI5KwNjQ75iVmynKRTObyFegOEcrf8J7E0",
      },

      { name: "theme-color", content: "#0D0D0D" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Meatlink.id" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Meatlink.id",
          url: "https://meatlink.id",
          inLanguage: "id-ID",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Meatlink.id",
          url: "https://meatlink.id",
          logo: "https://meatlink.id/favicon.png",
          description:
            "B2B meat sourcing network connecting Indonesian restaurants, hotels and retailers with verified meat importers and suppliers.",
          areaServed: { "@type": "Country", name: "Indonesia" },
          contactPoint: [
            {
              "@type": "ContactPoint",
              contactType: "sales",
              email: "cs@meatlink.id",
              telephone: "+62-897-8872-745",
              areaServed: "ID",
              availableLanguage: ["id", "en"],
            },
          ],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  // Global auth-state subscriber (see tanstack-supabase-integration).
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  // GA4 page views on every client-side navigation (consent-gated inside).
  useEffect(() => {
    const send = () => trackPageView(window.location.pathname + window.location.search, document.title);
    send();
    return router.subscribe("onResolved", send);
  }, [router]);

  // Guarded PWA registration (no-op in dev/preview/iframe).
  useEffect(() => {
    void registerServiceWorker();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <Outlet />
        <Toaster richColors closeButton position="bottom-center" duration={2000} />
        <ConsentBanner />
      </LanguageProvider>
    </QueryClientProvider>
  );
}
