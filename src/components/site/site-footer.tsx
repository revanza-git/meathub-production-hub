import { Link } from "@tanstack/react-router";
import { ArrowRight, Mail } from "lucide-react";
import { CONTACT_EMAIL, waLink } from "@/lib/meatlink/config";
import { Wordmark } from "./site-header";

export function SiteFooter() {
  return (
    <footer className="bg-noir text-bone">
      <div className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 md:flex-row md:items-center md:justify-between lg:px-8">
          <div className="flex items-start gap-4">
            <Mail className="mt-1 h-6 w-6 text-crimson" aria-hidden="true" />
            <div>
              <p className="font-display text-xl">Can't find what you're looking for?</p>
              <p className="mt-1 text-sm text-bone/60">
                Our team is ready to help you source the exact meat you need.
              </p>
            </div>
          </div>
          <Link
            to="/request-quote"
            className="eyebrow inline-flex items-center justify-center gap-2 bg-crimson px-6 py-4 text-bone transition-colors hover:bg-crimson-deep"
          >
            Request a Quote <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <Wordmark tone="dark" />
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-bone/60">
            A B2B meat sourcing network connecting restaurants, hotels, caterers and retailers with
            trusted importers and premium suppliers.
          </p>
        </div>

        <div>
          <h2 className="eyebrow text-crimson">Buyers</h2>
          <ul className="mt-4 space-y-2 text-sm text-bone/70">
            <li>
              <Link to="/network" hash="buyers" className="hover:text-bone">
                How sourcing works
              </Link>
            </li>
            <li>
              <Link to="/request-quote" className="hover:text-bone">
                Request a quote
              </Link>
            </li>
            <li>
              <Link to="/insights" className="hover:text-bone">
                Market insights
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="eyebrow text-crimson">Suppliers</h2>
          <ul className="mt-4 space-y-2 text-sm text-bone/70">
            <li>
              <Link to="/network" hash="suppliers" className="hover:text-bone">
                Why supply through Meatlink
              </Link>
            </li>
            <li>
              <Link to="/supply" className="hover:text-bone">
                Supply through Meatlink
              </Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-bone">
                About us
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="eyebrow text-crimson">Contact</h2>
          <ul className="mt-4 space-y-2 text-sm text-bone/70">
            <li>{CONTACT_EMAIL}</li>
            <li>
              <a
                href={waLink("Hi Meatlink, I'd like to talk about sourcing.")}
                target="_blank"
                rel="noreferrer noopener"
                className="hover:text-bone"
              >
                WhatsApp Business
              </a>
            </li>
            <li>Jakarta · Bali · Indonesia</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-xs text-bone/40 lg:px-8">
          <span>© 2026 Meatlink.id — Better Meat | Better Connections</span>
          <span>Terms · Privacy</span>
        </div>
      </div>
    </footer>
  );
}
