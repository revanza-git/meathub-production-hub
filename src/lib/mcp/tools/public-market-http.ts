/**
 * Shared, secret-safe HTTP helpers for the public beef-market MCP tool.
 *
 * Never log or return Authorization headers, credentials or tokens.
 */

export type ProviderDiag = {
  provider: string;
  attempt: number;
  http_status: number | null;
  content_type: string | null;
  duration_ms: number;
  request_id: string | null;
  outcome: "ok" | "retry" | "error";
};

export type UpstreamErrorCode =
  | "UPSTREAM_BLOCKED"
  | "UPSTREAM_RATE_LIMITED"
  | "UPSTREAM_UNAVAILABLE"
  | "UPSTREAM_AUTH"
  | "NOT_CONFIGURED"
  | "UPSTREAM_ERROR";

export class UpstreamError extends Error {
  code: UpstreamErrorCode;
  httpStatus: number | null;
  constructor(code: UpstreamErrorCode, message: string, httpStatus: number | null = null) {
    super(message);
    this.name = "UpstreamError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

const SECRET_ENV_NAMES = [
  "FAOSTAT_USERNAME",
  "FAOSTAT_PASSWORD",
  "FAOSTAT_API_TOKEN",
  "USDA_FAS_API_KEY",
];

/** Strip anything that could carry a credential, token or bearer header. */
export function redact(input: unknown, secrets: string[] = []): string {
  let text = typeof input === "string" ? input : String(input);
  for (const secret of secrets) {
    if (secret && secret.length >= 4) text = text.split(secret).join("[redacted]");
  }
  text = text
    .replace(/Bearer\s+[A-Za-z0-9._\-+/=]+/gi, "Bearer [redacted]")
    .replace(/\beyJ[A-Za-z0-9._-]{10,}/g, "[redacted-token]")
    .replace(
      /((?:api[-_]?key|apikey|password|username|token)\s*[=:]\s*)("?)[^\s"&,}]+/gi,
      "$1$2[redacted]",
    );
  return text.slice(0, 300);
}

export function currentSecretValues(read: (name: string) => string | undefined): string[] {
  return SECRET_ENV_NAMES.map(read).filter((value): value is string => !!value);
}

/** FAOSTAT sits behind a CDN/WAF that answers with an HTML "Request blocked" page. */
export function isHtmlBlock(status: number, contentType: string | null): boolean {
  const html = (contentType ?? "").toLowerCase().includes("text/html");
  return html && (status === 403 || status === 401 || status === 429 || status >= 500);
}

export function isTransient(status: number, contentType: string | null): boolean {
  if ([429, 502, 503, 504].includes(status)) return true;
  return isHtmlBlock(status, contentType);
}

export function retryAfterMs(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, Math.min(seconds, 10) * 1000);
  const date = Date.parse(header);
  if (Number.isFinite(date)) return Math.max(0, Math.min(date - Date.now(), 10_000));
  return null;
}

export function backoffMs(attempt: number, random: () => number = Math.random): number {
  const base = 300 * 2 ** (attempt - 1);
  return Math.round(base + random() * 250);
}

export type RequestOptions = {
  provider: string;
  init?: RequestInit;
  maxRetries?: number;
  /** Called once with a 401/HTML-block auth failure so the caller can refresh a token. */
  onAuthRefresh?: () => Promise<RequestInit>;
  diagnostics?: ProviderDiag[];
  secrets?: string[];
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  timeoutMs?: number;
};

const REQUEST_ID_HEADERS = ["x-request-id", "cf-ray", "x-amzn-requestid", "x-correlation-id"];

export async function requestJson(url: string, options: RequestOptions): Promise<unknown> {
  const {
    provider,
    maxRetries = 2,
    diagnostics = [],
    secrets = [],
    fetchImpl = fetch,
    sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
    random = Math.random,
    timeoutMs = 20_000,
  } = options;

  let init = options.init ?? {};
  let refreshed = false;
  let lastError: UpstreamError = new UpstreamError("UPSTREAM_ERROR", `${provider} request failed.`);

  for (let attempt = 1; attempt <= maxRetries + 1; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const started = Date.now();
    try {
      const response = await fetchImpl(url, {
        ...init,
        signal: controller.signal,
        headers: { Accept: "application/json", ...(init.headers ?? {}) },
      });
      const contentType = response.headers?.get?.("content-type") ?? null;
      const diag: ProviderDiag = {
        provider,
        attempt,
        http_status: response.status,
        content_type: contentType,
        duration_ms: Date.now() - started,
        request_id:
          REQUEST_ID_HEADERS.map((name) => response.headers?.get?.(name)).find(Boolean) ?? null,
        outcome: "ok",
      };

      if (response.ok) {
        diagnostics.push(diag);
        return await response.json();
      }

      const htmlBlocked = isHtmlBlock(response.status, contentType);
      const canRetry = isTransient(response.status, contentType) && attempt <= maxRetries;

      // JSON 401 → refresh credentials once, then retry once.
      if (
        !htmlBlocked &&
        response.status === 401 &&
        options.onAuthRefresh &&
        !refreshed &&
        attempt <= maxRetries
      ) {
        refreshed = true;
        diag.outcome = "retry";
        diagnostics.push(diag);
        init = await options.onAuthRefresh();
        continue;
      }

      lastError = new UpstreamError(
        htmlBlocked
          ? "UPSTREAM_BLOCKED"
          : response.status === 429
            ? "UPSTREAM_RATE_LIMITED"
            : response.status === 401 || response.status === 403
              ? "UPSTREAM_AUTH"
              : response.status >= 500
                ? "UPSTREAM_UNAVAILABLE"
                : "UPSTREAM_ERROR",
        htmlBlocked
          ? `${provider} temporarily blocked the server request.`
          : `${provider} returned HTTP ${response.status}.`,
        response.status,
      );

      if (!canRetry) {
        diag.outcome = "error";
        diagnostics.push(diag);
        throw lastError;
      }

      diag.outcome = "retry";
      diagnostics.push(diag);
      const wait =
        retryAfterMs(response.headers?.get?.("retry-after") ?? null) ?? backoffMs(attempt, random);
      await sleep(wait);
    } catch (error) {
      if (error instanceof UpstreamError) throw error;
      const diag: ProviderDiag = {
        provider,
        attempt,
        http_status: null,
        content_type: null,
        duration_ms: Date.now() - started,
        request_id: null,
        outcome: attempt <= maxRetries ? "retry" : "error",
      };
      diagnostics.push(diag);
      lastError = new UpstreamError(
        "UPSTREAM_UNAVAILABLE",
        `${provider} request failed: ${redact(error instanceof Error ? error.message : error, secrets)}`,
      );
      if (attempt > maxRetries) throw lastError;
      await sleep(backoffMs(attempt, random));
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError;
}

export function toSanitisedError(error: unknown, secrets: string[]) {
  if (error instanceof UpstreamError) {
    return {
      code: error.code,
      http_status: error.httpStatus,
      message: redact(error.message, secrets),
    };
  }
  return {
    code: "UPSTREAM_ERROR" as const,
    http_status: null,
    message: redact(error instanceof Error ? error.message : error, secrets),
  };
}
