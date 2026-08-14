import { describe, expect, it } from "vitest";
import {
  buildPublicBeefMarketData,
  getFaostatData,
  getUsdaData,
} from "./get-public-beef-market-data";
import { redact, retryAfterMs, isTransient } from "./public-market-http";

const env = (name: string) =>
  ({
    FAOSTAT_USERNAME: "user-secret-value",
    FAOSTAT_PASSWORD: "pass-secret-value",
    USDA_FAS_API_KEY: "usda-secret-value",
  })[name];

const noSleep = async () => {};
const noJitter = () => 0;

function res(
  body: unknown,
  {
    status = 200,
    contentType = "application/json",
  }: { status?: number; contentType?: string } = {},
) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (n: string) => (n.toLowerCase() === "content-type" ? contentType : null) },
    json: async () => body,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  } as unknown as Response;
}

const LOGIN_OK = { AuthenticationResult: { AccessToken: "eyJfaketokenvalue0123456789" } };
const QCL_OK = {
  data: [
    {
      Area: "Indonesia",
      Year: 2020,
      Item: "Cattle",
      Element: "Production",
      Value: 453418,
      Unit: "t",
      Flag: "A",
    },
  ],
};
const HTML_BLOCK =
  "<html><body>Request blocked. We can't connect to the server for this app or website.</body></html>";

describe("faostat retrieval", () => {
  it("authenticates and returns normalised rows", async () => {
    const calls: string[] = [];
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      calls.push(url);
      if (url.includes("/auth/login")) return res(LOGIN_OK);
      const headers = init?.headers as Record<string, string>;
      expect(headers.Authorization).toBe("Bearer eyJfaketokenvalue0123456789");
      expect(headers["user-agent"]).toContain("Meatlink-MCP");
      return res(QCL_OK);
    }) as unknown as typeof fetch;

    const rows = await getFaostatData(["Indonesia"], [2020], {
      env,
      fetchImpl,
      sleep: noSleep,
      random: noJitter,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.value).toBe(453418);
    expect(calls[1]).toContain("https://faostatservices.fao.org/api/v1/en/data/QCL?");
    expect(calls[1]).toContain("area=101");
    expect(calls[1]).toContain("element=2510");
    expect(calls[1]).toContain("item=867");
  });

  it("refreshes the token once on a JSON 401 and retries", async () => {
    let logins = 0;
    let dataCalls = 0;
    const fetchImpl = (async (url: string) => {
      if (url.includes("/auth/login")) {
        logins += 1;
        return res(LOGIN_OK);
      }
      dataCalls += 1;
      return dataCalls === 1 ? res({ message: "expired" }, { status: 401 }) : res(QCL_OK);
    }) as unknown as typeof fetch;

    const rows = await getFaostatData(["Indonesia"], [2020], {
      env,
      fetchImpl,
      sleep: noSleep,
      random: noJitter,
    });
    expect(logins).toBe(2);
    expect(dataCalls).toBe(2);
    expect(rows).toHaveLength(1);
  });

  it("retries a bounded number of times on the HTML CDN 403", async () => {
    let dataCalls = 0;
    const fetchImpl = (async (url: string) => {
      if (url.includes("/auth/login")) return res(LOGIN_OK);
      dataCalls += 1;
      return dataCalls < 3
        ? res(HTML_BLOCK, { status: 403, contentType: "text/html" })
        : res(QCL_OK);
    }) as unknown as typeof fetch;

    const rows = await getFaostatData(["Indonesia"], [2020], {
      env,
      fetchImpl,
      sleep: noSleep,
      random: noJitter,
    });
    expect(dataCalls).toBe(3);
    expect(rows).toHaveLength(1);
  });

  it("gives up after two retries and never leaks the HTML page", async () => {
    const fetchImpl = (async (url: string) =>
      url.includes("/auth/login")
        ? res(LOGIN_OK)
        : res(HTML_BLOCK, { status: 403, contentType: "text/html" })) as unknown as typeof fetch;

    await expect(
      getFaostatData(["Indonesia"], [2020], { env, fetchImpl, sleep: noSleep, random: noJitter }),
    ).rejects.toMatchObject({ code: "UPSTREAM_BLOCKED", httpStatus: 403 });
  });

  it("honours Retry-After on 429", async () => {
    const waits: number[] = [];
    let dataCalls = 0;
    const fetchImpl = (async (url: string) => {
      if (url.includes("/auth/login")) return res(LOGIN_OK);
      dataCalls += 1;
      if (dataCalls === 1) {
        return {
          ok: false,
          status: 429,
          headers: {
            get: (n: string) =>
              n.toLowerCase() === "retry-after"
                ? "2"
                : n.toLowerCase() === "content-type"
                  ? "application/json"
                  : null,
          },
          json: async () => ({}),
          text: async () => "rate limited",
        } as unknown as Response;
      }
      return res(QCL_OK);
    }) as unknown as typeof fetch;

    await getFaostatData(["Indonesia"], [2020], {
      env,
      fetchImpl,
      sleep: async (ms: number) => {
        waits.push(ms);
      },
      random: noJitter,
    });
    expect(waits).toContain(2000);
  });

  it("distinguishes an empty legitimate result from a failure", async () => {
    const fetchImpl = (async (url: string) =>
      url.includes("/auth/login") ? res(LOGIN_OK) : res({ data: [] })) as unknown as typeof fetch;
    const rows = await getFaostatData(["Indonesia"], [2020], {
      env,
      fetchImpl,
      sleep: noSleep,
      random: noJitter,
    });
    expect(rows).toEqual([]);
  });
});

describe("combined tool payload", () => {
  it("keeps USDA data when FAOSTAT is permanently blocked", async () => {
    const fetchImpl = (async (url: string) => {
      if (url.includes("faostatservices")) {
        return url.includes("/auth/login")
          ? res(LOGIN_OK)
          : res(HTML_BLOCK, { status: 403, contentType: "text/html" });
      }
      return res([{ attributeId: 28, unitId: 7, value: 2500, marketYear: 2025 }]);
    }) as unknown as typeof fetch;

    const result = await buildPublicBeefMarketData(
      { countries: ["Indonesia"], history_years: 1, market_year: 2025 },
      { env, fetchImpl, sleep: noSleep, random: noJitter },
    );
    expect(result.faostat.status).toBe("error");
    expect(result.faostat).toMatchObject({ code: "UPSTREAM_BLOCKED", http_status: 403 });
    expect(result.faostat.error).toBe("FAOSTAT temporarily blocked the server request.");
    expect(JSON.stringify(result)).not.toContain("Request blocked");
    expect(result.usda.status).toBe("ok");
    expect(result.usda.records).toHaveLength(1);
  });

  it("redacts secrets and tokens from errors and diagnostics", async () => {
    const fetchImpl = (async (url: string) => {
      if (url.includes("/auth/login"))
        throw new Error("connect failed for user-secret-value with Bearer eyJabc123456789xyz");
      return res([]);
    }) as unknown as typeof fetch;

    const result = await buildPublicBeefMarketData(
      { countries: ["Indonesia"], history_years: 1, market_year: 2025 },
      { env, fetchImpl, sleep: noSleep, random: noJitter },
    );
    const serialised = JSON.stringify(result);
    expect(serialised).not.toContain("user-secret-value");
    expect(serialised).not.toContain("usda-secret-value");
    expect(serialised).not.toContain("eyJabc123456789xyz");
    expect(serialised).not.toMatch(/Authorization/i);
  });

  it("reports USDA misconfiguration without leaking key names' values", async () => {
    const fetchImpl = (async () => res({})) as unknown as typeof fetch;
    await expect(
      getUsdaData(["Indonesia"], 2025, { env: () => undefined, fetchImpl }),
    ).rejects.toMatchObject({ code: "NOT_CONFIGURED" });
  });
});

describe("http helpers", () => {
  it("classifies transient statuses", () => {
    expect(isTransient(403, "text/html")).toBe(true);
    expect(isTransient(403, "application/json")).toBe(false);
    expect(isTransient(429, "application/json")).toBe(true);
    expect(isTransient(400, "application/json")).toBe(false);
  });

  it("parses Retry-After seconds", () => {
    expect(retryAfterMs("3")).toBe(3000);
    expect(retryAfterMs(null)).toBeNull();
  });

  it("redacts bearer tokens", () => {
    expect(redact("Authorization: Bearer eyJabc.def.ghi")).toContain("[redacted]");
  });
});
