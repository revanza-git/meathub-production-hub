import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listAvailableStock from "./tools/list-available-stock";
import listMyOrders from "./tools/list-my-orders";
import createOrder from "./tools/create-order";
import getMarketSnapshot from "./tools/get-market-snapshot";
import listMarketInsights from "./tools/list-market-insights";
import createMarketInsight from "./tools/create-market-insight";
import updateMarketInsight from "./tools/update-market-insight";

// The OAuth issuer must be the direct Supabase host; the project ref is the only
// value that survives publish unchanged.
const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "meatlink",
  title: "Meatlink.id",
  version: "0.1.0",
  instructions:
    "Tools for Meatlink.id (SBMEAT Meat Hub). Use `list_available_stock` to see aggregated meat stock, `list_my_orders` to review the signed-in user's orders, and `create_order` to place a new order (quantity in kg, payment terms CBD/TOP7/TOP14/TOP30). For Indonesian beef market analysis: `get_market_snapshot` returns aggregated inventory, demand and order data (no PII), `list_market_insights` shows existing sourcing notes, and `create_market_insight` / `update_market_insight` write draft notes that a Meatlink admin reviews and publishes.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listAvailableStock,
    listMyOrders,
    createOrder,
    getMarketSnapshot,
    listMarketInsights,
    createMarketInsight,
    updateMarketInsight,
  ],
});
