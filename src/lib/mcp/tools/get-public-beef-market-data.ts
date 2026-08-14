import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

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

function runtimeEnv(name: string): string | undefined {
  const runtime = globalThis as RuntimeGlobals;
  const value = runtime.Deno?.env?.get?.(name) ?? runtime.process?.env?.[name];
  return value?.trim() || undefined;
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) {
      const details = (await response.text()).slice(0, 500);
      throw new Error(`HTTP ${response.status}${details ? `: ${details}` : ""}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
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

async function faostatToken(): Promise<string> {
  const configuredToken = runtimeEnv("FAOSTAT_API_TOKEN");
  if (configuredToken) return configuredToken;

  const username = runtimeEnv("FAOSTAT_USERNAME");
  const password = runtimeEnv("FAOSTAT_PASSWORD");
  if (!username || !password) {
    throw new Error(
      "FAOSTAT is not configured. Set FAOSTAT_USERNAME and FAOSTAT_PASSWORD, or a temporary FAOSTAT_API_TOKEN.",
    );
  }

  const payload = await fetchJson(`${FAOSTAT_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username, password }),
  });
  const token = asRecord(asRecord(payload)?.AuthenticationResult)?.AccessToken;
  if (typeof token !== "string" || !token) {
    throw new Error("FAOSTAT authentication succeeded but returned no access token.");
  }
  return token;
}

async function getFaostatData(countries: CountryName[], years: number[]) {
  const token = await faostatToken();
  const params = new URLSearchParams({
    area: countries.map((country) => COUNTRIES[country].faostatAreaCode).join(","),
    element: FAOSTAT_PRODUCTION_FILTER_CODE,
    item: FAOSTAT_BEEF_ITEM_CODE,
    year: years.join(","),
    show_codes: "true",
    show_unit: "true",
    show_flags: "true",
    null_values: "false",
    limit: "-1",
    output_type: "objects",
  });
  const payload = asRecord(
    await fetchJson(`${FAOSTAT_BASE_URL}/en/data/QCL?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  );

  return asRecords(payload?.data).map((row) => ({
    country: firstField(row, ["Area", "area"]),
    year: firstField(row, ["Year", "year"]),
    item: firstField(row, ["Item", "item"]),
    element: firstField(row, ["Element", "element"]),
    value: firstField(row, ["Value", "value"]),
    unit: firstField(row, ["Unit", "unit"]),
    flag: firstField(row, ["Flag", "flag"]),
  }));
}

async function getUsdaData(countries: CountryName[], marketYear: number) {
  const apiKey = runtimeEnv("USDA_FAS_API_KEY");
  if (!apiKey) {
    throw new Error("USDA FAS is not configured. Set the USDA_FAS_API_KEY server secret.");
  }

  const responses = await Promise.all(
    countries.map(async (country) => {
      const countryCode = COUNTRIES[country].usdaCountryCode;
      const url = `${USDA_BASE_URL}/commodity/${USDA_BEEF_COMMODITY_CODE}/country/${countryCode}/year/${marketYear}`;
      const payload = await fetchJson(url, { headers: { "X-Api-Key": apiKey } });
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

    const selectedCountries = (countries ?? [
      "Indonesia",
      "Australia",
      "United States",
      "Canada",
      "Japan",
      "New Zealand",
    ]) as CountryName[];
    const currentYear = new Date().getUTCFullYear();
    const usdaMarketYear = market_year ?? currentYear - 1;
    const historyLength = history_years ?? 8;
    const faostatYears = Array.from(
      { length: historyLength },
      (_, index) => currentYear - historyLength - 1 + index,
    );

    const [faostat, usda] = await Promise.allSettled([
      getFaostatData(selectedCountries, faostatYears),
      getUsdaData(selectedCountries, usdaMarketYear),
    ]);

    const result = {
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
        error: faostat.status === "rejected" ? String(faostat.reason) : null,
      },
      usda: {
        status: usda.status === "fulfilled" ? "ok" : "error",
        source: "USDA Foreign Agricultural Service PSD",
        commodity: "Beef and Veal (0111000)",
        market_year: usdaMarketYear,
        source_url: "https://apps.fas.usda.gov/opendatawebV2/",
        records: usda.status === "fulfilled" ? usda.value : [],
        error: usda.status === "rejected" ? String(usda.reason) : null,
      },
    };

    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
      structuredContent: result,
    };
  },
});
