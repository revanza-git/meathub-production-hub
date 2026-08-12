# Meatlink.id — Better Meat · Better Connections

Meatlink.id is a premium **B2B meat sourcing network** for Indonesia. It is not a
storefront: buyers (HORECA, hotels, distributors, retail) submit a **Request for
Quote (RFQ)**, suppliers apply to join the network, and the Meatlink team matches
them offline over WhatsApp.

- **Live app**: https://meatlink.id
- **Preview**: https://meathub-production-hub.lovable.app
- **Contact**: cs@meatlink.id · WhatsApp +62 897-8872-745

---

## 1. Product overview

| Aspect | Detail |
| --- | --- |
| Model | Lead generation / brokered sourcing (no online checkout) |
| Primary action | Multi-item RFQ submission |
| Secondary action | Supplier network application |
| Coverage | Nationwide (Seluruh Indonesia) |
| Categories | Beef, Wagyu, Lamb, Poultry, Seafood |
| Follow-up channel | WhatsApp Business + email |
| Language | English |

### What the product is *not*
No cart, no payments, no vendor dashboards, no order lifecycle. The earlier
marketplace build (MEATHUB) was fully removed in favour of this focused
lead-capture site.

---

## 2. High-level architecture

```mermaid
graph TD
    subgraph Client["Browser"]
        UI["React 19 UI<br/>Tailwind v4 + shadcn"]
        RHF["react-hook-form + Zod"]
    end

    subgraph Edge["TanStack Start on Cloudflare Workers"]
        SSR["SSR / prerender"]
        ROUTES["File-based routes<br/>src/routes"]
    end

    subgraph Cloud["Lovable Cloud (Postgres)"]
        QR[("quote_requests")]
        SA[("supplier_applications")]
        RLS["Row Level Security<br/>anon INSERT only"]
    end

    WA["WhatsApp Business<br/>wa.me deep link"]

    UI --> RHF
    RHF -->|validated payload| Cloud
    SSR --> UI
    ROUTES --> SSR
    QR --- RLS
    SA --- RLS
    RHF -->|prefilled summary| WA
```

### Stack

| Layer | Technology |
| --- | --- |
| Framework | TanStack Start v1 (TanStack Router, SSR) |
| Build | Vite 7 |
| UI | React 19, Tailwind CSS v4, shadcn/ui, lucide-react |
| Forms | react-hook-form + Zod resolvers |
| Data | Lovable Cloud (Postgres) via the generated client |
| Runtime | Cloudflare Workers (edge) |
| Fonts | Playfair Display (display), Archivo (sans) |

---

## 3. Route & screen map

```mermaid
graph LR
    ROOT["__root.tsx<br/>shell + head metadata"] --> HOME["/ Landing"]
    ROOT --> BUY["/buyers"]
    ROOT --> SUP["/suppliers"]
    ROOT --> RFQ["/request-quote"]
    ROOT --> SUPPLY["/supply"]
    ROOT --> INS["/insights"]
    ROOT --> ABOUT["/about"]
    ROOT --> CONTACT["/contact"]

    HOME --> RFQ
    HOME --> SUPPLY
    BUY --> RFQ
    SUP --> SUPPLY
```

| Route | File | Purpose |
| --- | --- | --- |
| `/` | `src/routes/index.tsx` | Editorial hero, sourcing process, categories, recently sourced, dual CTA |
| `/buyers` | `buyers.tsx` | Buyer value proposition, segments served |
| `/suppliers` | `suppliers.tsx` | Supplier value proposition, partnership criteria |
| `/request-quote` | `request-quote.tsx` | Multi-item RFQ form (main conversion) |
| `/supply` | `supply.tsx` | Supplier network application form |
| `/insights` | `insights.tsx` | Market notes / editorial content |
| `/about` | `about.tsx` | Company positioning |
| `/contact` | `contact.tsx` | WhatsApp + email channels |

Shared shell: `site-layout.tsx`, `site-header.tsx`, `site-footer.tsx`.

---

## 4. Core user journeys

### 4.1 Buyer RFQ flow

```mermaid
sequenceDiagram
    actor B as Buyer
    participant W as Meatlink site
    participant Z as Zod validation
    participant DB as quote_requests
    participant WA as WhatsApp

    B->>W: Opens /request-quote
    B->>W: Fills company + contact + delivery details
    loop 1..30 items
        B->>W: Adds item row (product, grade, origin, brand, volume, notes)
    end
    B->>W: Submit
    W->>Z: rfqSchema.parse
    alt invalid
        Z-->>B: Inline field errors
    else valid
        W->>DB: insert (items JSON + flattened first item)
        DB-->>W: ok
        W->>WA: Open wa.me with prefilled RFQ summary
        W-->>B: Success state
    end
```

### 4.2 Supplier application flow

```mermaid
sequenceDiagram
    actor S as Supplier
    participant W as Meatlink site
    participant DB as supplier_applications
    participant T as Meatlink team

    S->>W: Opens /supply
    S->>W: Company, brands, origins, categories, coverage, MOQ, terms
    W->>DB: insert (status = new)
    W->>S: WhatsApp deep link + confirmation
    T->>DB: Reviews and qualifies offline
```

### 4.3 Lead lifecycle (operational)

```mermaid
stateDiagram-v2
    [*] --> new: Form submitted
    new --> contacted: Team reaches out via WhatsApp
    contacted --> quoted: Supplier pricing collected
    quoted --> matched: Buyer accepts
    quoted --> lost: No fit / price gap
    matched --> [*]
    lost --> [*]
```

`status` is a text column defaulting to `new`; transitions are performed by the
team, not by the public site.

---

## 5. Data model

```mermaid
erDiagram
    QUOTE_REQUESTS {
        uuid id PK
        text company_name
        text contact_name
        text whatsapp
        text email
        text delivery_location
        json items "array of RFQ line items"
        text category
        text product_cut
        text origin_preference
        text brand_preference
        text grade
        text volume
        text purchase_frequency
        text current_supplier
        text current_price
        text target_price
        text payment_terms
        text required_delivery_date
        text notes
        text status "default new"
        timestamptz created_at
        timestamptz updated_at
    }

    SUPPLIER_APPLICATIONS {
        uuid id PK
        text company_name
        text contact_name
        text whatsapp
        text email
        text brands_represented
        text origins
        text product_categories
        text delivery_coverage
        text moq
        text payment_terms
        text notes
        text status "default new"
        timestamptz created_at
        timestamptz updated_at
    }
```

The two tables are intentionally **unrelated** — each row is a standalone lead.

### Multi-item RFQ storage

Customer feedback ("hard to order many products") drove a multi-item form. Storage
keeps backwards compatibility:

```mermaid
graph LR
    FORM["Form items[]<br/>max 30 rows"] --> ITEMS["items (JSON)<br/>full fidelity"]
    FORM --> FIRST["Item #1 flattened into<br/>product_cut / volume / grade / origin / brand"]
    FORM --> NOTES["Items #2..n summarised<br/>into notes text"]
```

| Field | Required | Max |
| --- | --- | --- |
| `product_cut` | yes | 160 |
| `volume` | yes | 120 |
| `category`, `origin_preference`, `brand_preference`, `grade` | no | 60–120 |
| `notes` (per item) | no | 300 |
| items per RFQ | — | 30 |

---

## 6. Security model

```mermaid
graph TD
    ANON["anon role (public visitor)"] -->|INSERT only| T1["quote_requests"]
    ANON -->|INSERT only| T2["supplier_applications"]
    ANON -.->|no SELECT| T1
    ANON -.->|no SELECT| T2
    SVC["service_role / internal ops"] -->|full access| T1
    SVC -->|full access| T2
```

- RLS enabled on both tables; the public site can create leads but never read them.
- No authentication surface is exposed — there are no accounts on the site.
- All input is length-capped and validated with Zod before insert.
- Publishable keys only in client code; no secrets in the bundle.

---

## 7. Design system

Defined entirely as tokens in `src/styles.css` (Tailwind v4 `@theme`).

| Token | Value | Usage |
| --- | --- | --- |
| `noir` | `#0D0D0D` | Hero and footer surfaces |
| `ink` | `#141414` | Primary text |
| `bone` | `#F7F4F0` | Page background |
| `sand` | `#EDE8E2` | Alternate band |
| `crimson` | `#A3212C` | CTAs, eyebrows, rules |
| `ash` | `#6B6560` | Secondary text |
| `line` | `#DCD6CE` | Hairline borders |

Custom utilities: `eyebrow` (uppercase tracked label), `rule-crimson` (accent
underline), `fade-in-up` (entrance animation). Never hardcode colour utilities —
use the semantic tokens so theming stays consistent.

---

## 8. Project structure

```text
src/
├── routes/                 file-based routes (one file per screen)
│   ├── __root.tsx          shell, fonts, global head metadata
│   └── *.tsx               public pages
├── components/
│   ├── site/               header, footer, layout, RFQ + supplier forms, form-kit
│   └── ui/                 shadcn primitives
├── lib/meatlink/
│   ├── config.ts           WhatsApp number, email, categories, showcase data
│   └── leads.ts            Zod schemas, insert helpers, WhatsApp message builders
├── integrations/supabase/  generated client + types (do not edit)
└── styles.css              design tokens and base layer
```

### Key modules

| Module | Responsibility |
| --- | --- |
| `lib/meatlink/config.ts` | Single source of truth for contact channels and category copy |
| `lib/meatlink/leads.ts` | `rfqSchema`, `supplierSchema`, `submitRfq`, `submitSupplier`, WhatsApp message builders |
| `components/site/rfq-form.tsx` | Dynamic item rows, validation, submit + WhatsApp handoff |
| `components/site/supplier-form.tsx` | Supplier application capture |
| `components/site/form-kit.tsx` | Shared labelled inputs / textareas styled to the design system |

---

## 9. Local development

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev        # http://localhost:8080
```

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server with SSR |
| `npm run build` | Production build for the edge runtime |
| `npm run build:dev` | Development-mode build (prerender check) |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

Environment variables for the backend client are generated automatically; do not
edit `.env` or files under `src/integrations/supabase/`.

---

## 10. Operational notes

- **Response SLA**: leads are followed up manually via WhatsApp; keep the number in
  `config.ts` in sync with the live Business line.
- **Changing contact details**: edit `src/lib/meatlink/config.ts` only — header,
  footer, contact page and both forms read from it.
- **Adding a category**: append to `CATEGORIES` in `config.ts`; the landing page
  grid renders from that array.
- **SEO**: every route defines its own `head()` with unique title, description and
  Open Graph tags. Keep titles under 60 characters and descriptions under 160.

---

## 11. Roadmap (not built yet)

| Item | Status |
| --- | --- |
| Internal lead inbox / admin console | Planned |
| Supplier directory with verified badges | Planned |
| Automated quote comparison | Exploratory |
| Insights content pipeline (CMS) | Exploratory |

---

Built with [Lovable](https://lovable.dev). Every change made in the Lovable editor
is committed straight to this repository, and pushes to `main` sync back in.
