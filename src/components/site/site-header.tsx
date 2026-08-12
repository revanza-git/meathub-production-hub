import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import mark from "@/assets/meatlink-mark.png.asset.json";

const NAV = [
  { to: "/buyers", label: "For Buyers" },
  { to: "/suppliers", label: "For Suppliers" },
  { to: "/insights", label: "Market Insights" },
  { to: "/about", label: "About Us" },
  { to: "/contact", label: "Contact" },
] as const;

export function Wordmark({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <Link to="/" className="flex items-center gap-3" aria-label="Meatlink.id home">
      <img
        src={mark.url}
        alt=""
        width={199}
        height={160}
        className={`h-10 w-auto ${tone === "dark" ? "invert" : ""}`}
      />
      <span className="sr-only">Meatlink.id</span>
      <span aria-hidden="true" className="leading-none">
        <span
          className={`block text-base font-semibold tracking-[0.22em] ${
            tone === "dark" ? "text-bone" : "text-ink"
          }`}
        >
          MEATLINK
          <span className="align-super text-[0.5rem] tracking-normal">.ID</span>
        </span>
        <span
          className={`mt-1.5 block text-[0.5rem] tracking-[0.18em] ${
            tone === "dark" ? "text-bone/55" : "text-ash"
          }`}
        >
          BETTER MEAT | BETTER CONNECTIONS
        </span>
      </span>
    </Link>
  );
}

export function SiteHeader({ tone = "dark" }: { tone?: "light" | "dark" }) {
  const [open, setOpen] = useState(false);
  const dark = tone === "dark";

  return (
    <header
      className={`sticky top-0 z-50 border-b ${
        dark ? "border-white/10 bg-noir/95 backdrop-blur" : "border-line bg-bone/95 backdrop-blur"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4 lg:px-8">
        <Wordmark tone={tone} />

        <nav aria-label="Main" className="hidden items-center gap-7 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`eyebrow whitespace-nowrap transition-colors ${
                dark ? "text-bone/75 hover:text-bone" : "text-ash hover:text-ink"
              }`}
              activeProps={{ className: dark ? "text-bone" : "text-ink" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            to="/supply"
            className={`eyebrow whitespace-nowrap border px-5 py-3 transition-colors ${
              dark
                ? "border-white/25 text-bone hover:bg-white/10"
                : "border-ink/25 text-ink hover:bg-ink/5"
            }`}
          >
            Supply With Us
          </Link>
          <Link
            to="/request-quote"
            className="eyebrow whitespace-nowrap bg-crimson px-5 py-3 text-bone transition-colors hover:bg-crimson-deep"
          >
            Request a Quote
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className={`lg:hidden ${dark ? "text-bone" : "text-ink"}`}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open ? (
        <div className={`border-t lg:hidden ${dark ? "border-white/10 bg-noir" : "border-line bg-bone"}`}>
          <nav aria-label="Mobile" className="mx-auto grid max-w-7xl gap-1 px-5 py-4">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`eyebrow py-3 ${dark ? "text-bone/80" : "text-ash"}`}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-3 grid gap-2">
              <Link
                to="/supply"
                onClick={() => setOpen(false)}
                className={`eyebrow border px-5 py-3 text-center ${
                  dark ? "border-white/25 text-bone" : "border-ink/25 text-ink"
                }`}
              >
                Supply With Us
              </Link>
              <Link
                to="/request-quote"
                onClick={() => setOpen(false)}
                className="eyebrow bg-crimson px-5 py-3 text-center text-bone"
              >
                Request a Quote
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
