<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Storefront payment attempts record their Midtrans environment in the reference (legacy `Midtrans ` sandbox, `Midtrans Live ` production); select credentials and status endpoint from that reference, not the current charge mode, and verify signed notifications before settlement — prevents sandbox/live cross-settlement after switching.
- Production charges require explicit MIDTRANS_MODE=production and the real site hostname; keep preview charges blocked and legacy sandbox VA hidden from buyers — prevents accidental real charges in previews and reuse of test instructions.
- Reconcile Midtrans paid and terminal cancelled/expired/denied statuses only after verifying the active transaction ID and amount; the generic database expiry skips Midtrans orders to prevent false nonpayment.
- Treat aborted HTTP requests as empty 204 responses at both request middleware and server entry, not rethrown errors — h3 otherwise turns a disconnected navigation into a misleading 500.
- Inventory AI receives only headers and six bounded sample rows through an admin-guarded server function; the browser validates the full sheet against current inventory and imports only new items via the append-only RPC — model suggestions must never authorize writes.
- Midtrans reconciliation snapshots are admin-readable and server-written; status transitions reuse verified active-attempt guards, while mismatches remain review-only — prevents stale or unequal charges from marking orders paid.
- New payment-term requests use TERMS_REQUEST orders without credit limits, due dates, payment instructions, or invoices; reject new TOP orders in the database while keeping historic TOP readable — conversations are not approval or settlement.
- Curate homepage product highlights from the public catalog using brand and recognizable cut names, not inventory rank writes — keeps merchandising scoped to the homepage without changing admin-curated catalog order.
- Store buyer contact details in the existing self-owned profile and gate buyer workspace until both email and phone are present — preserves legacy accounts while requiring reachable contacts.
