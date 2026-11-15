// Browser-side access to Finnhub, always through the same-origin /api/finnhub proxy. The API key
// lives only on the server (FINNHUB_API_KEY); nothing here knows or sends it.

export const FINNHUB_PROXY_PATH = '/api/finnhub';

export type FinnhubEndpoint = 'quote' | 'stock/profile2' | 'company-news' | 'news';

/** Thrown when the proxy answers 503: no key is configured, so the app runs in demo mode. */
export class FinnhubUnavailableError extends Error {
  constructor() {
    super('Live market data is not configured');
    this.name = 'FinnhubUnavailableError';
  }
}

export function isFinnhubUnavailable(error: unknown): error is FinnhubUnavailableError {
  return error instanceof FinnhubUnavailableError;
}

// A missing server key does not change without a redeploy (or a dev-server restart), so after the
// first 503 skip further requests for the rest of this page load.
let unavailable = false;

/** True once the proxy has answered 503 during this page load. */
export function isFinnhubKnownUnavailable(): boolean {
  return unavailable;
}

/** For tests: forget a previous 503. */
export function resetFinnhubAvailability(): void {
  unavailable = false;
}

/** Same-origin proxy URL for an allowlisted Finnhub endpoint. */
export function finnhubUrl(endpoint: FinnhubEndpoint, params: Record<string, string>): string {
  return `${FINNHUB_PROXY_PATH}/${endpoint}?${new URLSearchParams(params).toString()}`;
}

/**
 * Fetches and parses one Finnhub endpoint through the proxy. Rejects with FinnhubUnavailableError
 * when no key is configured, and with a plain Error for any other failed response.
 */
export async function fetchFinnhub<T = unknown>(
  endpoint: FinnhubEndpoint,
  params: Record<string, string>,
  fetchImpl: typeof fetch = fetch,
): Promise<T> {
  if (unavailable) throw new FinnhubUnavailableError();

  const response = await fetchImpl(finnhubUrl(endpoint, params));
  if (response.status === 503) {
    unavailable = true;
    throw new FinnhubUnavailableError();
  }
  if (!response.ok) throw new Error(`Finnhub ${endpoint} returned HTTP ${response.status}`);
  return response.json() as Promise<T>;
}
