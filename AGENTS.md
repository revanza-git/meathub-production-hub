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

- Storefront payment attempts use Midtrans Core API sandbox only; a tokenized order link authorizes buyer payment actions and notifications must be signature-checked plus verified against Midtrans before marking paid — prevents unverified payment state transitions.
- Reconcile Midtrans paid and terminal cancelled/expired/denied statuses only after verifying the active transaction ID and amount; the generic database expiry skips Midtrans orders to prevent false nonpayment.
- Treat aborted HTTP requests as empty 204 responses at both request middleware and server entry, not rethrown errors — h3 otherwise turns a disconnected navigation into a misleading 500.
- Inventory AI receives only headers and six bounded sample rows through an admin-guarded server function; the browser validates the full sheet against current inventory and imports only new items via the append-only RPC — model suggestions must never authorize writes.
- Midtrans reconciliation snapshots are admin-readable and server-written; status transitions reuse verified active-attempt guards, while mismatches remain review-only — prevents stale or unequal charges from marking orders paid.
