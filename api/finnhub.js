// Vercel Function: same-origin proxy for the Finnhub endpoints the app uses.
//
// The Finnhub API key lives only on the server (process.env.FINNHUB_API_KEY). The browser calls
// /api/finnhub/<endpoint>?..., and this function adds the key as the X-Finnhub-Token header, so
// the key never appears in the bundle, in a browser request, or in an upstream URL.
//
// Routing: vercel.json rewrites /api/finnhub/<path...> to /api/finnhub?path=<path...>, the same
// pattern as api/yahoo-finance.js. Locally, vite.config.js runs this handler as dev middleware.
//
// Only the endpoints listed in ENDPOINTS are proxied, with only their listed parameters, so this
// cannot be used as an open relay to the rest of the Finnhub API on our key.

const FINNHUB_BASE = 'https://finnhub.io/api/v1';
const ROUTE_PREFIX = '/api/finnhub';
const UPSTREAM_TIMEOUT_MS = 8000;

const SYMBOL_PATTERN = /^[A-Za-z0-9.^=_-]{1,24}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const NEWS_CATEGORIES = new Set(['general', 'forex', 'crypto', 'merger']);

const symbol = value => (SYMBOL_PATTERN.test(value) ? value.toUpperCase() : null);
const date = value => (DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(value)) ? value : null);
const category = value => (NEWS_CATEGORIES.has(value) ? value : null);

/**
 * Allowlisted endpoints. `params` maps each accepted query parameter to a validator that returns
 * the normalised value or null; every listed parameter is required. `cache` is the CDN policy for
 * successful responses.
 */
export const ENDPOINTS = {
  quote: {
    params: { symbol },
    cache: 's-maxage=15, stale-while-revalidate=30',
  },
  'stock/profile2': {
    params: { symbol },
    cache: 's-maxage=86400, stale-while-revalidate=86400',
  },
  'company-news': {
    params: { symbol, from: date, to: date },
    cache: 's-maxage=300, stale-while-revalidate=600',
  },
  news: {
    params: { category },
    cache: 's-maxage=300, stale-while-revalidate=600',
  },
};

export const KEY_MISSING_CODE = 'FINNHUB_KEY_MISSING';

export class ProxyError extends Error {
  constructor(status, message, upstreamStatus) {
    super(message);
    this.status = status;
    this.upstreamStatus = upstreamStatus;
  }
}

function safeDecode(segment) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function splitSegments(value) {
  const parts = Array.isArray(value) ? value : [value];
  return parts
    .filter(part => typeof part === 'string')
    .flatMap(part => part.split('/'))
    .map(safeDecode)
    .filter(Boolean);
}

/** The endpoint path, from the rewrite's `path` query value or else the request pathname. */
export function resolveEndpoint(request) {
  let segments = splitSegments(request.query?.path);
  if (segments.length === 0) {
    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
    if (pathname.startsWith(`${ROUTE_PREFIX}/`)) segments = splitSegments(pathname.slice(ROUTE_PREFIX.length));
  }
  return segments.join('/');
}

function readParam(request, name) {
  const fromQuery = request.query?.[name];
  const value = Array.isArray(fromQuery) ? fromQuery[0] : fromQuery;
  if (typeof value === 'string') return value;
  return new URL(request.url ?? '/', 'http://localhost').searchParams.get(name);
}

/**
 * Validates the request against the allowlist and returns the endpoint and the upstream query.
 * Throws a 400 ProxyError for an unknown endpoint or a missing or malformed parameter. Parameters
 * that are not listed for the endpoint (including any `token`) are never forwarded.
 */
export function parseFinnhubRequest(request) {
  const endpoint = resolveEndpoint(request);
  const spec = Object.hasOwn(ENDPOINTS, endpoint) ? ENDPOINTS[endpoint] : undefined;
  if (!spec) {
    throw new ProxyError(400, `Unsupported Finnhub endpoint "${endpoint}". Allowed: ${Object.keys(ENDPOINTS).join(', ')}`);
  }

  const params = new URLSearchParams();
  for (const [name, validate] of Object.entries(spec.params)) {
    const raw = readParam(request, name);
    const value = typeof raw === 'string' ? validate(raw.trim()) : null;
    if (!value) throw new ProxyError(400, `Missing or invalid "${name}" for ${endpoint}`);
    params.set(name, value);
  }
  return { endpoint, params, cache: spec.cache };
}

function describeUpstreamFailure(status) {
  if (status === 401 || status === 403) return `Finnhub refused the server's API key (HTTP ${status})`;
  if (status === 429) return 'Finnhub is rate-limiting requests (HTTP 429)';
  return `Finnhub returned HTTP ${status}`;
}

/**
 * Fetches one allowlisted endpoint, sending the key in a header. Resolves to the JSON text, or
 * throws a ProxyError. Upstream error bodies are not forwarded, and nothing logged includes the key.
 */
export async function fetchFinnhub(endpoint, params, apiKey, fetchImpl = fetch) {
  const upstreamUrl = new URL(`${FINNHUB_BASE}/${endpoint}`);
  params.forEach((value, name) => upstreamUrl.searchParams.set(name, value));

  let upstream;
  try {
    upstream = await fetchImpl(upstreamUrl, {
      headers: { accept: 'application/json', 'X-Finnhub-Token': apiKey },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError';
    console.error(`[finnhub] ${endpoint}: ${timedOut ? 'timed out' : 'network error'}`);
    throw timedOut
      ? new ProxyError(504, 'Finnhub did not respond in time')
      : new ProxyError(502, 'Could not reach Finnhub');
  }

  const body = await upstream.text();
  if (!upstream.ok) {
    const message = describeUpstreamFailure(upstream.status);
    console.error(`[finnhub] ${endpoint}: ${message}`);
    // 503 is reserved for "no key configured", which the client treats as demo mode.
    throw new ProxyError(upstream.status === 429 ? 429 : 502, message, upstream.status);
  }

  try {
    JSON.parse(body);
  } catch {
    console.error(`[finnhub] ${endpoint}: non-JSON 200 response`);
    throw new ProxyError(502, 'Finnhub returned an unexpected response', upstream.status);
  }
  return body;
}

function sendError(response, status, payload) {
  response.setHeader('Cache-Control', 'no-store');
  return response.status(status).json(payload);
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return sendError(response, 405, { error: 'Method not allowed' });
  }

  let parsed;
  try {
    parsed = parseFinnhubRequest(request);
  } catch (error) {
    return sendError(response, error.status ?? 400, { error: error.message });
  }

  const apiKey = (process.env.FINNHUB_API_KEY ?? '').trim();
  if (!apiKey) {
    return sendError(response, 503, {
      error: 'Live market data is not configured: FINNHUB_API_KEY is not set on the server',
      code: KEY_MISSING_CODE,
    });
  }

  try {
    const body = await fetchFinnhub(parsed.endpoint, parsed.params, apiKey);
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', parsed.cache);
    return response.status(200).send(body);
  } catch (error) {
    if (error instanceof ProxyError) {
      return sendError(response, error.status, {
        error: error.message,
        ...(error.upstreamStatus ? { upstreamStatus: error.upstreamStatus } : {}),
      });
    }
    console.error(`[finnhub] ${parsed.endpoint}: unexpected failure ${error?.name ?? 'Error'}`);
    return sendError(response, 500, { error: 'Unexpected proxy failure' });
  }
}
