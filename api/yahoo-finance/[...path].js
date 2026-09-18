const YAHOO_ORIGIN = 'https://query1.finance.yahoo.com';

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const pathParts = Array.isArray(request.query.path)
    ? request.query.path
    : [request.query.path].filter(Boolean);

  if (pathParts.length === 0 || pathParts.some(part => !/^[A-Za-z0-9._-]+$/.test(part))) {
    return response.status(400).json({ error: 'Invalid Yahoo Finance path' });
  }

  const upstreamUrl = new URL(`/${pathParts.map(encodeURIComponent).join('/')}`, YAHOO_ORIGIN);
  Object.entries(request.query).forEach(([key, value]) => {
    if (key === 'path') return;
    const values = Array.isArray(value) ? value : [value];
    values.filter(item => item !== undefined).forEach(item => upstreamUrl.searchParams.append(key, String(item)));
  });

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: {
        accept: 'application/json',
        'user-agent': 'StockSight/1.0',
      },
    });
    const body = await upstream.text();
    response.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/json');
    response.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
    return response.status(upstream.status).send(body);
  } catch (error) {
    console.error('Yahoo Finance proxy failed', error);
    return response.status(502).json({ error: 'Market history is temporarily unavailable' });
  }
}
