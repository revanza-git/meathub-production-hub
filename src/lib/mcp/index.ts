import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listAvailableStock from "./tools/list-available-stock";
import listMyOrders from "./tools/list-my-orders";
import createOrder from "./tools/create-order";
import getMarketSnapshot from "./tools/get-market-snapshot";
import listMarketInsights from "./tools/list-market-insights";
import createMarketInsight from "./tools/create-market-insight";
import updateMarketInsight from "./tools/update-market-insight";
import getPublicBeefMarketData from "./tools/get-public-beef-market-data";
import recordPublicMarketObservation from "./tools/record-public-market-observation";
import listPublicMarketObservations from "./tools/list-public-market-observations";
import reviewPublicMarketObservation from "./tools/review-public-market-observation";

// The OAuth issuer must be the direct Supabase host; the project ref is the only
// value that survives publish unchanged.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "meatlink",
  title: "Meatlink.id",
  version: "0.1.0",
  instructions:
    "Tools for Meatlink.id (SBMEAT Meat Hub). For Indonesian beef analysis, record dated official public evidence with `record_public_market_observation`, have an admin verify it with `review_public_market_observation`, combine recent observations from `list_public_market_observations` with structural FAOSTAT/USDA data from `get_public_beef_market_data`, check `list_market_insights` for duplicates, then use `create_market_insight`. Operational recommendations require a public price no older than 7 days or public industry/policy context no older than 30 days. Candidate-only evidence caps confidence at medium. Insights are drafts only. Never disclose Meatlink inventory quantities, prices, order volumes, RFQ details, buyer/vendor data or precise locations in an insight.",
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
    recordPublicMarketObservation,
    listPublicMarketObservations,
    reviewPublicMarketObservation,
  ],
});
