import test from 'node:test';
import assert from 'node:assert/strict';
import handler, { ENDPOINTS, KEY_MISSING_CODE, fetchFinnhub, parseFinnhubRequest, resolveEndpoint } from '../api/finnhub.js';

const TEST_KEY = 'test-finnhub-key-123';
const QUOTE_BODY = JSON.stringify({ c: 190.5, pc: 188.1 });

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

type Call = { url: string; headers: Record<string, string> };

/** Runs `run` with a fake fetch, a given server key, and console.error captured. */
async function withServer<T>(
  options: { key?: string; respond?: (url: string) => Response | Promise<Response> },
  run: (calls: Call[], logs: string[]) => Promise<T>,
) {
  const originalFetch = globalThis.fetch;
  const originalError = console.error;
  const originalKey = process.env.FINNHUB_API_KEY;
  const calls: Call[] = [];
  const logs: string[] = [];

  if (options.key === undefined) delete process.env.FINNHUB_API_KEY;
  else process.env.FINNHUB_API_KEY = options.key;
  console.error = (...args: unknown[]) => { logs.push(args.map(String).join(' ')); };
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), headers: (init?.headers ?? {}) as Record<string, string> });
    return options.respond ? options.respond(String(input)) : jsonResponse(200, QUOTE_BODY);
  }) as typeof fetch;

  try {
    return await run(calls, logs);
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalError;
    if (originalKey === undefined) delete process.env.FINNHUB_API_KEY;
    else process.env.FINNHUB_API_KEY = originalKey;
  }
}

async function get(request: FakeRequest) {
  const res = createResponse();
  await handler({ method: 'GET', ...request }, res);
  return res;
}

test('the endpoint comes from the rewrite query value or the request URL', () => {
  assert.equal(resolveEndpoint({ query: { path: 'stock/profile2' } }), 'stock/profile2');
  assert.equal(resolveEndpoint({ query: { path: ['stock', 'profile2'] } }), 'stock/profile2');
  assert.equal(resolveEndpoint({ url: '/api/finnhub/company-news?symbol=AAPL', query: {} }), 'company-news');
});

test('only the four allowlisted endpoints are accepted', () => {
  assert.deepEqual(Object.keys(ENDPOINTS).sort(), ['company-news', 'news', 'quote', 'stock/profile2']);

  const quote = parseFinnhubRequest({ query: { path: 'quote', symbol: 'brk.b' } });
  assert.equal(quote.endpoint, 'quote');
  assert.equal(quote.params.toString(), 'symbol=BRK.B');

  const news = parseFinnhubRequest({ query: { path: 'company-news', symbol: 'AAPL', from: '2026-11-06', to: '2026-11-13' } });
  assert.equal(news.params.toString(), 'symbol=AAPL&from=2026-11-06&to=2026-11-13');

  for (const path of ['stock/candle', 'stock/metric', 'calendar/earnings', 'search', 'quote/extra', '', '../quote', 'constructor', '__proto__']) {
    assert.throws(() => parseFinnhubRequest({ query: { path, symbol: 'AAPL' } }), /Unsupported Finnhub endpoint/, `"${path}" should be rejected`);
  }
});

test('parameters are validated and anything unlisted is dropped', () => {
  assert.throws(() => parseFinnhubRequest({ query: { path: 'quote' } }), /invalid "symbol"/);
  assert.throws(() => parseFinnhubRequest({ query: { path: 'quote', symbol: 'A A' } }), /invalid "symbol"/);
  assert.throws(() => parseFinnhubRequest({ query: { path: 'company-news', symbol: 'AAPL', from: 'yesterday', to: '2026-11-13' } }), /invalid "from"/);
  assert.throws(() => parseFinnhubRequest({ query: { path: 'news', category: 'everything' } }), /invalid "category"/);

  const parsed = parseFinnhubRequest({
    url: '/api/finnhub?path=quote&symbol=AAPL&token=stolen&exchange=US',
    query: { path: 'quote', symbol: 'AAPL', token: 'stolen', exchange: 'US' },
  });
  assert.equal(parsed.params.toString(), 'symbol=AAPL');
});

test('handler rejects unlisted endpoints with 400 without calling Finnhub', async () => {
  await withServer({ key: TEST_KEY }, async calls => {
    const res = await get({ query: { path: 'stock/candle', symbol: 'AAPL' } });
    assert.equal(res.statusCode, 400);
    assert.match((res.body as { error: string }).error, /Unsupported Finnhub endpoint "stock\/candle"/);
    assert.equal(res.headers['cache-control'], 'no-store');

    const badParam = await get({ query: { path: 'quote', symbol: '<script>' } });
    assert.equal(badParam.statusCode, 400);

    const post = createResponse();
    await handler({ method: 'POST', query: { path: 'quote', symbol: 'AAPL' } } as FakeRequest, post);
    assert.equal(post.statusCode, 405);
    assert.equal(post.headers.allow, 'GET');

    assert.equal(calls.length, 0);
  });
});

test('handler answers 503 JSON when the key is missing or blank', async () => {
  for (const key of [undefined, '', '   ']) {
    await withServer({ key }, async calls => {
      const res = await get({ query: { path: 'quote', symbol: 'AAPL' } });
      assert.equal(res.statusCode, 503);
      assert.deepEqual(res.body, {
        error: 'Live market data is not configured: FINNHUB_API_KEY is not set on the server',
        code: KEY_MISSING_CODE,
      });
      assert.equal(res.headers['cache-control'], 'no-store');
      assert.equal(calls.length, 0);
    });
  }
});

test('an unlisted endpoint is still a 400, not a 503, when the key is missing', async () => {
  await withServer({ key: undefined }, async () => {
    const res = await get({ query: { path: 'stock/candle', symbol: 'AAPL' } });
    assert.equal(res.statusCode, 400);
  });
});

test('the key is sent as a header, never in the URL, the response or the logs', async () => {
  await withServer({ key: TEST_KEY }, async (calls, logs) => {
    const res = await get({
      url: '/api/finnhub?path=quote&symbol=aapl&token=client-supplied',
      query: { path: 'quote', symbol: 'aapl', token: 'client-supplied' },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body, QUOTE_BODY);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://finnhub.io/api/v1/quote?symbol=AAPL');
    assert.equal(calls[0].headers['X-Finnhub-Token'], TEST_KEY);
    assert.doesNotMatch(calls[0].url, /token/i);
    assert.equal(logs.length, 0);
  });

  // Upstream failures: the key must not leak through the error payload or the logs either.
  const failures: Array<[number, number]> = [[401, 502], [403, 502], [429, 429], [500, 502]];
  for (const [upstreamStatus, expected] of failures) {
    await withServer({ key: TEST_KEY, respond: () => jsonResponse(upstreamStatus, JSON.stringify({ error: `bad key ${TEST_KEY}` })) }, async (_calls, logs) => {
      const res = await get({ query: { path: 'quote', symbol: 'AAPL' } });
      assert.equal(res.statusCode, expected, `upstream ${upstreamStatus}`);
      assert.equal(res.headers['cache-control'], 'no-store');
      assert.doesNotMatch(JSON.stringify(res.body), new RegExp(TEST_KEY));
      assert.doesNotMatch(logs.join('\n'), new RegExp(TEST_KEY));
    });
  }
});

test('successful responses carry endpoint-specific CDN caching', async () => {
  const cases: Array<[FakeRequest['query'], RegExp]> = [
    [{ path: 'quote', symbol: 'AAPL' }, /^s-maxage=15\b/],
    [{ path: 'stock/profile2', symbol: 'AAPL' }, /^s-maxage=86400\b/],
    [{ path: 'company-news', symbol: 'AAPL', from: '2026-11-06', to: '2026-11-13' }, /^s-maxage=300\b/],
    [{ path: 'news', category: 'general' }, /^s-maxage=300\b/],
  ];
  await withServer({ key: TEST_KEY, respond: () => jsonResponse(200, '[]') }, async calls => {
    for (const [query, policy] of cases) {
      const res = await get({ query });
      assert.equal(res.statusCode, 200);
      assert.match(res.headers['cache-control'], policy, String(query?.path));
      assert.equal(res.headers['content-type'], 'application/json; charset=utf-8');
    }
    assert.deepEqual(calls.map(call => call.url), [
      'https://finnhub.io/api/v1/quote?symbol=AAPL',
      'https://finnhub.io/api/v1/stock/profile2?symbol=AAPL',
      'https://finnhub.io/api/v1/company-news?symbol=AAPL&from=2026-11-06&to=2026-11-13',
      'https://finnhub.io/api/v1/news?category=general',
    ]);
  });
});

test('timeouts and non-JSON bodies become clear gateway errors', async () => {
  await withServer({ key: TEST_KEY }, async () => {
    const timeout = fetchFinnhub('quote', new URLSearchParams('symbol=AAPL'), TEST_KEY, (async () => {
      throw Object.assign(new Error('timed out'), { name: 'TimeoutError' });
    }) as unknown as typeof fetch);
    await assert.rejects(timeout, { status: 504, message: 'Finnhub did not respond in time' });

    const html = fetchFinnhub('quote', new URLSearchParams('symbol=AAPL'), TEST_KEY, (async () =>
      jsonResponse(200, '<html>oops</html>', 'text/html')) as unknown as typeof fetch);
    await assert.rejects(html, { status: 502, message: 'Finnhub returned an unexpected response' });
  });
});
