import test from 'node:test';
import assert from 'node:assert/strict';
import handler, {
  collectQueryParams,
  fetchChart,
  parseChartSymbol,
  resolvePathSegments,
} from '../api/yahoo-finance.js';

const CHART_BODY = JSON.stringify({ chart: { result: [{ timestamp: [1], indicators: { quote: [{}] } }], error: null } });

type FakeRequest = { method?: string; url?: string; query?: Record<string, string | string[]> };

function jsonResponse(status: number, body: string, contentType = 'application/json') {
  return new Response(body, { status, headers: { 'content-type': contentType } });
}

function createResponse() {
  const res = {
    statusCode: 0,
    headers: {} as Record<string, string>,
    body: undefined as unknown,
    setHeader(name: string, value: string) { res.headers[name.toLowerCase()] = value; return res; },
    status(code: number) { res.statusCode = code; return res; },
    json(payload: unknown) { res.body = payload; return res; },
    send(payload: unknown) { res.body = payload; return res; },
  };
  return res;
}

async function withMockFetch<T>(impl: typeof fetch, run: (calls: string[]) => Promise<T>) {
  const original = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    calls.push(String(input));
    return impl(input, init);
  }) as typeof fetch;
  try {
    return await run(calls);
  } finally {
    globalThis.fetch = original;
  }
}

const silenceConsole = () => {
  const original = console.error;
  console.error = () => {};
  return () => { console.error = original; };
};

test('path comes from the rewrite query value', () => {
  assert.deepEqual(resolvePathSegments({ query: { path: 'v8/finance/chart/AAPL' } }), ['v8', 'finance', 'chart', 'AAPL']);
  assert.deepEqual(resolvePathSegments({ query: { path: ['v8', 'finance', 'chart', 'MSFT'] } }), ['v8', 'finance', 'chart', 'MSFT']);
});

test('path falls back to the original request URL', () => {
  const segments = resolvePathSegments({ url: '/api/yahoo-finance/v8/finance/chart/%5EGSPC?period1=0', query: {} });
  assert.deepEqual(segments, ['v8', 'finance', 'chart', '^GSPC']);
});

test('only the chart endpoint with a sane symbol is accepted', () => {
  assert.equal(parseChartSymbol(['v8', 'finance', 'chart', 'brk-b']), 'BRK-B');
  assert.throws(() => parseChartSymbol(['v7', 'finance', 'quote']), /Only \/v8\/finance\/chart/);
  assert.throws(() => parseChartSymbol(['v8', 'finance', 'chart']), /Invalid ticker/);
  assert.throws(() => parseChartSymbol(['v8', 'finance', 'chart', 'A A']), /Invalid ticker/);
  assert.throws(() => parseChartSymbol(['v8', 'finance', 'chart', 'AAPL', 'extra']), /Only/);
});

test('query params are allow-listed and the path param is dropped', () => {
  const params = collectQueryParams({
    url: '/api/yahoo-finance?path=v8/finance/chart/AAPL&period1=0&period2=10&interval=1d&events=history&evil=1',
    query: { path: 'v8/finance/chart/AAPL', period1: '0' },
  });
  assert.equal(params.toString(), 'period1=0&period2=10&interval=1d&events=history');
});

test('successful upstream response is passed through with browser-like headers', async () => {
  let sentHeaders: Record<string, string> = {};
  const body = await fetchChart('AAPL', new URLSearchParams('interval=1d'), (async (_url: URL, init: RequestInit) => {
    sentHeaders = init.headers as Record<string, string>;
    return jsonResponse(200, CHART_BODY);
  }) as unknown as typeof fetch);
  assert.equal(body, CHART_BODY);
  assert.match(sentHeaders['user-agent'], /Mozilla\/5\.0/);
});

test('rate limiting on query1 falls back to query2', async () => {
  const restore = silenceConsole();
  const hosts: string[] = [];
  try {
    const body = await fetchChart('AAPL', new URLSearchParams(), (async (url: URL) => {
      hosts.push(url.host);
      return url.host.startsWith('query1') ? jsonResponse(429, 'Too Many Requests', 'text/plain') : jsonResponse(200, CHART_BODY);
    }) as unknown as typeof fetch);
    assert.equal(body, CHART_BODY);
    assert.deepEqual(hosts, ['query1.finance.yahoo.com', 'query2.finance.yahoo.com']);
  } finally {
    restore();
  }
});

test('handler returns 200 JSON with CDN caching for a rewritten request', async () => {
  await withMockFetch(async () => jsonResponse(200, CHART_BODY), async calls => {
    const res = createResponse();
    await handler({ method: 'GET', url: '/api/yahoo-finance?path=v8%2Ffinance%2Fchart%2FAAPL&period1=0', query: { path: 'v8/finance/chart/AAPL', period1: '0' } } as FakeRequest, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body, CHART_BODY);
    assert.match(res.headers['cache-control'], /s-maxage=900/);
    assert.equal(calls.length, 1);
    assert.match(calls[0], /^https:\/\/query1\.finance\.yahoo\.com\/v8\/finance\/chart\/AAPL\?period1=0$/);
  });
});

test('handler surfaces Yahoo 404 descriptions without caching', async () => {
  const restore = silenceConsole();
  try {
    const notFound = JSON.stringify({ chart: { result: null, error: { code: 'Not Found', description: 'No data found, symbol may be delisted' } } });
    await withMockFetch(async () => jsonResponse(404, notFound), async calls => {
      const res = createResponse();
      await handler({ method: 'GET', query: { path: 'v8/finance/chart/ZZZZ' } } as FakeRequest, res);
      assert.equal(res.statusCode, 404);
      assert.deepEqual(res.body, { error: 'No data found, symbol may be delisted', symbol: 'ZZZZ', upstreamStatus: 404 });
      assert.equal(res.headers['cache-control'], 'no-store');
      assert.equal(calls.length, 1, '404 should not be retried on the second host');
    });
  } finally {
    restore();
  }
});

test('handler reports a clear error when every host fails', async () => {
  const restore = silenceConsole();
  try {
    await withMockFetch(async () => jsonResponse(429, '<html>Too Many Requests</html>', 'text/html'), async calls => {
      const res = createResponse();
      await handler({ method: 'GET', query: { path: 'v8/finance/chart/AAPL' } } as FakeRequest, res);
      assert.equal(res.statusCode, 503);
      assert.deepEqual(res.body, { error: 'Yahoo Finance is rate-limiting requests (HTTP 429)', symbol: 'AAPL', upstreamStatus: 429 });
      assert.equal(calls.length, 2);
    });

    await withMockFetch(async () => { throw Object.assign(new Error('timed out'), { name: 'TimeoutError' }); }, async () => {
      const res = createResponse();
      await handler({ method: 'GET', query: { path: 'v8/finance/chart/AAPL' } } as FakeRequest, res);
      assert.equal(res.statusCode, 504);
      assert.deepEqual(res.body, { error: 'Yahoo Finance did not respond in time', symbol: 'AAPL' });
    });
  } finally {
    restore();
  }
});

test('handler rejects bad paths and non-GET methods without calling Yahoo', async () => {
  await withMockFetch(async () => jsonResponse(200, CHART_BODY), async calls => {
    const bad = createResponse();
    await handler({ method: 'GET', query: { path: 'v7/finance/quote' } } as FakeRequest, bad);
    assert.equal(bad.statusCode, 400);

    const post = createResponse();
    await handler({ method: 'POST', query: { path: 'v8/finance/chart/AAPL' } } as FakeRequest, post);
    assert.equal(post.statusCode, 405);
    assert.equal(post.headers.allow, 'GET');
    assert.equal(calls.length, 0);
  });
});
