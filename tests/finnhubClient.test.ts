// The browser side of the Finnhub proxy: every request goes to the same-origin /api/finnhub
// route without a key, and a 503 from the proxy (no server key) leaves the app in its demo state.
// Modules that use extensionless imports are loaded through Vite's SSR loader, as in
// components.test.ts; they share one module instance, so the 503 memo is shared too.
import test, { after, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer, type ViteDevServer } from 'vite';

type FinnhubModule = typeof import('../src/utils/finnhub.ts');
type StockInfo = { isLiveData: boolean; dataSource: string; currentPrice: number; sector: string; hasRealHistory: boolean };

let vite: ViteDevServer;
let finnhub: FinnhubModule;

before(async () => {
  vite = await createServer({
    configFile: false,
    root: process.cwd(),
    logLevel: 'error',
    appType: 'custom',
    esbuild: { jsx: 'automatic' },
    server: { middlewareMode: true, hmr: false, ws: false },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  finnhub = await vite.ssrLoadModule('/src/utils/finnhub.ts') as FinnhubModule;
});

after(async () => {
  await vite?.close();
});

beforeEach(() => finnhub.resetFinnhubAvailability());

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const KEY_MISSING = { error: 'Live market data is not configured: FINNHUB_API_KEY is not set on the server', code: 'FINNHUB_KEY_MISSING' };

/** Installs a fake global fetch (and quiets console.warn) for the duration of `run`. */
async function withFetch<T>(respond: (url: string) => Response, run: (calls: string[], warnings: unknown[][]) => Promise<T>) {
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  const calls: string[] = [];
  const warnings: unknown[][] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    calls.push(String(input));
    return respond(String(input));
  }) as typeof fetch;
  console.warn = (...args: unknown[]) => { warnings.push(args); };
  try {
    return await run(calls, warnings);
  } finally {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
  }
}

test('requests go to the same-origin proxy with no key or token', () => {
  assert.equal(finnhub.finnhubUrl('quote', { symbol: 'AAPL' }), '/api/finnhub/quote?symbol=AAPL');
  assert.equal(finnhub.finnhubUrl('stock/profile2', { symbol: 'BRK.B' }), '/api/finnhub/stock/profile2?symbol=BRK.B');
  assert.equal(
    finnhub.finnhubUrl('company-news', { symbol: 'AAPL', from: '2026-11-06', to: '2026-11-13' }),
    '/api/finnhub/company-news?symbol=AAPL&from=2026-11-06&to=2026-11-13',
  );
  assert.equal(finnhub.finnhubUrl('news', { category: 'general' }), '/api/finnhub/news?category=general');
});

test('a 503 means "no key": it rejects as unavailable and later calls skip the network', async () => {
  await withFetch(() => json(503, KEY_MISSING), async calls => {
    await assert.rejects(finnhub.fetchFinnhub('quote', { symbol: 'AAPL' }), finnhub.FinnhubUnavailableError);
    assert.equal(finnhub.isFinnhubKnownUnavailable(), true);
    await assert.rejects(finnhub.fetchFinnhub('news', { category: 'general' }), error => finnhub.isFinnhubUnavailable(error));
    assert.deepEqual(calls, ['/api/finnhub/quote?symbol=AAPL']);
  });
});

test('other failures are ordinary errors and do not switch off live data', async () => {
  await withFetch(() => json(429, { error: 'Finnhub is rate-limiting requests (HTTP 429)' }), async () => {
    await assert.rejects(finnhub.fetchFinnhub('quote', { symbol: 'AAPL' }), error =>
      error instanceof Error && !finnhub.isFinnhubUnavailable(error) && /HTTP 429/.test(error.message));
    assert.equal(finnhub.isFinnhubKnownUnavailable(), false);
  });
});

test('without a server key, quotes fall back to the labelled demo series quietly', async () => {
  const { getStockInfo } = await vite.ssrLoadModule('/src/utils/mockData.ts');
  await withFetch(() => json(503, KEY_MISSING), async (calls, warnings) => {
    const info = await getStockInfo('aapl') as StockInfo;
    assert.equal(info.isLiveData, false);
    assert.equal(info.dataSource, 'Demo Data');
    assert.equal(info.hasRealHistory, false);
    assert.equal(info.sector, 'Technology'); // the built-in sector map, as before
    assert.ok(info.currentPrice > 0);

    const again = await getStockInfo('MSFT') as StockInfo;
    assert.equal(again.dataSource, 'Demo Data');

    // One request to learn there is no key; nothing after it, and no Yahoo or profile calls.
    assert.deepEqual(calls, ['/api/finnhub/quote?symbol=AAPL']);
    assert.deepEqual(warnings, []);
  });
});

test('with a server key, quotes and profiles come through the proxy unchanged', async () => {
  const { getStockInfo } = await vite.ssrLoadModule('/src/utils/mockData.ts');
  await withFetch(url => {
    if (url.startsWith('/api/finnhub/quote')) return json(200, { c: 101.5, pc: 100 });
    if (url.startsWith('/api/finnhub/stock/profile2')) return json(200, { finnhubIndustry: 'Semiconductors', shareOutstanding: 2 });
    return json(404, { error: 'No data found, symbol may be delisted' }); // Yahoo history
  }, async calls => {
    const info = await getStockInfo('zzzq') as StockInfo & { previousClose: number; sharesOutstanding?: number };
    assert.equal(info.isLiveData, true);
    assert.equal(info.currentPrice, 101.5);
    assert.equal(info.previousClose, 100);
    assert.equal(info.sector, 'Semiconductors');
    assert.equal(info.sharesOutstanding, 2_000_000);
    assert.equal(info.dataSource, 'Finnhub (live quote; history unavailable)');
    assert.ok(calls.every(url => !url.includes('finnhub.io') && !/token/i.test(url)), calls.join('\n'));
  });
});

test('the market news desk shows the no-key state at once after a 503', async () => {
  await withFetch(() => json(503, KEY_MISSING), async () => {
    await assert.rejects(finnhub.fetchFinnhub('quote', { symbol: 'AAPL' }));
  });
  const module = await vite.ssrLoadModule('/src/components/PrimaryWorkspace.tsx');
  const html = renderToStaticMarkup(createElement(module.default as ComponentType<Record<string, unknown>>, { view: 'news' }));
  assert.match(html, /Market news needs a live data key/);
  assert.match(html, /FINNHUB_API_KEY/);
  assert.doesNotMatch(html, /VITE_FINNHUB_API_KEY/);
  assert.doesNotMatch(html, /aria-busy="true"/);
});
