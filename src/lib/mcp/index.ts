import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listAvailableStock from "./tools/list-available-stock";
import listMyOrders from "./tools/list-my-orders";
import createOrder from "./tools/create-order";
import getMarketSnapshot from "./tools/get-market-snapshot";
import listMarketInsights from "./tools/list-market-insights";
import createMarketInsight from "./tools/create-market-insight";
import updateMarketInsight from "./tools/update-market-insight";
import getPublicBeefMarketData from "./tools/get-public-beef-market-data";

// The OAuth issuer must be the direct Supabase host; the project ref is the only
// value that survives publish unchanged.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "meatlink",
  title: "Meatlink.id",
  version: "0.1.0",
  instructions:
    "Tools for Meatlink.id (SBMEAT Meat Hub). Use `list_available_stock` to see aggregated meat stock, `list_my_orders` to review the signed-in user's orders, and `create_order` to place a new order (quantity in kg, payment terms CBD/TOP7/TOP14/TOP30). For Indonesian beef market analysis, use `get_public_beef_market_data` for public FAOSTAT and USDA statistics, then `list_market_insights` to avoid duplicates and `create_market_insight` / `update_market_insight` to write drafts for admin review. Never disclose Meatlink inventory quantities, prices, order volumes, RFQ details, buyer/vendor data or precise locations in an insight.",
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
    getPublicBeefMarketData,
  ],
});
