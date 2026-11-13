// Vercel Function: same-origin proxy for Yahoo Finance daily chart data.
//
// Routing: vercel.json rewrites /api/yahoo-finance/<path...> to /api/yahoo-finance?path=<path...>,
// so this single function serves every symbol. (Catch-all filenames such as [...path].js are only
// routed by Vercel for Next.js projects, which is why the previous function was never invoked.)
//
// Only the chart endpoint is proxied (/v8/finance/chart/<SYMBOL>) so this cannot be used as an
// open relay to arbitrary Yahoo endpoints.

const YAHOO_HOSTS = ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com'];
const ROUTE_PREFIX = '/api/yahoo-finance';
const ATTEMPT_TIMEOUT_MS = 4500;
const SYMBOL_PATTERN = /^[A-Za-z0-9.^=_-]{1,24}$/;
const ALLOWED_QUERY_PARAMS = new Set(['period1', 'period2', 'range', 'interval', 'events', 'includePrePost']);

// Yahoo throttles or rejects requests that do not look like they come from a browser.
const UPSTREAM_HEADERS = {
  accept: 'application/json,text/plain,*/*',
  'accept-language': 'en-US,en;q=0.9',
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  referer: 'https://finance.yahoo.com/',
  origin: 'https://finance.yahoo.com',
};

class ProxyError extends Error {
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

/**
 * Resolves the upstream path segments. Prefers the `path` query value set by the vercel.json
 * rewrite; falls back to the request pathname in case the platform hands us the original URL.
 */
export function resolvePathSegments(request) {
  const fromQuery = splitSegments(request.query?.path);
  if (fromQuery.length > 0) return fromQuery;

  const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
  if (!pathname.startsWith(`${ROUTE_PREFIX}/`)) return [];
  return splitSegments(pathname.slice(ROUTE_PREFIX.length));
}

/** Returns the symbol for a /v8/finance/chart/<SYMBOL> path, or throws a 400 ProxyError. */
export function parseChartSymbol(segments) {
  const [version, area, endpoint, symbol, ...rest] = segments;
  if (version !== 'v8' || area !== 'finance' || endpoint !== 'chart' || rest.length > 0) {
    throw new ProxyError(400, 'Only /v8/finance/chart/<SYMBOL> is supported by this proxy');
  }
  if (!symbol || !SYMBOL_PATTERN.test(symbol)) {
    throw new ProxyError(400, `Invalid ticker symbol "${symbol ?? ''}"`);
  }
  return symbol.toUpperCase();
}

/** Collects allowed query parameters from both request.query and the raw URL. */
export function collectQueryParams(request) {
  const params = new URLSearchParams();
  const seen = new Set();
  const add = (key, value) => {
    if (!ALLOWED_QUERY_PARAMS.has(key) || value === undefined || value === null) return;
    params.append(key, String(value));
    seen.add(key);
  };

  Object.entries(request.query ?? {}).forEach(([key, value]) => {
    (Array.isArray(value) ? value : [value]).forEach(item => add(key, item));
  });

  const urlParams = new URL(request.url ?? '/', 'http://localhost').searchParams;
  urlParams.forEach((value, key) => {
    if (!seen.has(key)) add(key, value);
  });

  return params;
}

function describeUpstreamFailure(status, body) {
  let detail = '';
  try {
    const parsed = JSON.parse(body);
    detail = parsed?.chart?.error?.description || parsed?.finance?.error?.description || '';
  } catch {
    // Non-JSON body (HTML error or consent page); fall back to the status-based message.
  }
  if (status === 404) return detail || 'Yahoo Finance has no chart data for this symbol';
  if (status === 429) return 'Yahoo Finance is rate-limiting requests (HTTP 429)';
  if (status === 401 || status === 403) return `Yahoo Finance refused the request (HTTP ${status})`;
  return detail ? `Yahoo Finance error (HTTP ${status}): ${detail}` : `Yahoo Finance returned HTTP ${status}`;
}

function isRetryable(status) {
  return status === 401 || status === 403 || status === 429 || status >= 500;
}

/**
 * Fetches chart JSON from Yahoo, trying each host in turn for retryable failures.
 * Resolves to the raw JSON text, or throws a ProxyError describing the last failure.
 */
export async function fetchChart(symbol, params, fetchImpl = fetch) {
  let lastError = new ProxyError(502, 'Yahoo Finance is unavailable');

  for (const host of YAHOO_HOSTS) {
    const upstreamUrl = new URL(`/v8/finance/chart/${encodeURIComponent(symbol)}`, host);
    params.forEach((value, key) => upstreamUrl.searchParams.append(key, value));

    let upstream;
    try {
      upstream = await fetchImpl(upstreamUrl, {
        headers: UPSTREAM_HEADERS,
        signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
      });
    } catch (error) {
      const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError';
      lastError = timedOut
        ? new ProxyError(504, 'Yahoo Finance did not respond in time')
        : new ProxyError(502, 'Could not reach Yahoo Finance');
      console.error(`[yahoo-finance] ${host} ${symbol}: ${error?.name ?? 'Error'} ${error?.message ?? ''}`);
      continue;
    }

    const body = await upstream.text();

    if (upstream.ok) {
      const contentType = upstream.headers.get('content-type') ?? '';
      try {
        const parsed = JSON.parse(body);
        if (!parsed?.chart) throw new Error('missing chart payload');
        if (parsed.chart.error) {
          throw new ProxyError(404, parsed.chart.error.description || 'Yahoo Finance has no chart data for this symbol', upstream.status);
        }
        return body;
      } catch (error) {
        if (error instanceof ProxyError) throw error;
        lastError = new ProxyError(502, 'Yahoo Finance returned an unexpected response', upstream.status);
        console.error(`[yahoo-finance] ${host} ${symbol}: unparseable 200 response (${contentType})`);
        continue;
      }
    }

    const message = describeUpstreamFailure(upstream.status, body);
    console.error(`[yahoo-finance] ${host} ${symbol}: HTTP ${upstream.status} – ${message}`);

    if (!isRetryable(upstream.status)) {
      // 400/404 etc. will not improve on another host; surface it to the client as-is.
      throw new ProxyError(upstream.status === 404 ? 404 : 400, message, upstream.status);
    }
    lastError = new ProxyError(upstream.status === 429 ? 503 : 502, message, upstream.status);
  }

  throw lastError;
}

function sendError(response, error, symbol) {
  const status = error instanceof ProxyError ? error.status : 500;
  const payload = {
    error: error instanceof ProxyError ? error.message : 'Unexpected proxy failure',
    ...(symbol ? { symbol } : {}),
    ...(error instanceof ProxyError && error.upstreamStatus ? { upstreamStatus: error.upstreamStatus } : {}),
  };
  response.setHeader('Cache-Control', 'no-store');
  return response.status(status).json(payload);
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  let symbol;
  try {
    symbol = parseChartSymbol(resolvePathSegments(request));
    const body = await fetchChart(symbol, collectQueryParams(request));
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
    return response.status(200).send(body);
  } catch (error) {
    if (!(error instanceof ProxyError)) console.error('[yahoo-finance] unexpected failure', error);
    return sendError(response, error, symbol);
  }
}
