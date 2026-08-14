import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import {
  UpstreamError,
  currentSecretValues,
  requestJson,
  toSanitisedError,
  type ProviderDiag,
} from "./public-market-http";

type RuntimeGlobals = typeof globalThis & {
  Deno?: { env?: { get?: (name: string) => string | undefined } };
  process?: { env?: Record<string, string | undefined> };
};

type JsonRecord = Record<string, unknown>;

const FAOSTAT_BASE_URL = "https://faostatservices.fao.org/api/v1";
const USDA_BASE_URL = "https://api.fas.usda.gov/api/psd";
const FAOSTAT_BEEF_ITEM_CODE = "867";
const FAOSTAT_PRODUCTION_FILTER_CODE = "2510";
const USDA_BEEF_COMMODITY_CODE = "0111000";

// FAOSTAT's CDN blocks server-side requests that arrive without a browser-like
// identity, so every call sends an explicit, non-secret User-Agent.
const USER_AGENT = "Meatlink-MCP/1.0 (+https://www.meatlink.id; market-data)";

const COUNTRIES = {
  Indonesia: { faostatAreaCode: "101", usdaCountryCode: "ID" },
  Australia: { faostatAreaCode: "10", usdaCountryCode: "AS" },
  "United States": { faostatAreaCode: "231", usdaCountryCode: "US" },
  Canada: { faostatAreaCode: "33", usdaCountryCode: "CA" },
  Japan: { faostatAreaCode: "110", usdaCountryCode: "JA" },
  "New Zealand": { faostatAreaCode: "156", usdaCountryCode: "NZ" },
} as const;

type CountryName = keyof typeof COUNTRIES;

const USDA_ATTRIBUTES: Record<number, string> = {
  28: "Production",
  57: "Imports",
  88: "Exports",
  125: "Domestic consumption",
};

const USDA_UNITS: Record<number, string> = {
  7: "1,000 metric tonnes carcass-weight equivalent",
};

export function runtimeEnv(name: string): string | undefined {
  const runtime = globalThis as RuntimeGlobals;
  const value = runtime.Deno?.env?.get?.(name) ?? runtime.process?.env?.[name];
  return value?.trim() || undefined;
}

function asRecord(value: unknown): JsonRecord | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : undefined;
}

function asRecords(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.map(asRecord).filter((row): row is JsonRecord => !!row) : [];
}

function firstField(record: JsonRecord, names: string[]): unknown {
  for (const name of names) {
    if (record[name] !== undefined && record[name] !== null) return record[name];
  }
  return null;
}

export type Deps = {
  env?: (name: string) => string | undefined;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
};

/** Always mints a fresh short-lived token; tokens are never cached or persisted. */
async function faostatToken(deps: Required<Pick<Deps, "env">> & Deps, diagnostics: ProviderDiag[]) {
  const configuredToken = deps.env("FAOSTAT_API_TOKEN");
  if (configuredToken) return configuredToken;

  const username = deps.env("FAOSTAT_USERNAME");
  const password = deps.env("FAOSTAT_PASSWORD");
  if (!username || !password) {
    throw new UpstreamError(
      "NOT_CONFIGURED",
      "FAOSTAT is not configured on the server.",
    );
  }

  const payload = await requestJson(`${FAOSTAT_BASE_URL}/auth/login`, {
    provider: "FAOSTAT auth",
    init: {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "user-agent": USER_AGENT,
      },
      body: new URLSearchParams({ username, password }),
    },
    maxRetries: 1,
    diagnostics,
    secrets: currentSecretValues(deps.env),
    fetchImpl: deps.fetchImpl,
    sleep: deps.sleep,
    random: deps.random,
  });

  const token = asRecord(asRecord(payload)?.AuthenticationResult)?.AccessToken;
  if (typeof token !== "string" || !token) {
    throw new UpstreamError("UPSTREAM_AUTH", "FAOSTAT authentication returned no access token.");
  }
  return token;
}

function normaliseFaostatRows(payload: unknown) {
  return asRecords(asRecord(payload)?.data).map((row) => ({
    country: firstField(row, ["Area", "area"]),
    year: firstField(row, ["Year", "year"]),
    item: firstField(row, ["Item", "item"]),
    element: firstField(row, ["Element", "element"]),
    value: firstField(row, ["Value", "value"]),
    unit: firstField(row, ["Unit", "unit"]),
    flag: firstField(row, ["Flag", "flag"]),
  }));
}

export async function getFaostatData(
  countries: CountryName[],
  years: number[],
  deps: Deps = {},
  diagnostics: ProviderDiag[] = [],
) {
  const env = deps.env ?? runtimeEnv;
  let token = await faostatToken({ ...deps, env }, diagnostics);
  const secrets = currentSecretValues(env);

  const buildInit = (bearer: string): RequestInit => ({
    headers: {
      Authorization: `Bearer ${bearer}`,
      Accept: "application/json",
      "user-agent": USER_AGENT,
    },
  });

  // Small per-country batches: large combined queries are the ones FAOSTAT's
  // CDN throttles. Concurrency is capped at 2.
  const batches = countries.map((country) => ({ country, years }));
  const rows: ReturnType<typeof normaliseFaostatRows> = [];
  const concurrency = 2;

  for (let index = 0; index < batches.length; index += concurrency) {
    const slice = batches.slice(index, index + concurrency);
    const results = await Promise.all(
      slice.map(async ({ country, years: batchYears }) => {
        const params = new URLSearchParams({
          area: COUNTRIES[country].faostatAreaCode,
          element: FAOSTAT_PRODUCTION_FILTER_CODE,
          item: FAOSTAT_BEEF_ITEM_CODE,
          year: batchYears.join(","),
          show_codes: "true",
          show_unit: "true",
          show_flags: "true",
          null_values: "false",
          limit: "-1",
          output_type: "objects",
        });
        return requestJson(`${FAOSTAT_BASE_URL}/en/data/QCL?${params.toString()}`, {
          provider: "FAOSTAT",
          init: buildInit(token),
          maxRetries: 2,
          diagnostics,
          secrets,
          fetchImpl: deps.fetchImpl,
          sleep: deps.sleep,
          random: deps.random,
          onAuthRefresh: async () => {
            token = await faostatToken({ ...deps, env }, diagnostics);
            return buildInit(token);
          },
        });
      }),
    );
    for (const payload of results) rows.push(...normaliseFaostatRows(payload));
  }

  // Deduplicate merged batches.
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = `${String(row.country)}|${String(row.year)}|${String(row.element)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function getUsdaData(
  countries: CountryName[],
  marketYear: number,
  deps: Deps = {},
  diagnostics: ProviderDiag[] = [],
) {
  const env = deps.env ?? runtimeEnv;
  const apiKey = env("USDA_FAS_API_KEY");
  if (!apiKey) {
    throw new UpstreamError("NOT_CONFIGURED", "USDA FAS is not configured on the server.");
  }
  const secrets = currentSecretValues(env);

  const responses = await Promise.all(
    countries.map(async (country) => {
      const countryCode = COUNTRIES[country].usdaCountryCode;
      const url = `${USDA_BASE_URL}/commodity/${USDA_BEEF_COMMODITY_CODE}/country/${countryCode}/year/${marketYear}`;
      const payload = await requestJson(url, {
        provider: "USDA",
        init: { headers: { "X-Api-Key": apiKey, Accept: "application/json", "user-agent": USER_AGENT } },
        maxRetries: 2,
        diagnostics,
        secrets,
        fetchImpl: deps.fetchImpl,
        sleep: deps.sleep,
        random: deps.random,
      });
      return asRecords(payload)
        .filter((row) => typeof row.attributeId === "number" && USDA_ATTRIBUTES[row.attributeId])
        .map((row) => ({
          country,
          country_code: countryCode,
          market_year: row.marketYear ?? marketYear,
          release_calendar_year: row.calendarYear ?? null,
          release_month: row.month ?? null,
          attribute: USDA_ATTRIBUTES[row.attributeId as number],
          value: row.value ?? null,
          unit: USDA_UNITS[row.unitId as number] ?? `USDA unit ${String(row.unitId ?? "unknown")}`,
        }));
    }),
  );
  return responses.flat();
}

export async function buildPublicBeefMarketData(
  args: { countries?: CountryName[]; market_year?: number; history_years?: number },
  deps: Deps = {},
) {
  const env = deps.env ?? runtimeEnv;
  const secrets = currentSecretValues(env);
  const selectedCountries = (args.countries ?? [
    "Indonesia",
    "Australia",
    "United States",
    "Canada",
    "Japan",
    "New Zealand",
  ]) as CountryName[];
  const currentYear = new Date().getUTCFullYear();
  const usdaMarketYear = args.market_year ?? currentYear - 1;
  const historyLength = args.history_years ?? 8;
  const faostatYears = Array.from(
    { length: historyLength },
    (_, index) => currentYear - historyLength - 1 + index,
  );

  const diagnostics: ProviderDiag[] = [];
  const [faostat, usda] = await Promise.allSettled([
    getFaostatData(selectedCountries, faostatYears, { ...deps, env }, diagnostics),
    getUsdaData(selectedCountries, usdaMarketYear, { ...deps, env }, diagnostics),
  ]);

  const faostatError = faostat.status === "rejected" ? toSanitisedError(faostat.reason, secrets) : null;
  const usdaError = usda.status === "rejected" ? toSanitisedError(usda.reason, secrets) : null;

  return {
    generated_at: new Date().toISOString(),
    disclosure: "Public external statistics only. No Meatlink internal data is included.",
    faostat: {
      status: faostat.status === "fulfilled" ? "ok" : "error",
      source: "FAOSTAT",
      dataset: "QCL — Production: Crops and livestock products",
      item: "Meat of cattle with the bone; fresh or chilled (item 867)",
      element: "Production quantity (filter code 2510)",
      source_url: "https://www.fao.org/faostat/en/#data/QCL",
      records: faostat.status === "fulfilled" ? faostat.value : [],
      ...(faostatError ?? {}),
      error: faostatError ? faostatError.message : null,
    },
    usda: {
      status: usda.status === "fulfilled" ? "ok" : "error",
      source: "USDA Foreign Agricultural Service PSD",
      commodity: "Beef and Veal (0111000)",
      market_year: usdaMarketYear,
      source_url: "https://apps.fas.usda.gov/opendatawebV2/",
      records: usda.status === "fulfilled" ? usda.value : [],
      ...(usdaError ?? {}),
      error: usdaError ? usdaError.message : null,
    },
    diagnostics: diagnostics.map((entry) => ({ ...entry })),
  };
}

export default defineTool({
  name: "get_public_beef_market_data",
  title: "Get public beef market data",
  description:
    "Read public beef-market statistics from FAOSTAT and USDA FAS. Returns FAOSTAT cattle-meat production history and USDA Beef & Veal production, import, export and consumption forecasts. Contains public external data only; it never reads Meatlink inventory, buyers, vendors, orders or RFQs.",
  inputSchema: {
    countries: z
      .array(z.enum(["Indonesia", "Australia", "United States", "Canada", "Japan", "New Zealand"]))
      .min(1)
      .max(6)
      .optional()
      .describe(
        "Countries to compare. Defaults to Indonesia and major Meatlink-relevant beef origins.",
      ),
    market_year: z
      .number()
      .int()
      .min(1961)
      .max(2100)
      .optional()
      .describe("USDA market year. Defaults to the previous calendar year."),
    history_years: z
      .number()
      .int()
      .min(1)
      .max(15)
      .optional()
      .describe("Number of calendar years requested from FAOSTAT. Defaults to 8."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ countries, market_year, history_years }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }

    const result = await buildPublicBeefMarketData({
      countries: countries as CountryName[] | undefined,
      market_year,
      history_years,
    });

    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
      structuredContent: result,
    };
  },
});
