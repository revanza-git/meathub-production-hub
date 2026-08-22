export type MarketObservation = {
  id: string;
  source_name: string;
  source_url: string;
  signal_type: "price" | "industry" | "policy" | "seasonal" | "macro";
  commodity: string;
  market_level: string;
  region: string;
  observed_on: string;
  price_idr_per_kg: number | null;
  value: number | null;
  unit: string | null;
  summary: string;
  verification_status: "candidate" | "verified" | "rejected";
};

const PRICE_MAX_AGE_DAYS = 7;
const CONTEXT_MAX_AGE_DAYS = 30;

function ageInDays(observedOn: string, now: Date): number {
  const observation = new Date(`${observedOn}T00:00:00.000Z`);
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return Math.floor((today.getTime() - observation.getTime()) / 86_400_000);
}

export function evaluateMarketRelevance(
  observations: MarketObservation[],
  requestedConfidence: "low" | "medium" | "high",
  now = new Date(),
) {
  if (observations.length === 0) {
    throw new Error("At least one current public Indonesian market observation is required");
  }

  if (observations.some((observation) => observation.verification_status === "rejected")) {
    throw new Error("Rejected market observations cannot support an insight");
  }

  const dated = observations.map((observation) => ({
    observation,
    age_days: ageInDays(observation.observed_on, now),
  }));
  if (dated.some(({ age_days }) => age_days < -1)) {
    throw new Error("Future-dated market observations cannot support an insight");
  }

  const recentPrice = dated.some(
    ({ observation, age_days }) =>
      observation.signal_type === "price" && age_days >= -1 && age_days <= PRICE_MAX_AGE_DAYS,
  );
  const recentContext = dated.some(
    ({ observation, age_days }) =>
      observation.signal_type !== "price" && age_days >= -1 && age_days <= CONTEXT_MAX_AGE_DAYS,
  );

  if (!recentPrice && !recentContext) {
    throw new Error(
      "Insight requires a price observation from the last 7 days or an industry/policy signal from the last 30 days",
    );
  }

  const allVerified = observations.every(
    (observation) => observation.verification_status === "verified",
  );
  const confidence =
    requestedConfidence === "high" && !allVerified ? "medium" : requestedConfidence;

  return {
    confidence,
    all_verified: allVerified,
    has_recent_price: recentPrice,
    has_recent_industry_context: recentContext,
    freshness_rules: {
      price_max_age_days: PRICE_MAX_AGE_DAYS,
      context_max_age_days: CONTEXT_MAX_AGE_DAYS,
    },
    observations: dated.map(({ observation, age_days }) => ({ ...observation, age_days })),
  };
}

export function containsInternalMarketData(text: string): boolean {
  return /\b(meatlink|internal|platform)\b[\s\S]{0,60}\b(inventory|stock|prices?|orders?|rfqs?|buyers?|vendors?|locations?|kilograms?|kg)\b/i.test(
    text,
  );
}
