# StockSight - Configuration Guide

## Data Sources

StockSight attempts to fetch real-time stock data from multiple sources in this order:

1. **Alpha Vantage** (Primary)
   - Free tier: 25 requests/day
   - Demo key: Works for limited symbols (IBM, etc.)
   - Get your free API key: https://www.alphavantage.co/support/#api-key

2. **Yahoo Finance** (via CORS proxy)
   - No API key required
   - Uses CORS proxies (may be unreliable)
   - Fallback if Alpha Vantage fails

3. **Finnhub** (Fallback)
   - Free tier: 60 API calls/minute
   - Demo key: Limited functionality
   - Get your free API key: https://finnhub.io/register

## Why You Might See "Demo Mode"

If you see "DEMO MODE" instead of "LIVE" data, it means:

- All API sources failed to respond
- CORS proxies are blocking requests
- API rate limits were exceeded
- Network connectivity issues

## How to Enable Real Data

### Option 1: Use Real API Keys (Recommended)

Edit `src/utils/mockData.ts` and replace the demo keys:

```typescript
// Line 28
const ALPHA_VANTAGE_KEY = 'YOUR_REAL_KEY_HERE';

// Line 128
const FINNHUB_KEY = 'YOUR_REAL_KEY_HERE';
```

### Option 2: Deploy with Backend Proxy

For production use, create a backend proxy to avoid CORS issues:

```javascript
// Example: Node.js/Express proxy
app.get('/api/stock/:symbol', async (req, res) => {
  const response = await fetch(
    `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${req.params.symbol}&apikey=${process.env.ALPHA_VANTAGE_KEY}`
  );
  const data = await response.json();
  res.json(data);
});
```

Then update the fetch URLs in `mockData.ts` to use your backend.

### Option 3: Use a Different CORS Proxy

Replace the CORS proxies in `mockData.ts`:

```typescript
const proxies = [
  (url) => `https://your-cors-proxy.com/?url=${encodeURIComponent(url)}`,
  // Add more proxies as fallbacks
];
```

## API Rate Limits

| Service | Free Tier | Limit |
|---------|-----------|-------|
| Alpha Vantage | 25 requests/day | Demo key very limited |
| Finnhub | 60 calls/minute | Demo key restricted |
| Yahoo Finance | Unlimited | Via CORS proxy (unreliable) |

## Production Recommendations

For a production application:

1. **Use a backend server** to proxy API requests
2. **Implement caching** to reduce API calls
3. **Use paid API tiers** for higher rate limits
4. **Add error handling** for API failures
5. **Consider WebSocket** for real-time updates (Finnhub supports this)

## Current Status

The app is configured to:
- ✅ Attempt real API calls on load
- ✅ Fall back to realistic mock data if APIs fail
- ✅ Clearly indicate whether data is live or demo
- ✅ Show which data source is being used
- ✅ Refresh every 60 seconds for live data

## Troubleshooting

**"I always see Demo Mode"**
- Check browser console for API errors
- Verify API keys are valid (if using real keys)
- Try a different browser or disable ad blockers
- Check if CORS proxies are accessible from your network

**"Data seems wrong"**
- If you see "LIVE" badge, data is from real APIs
- If you see "DEMO MODE", data is simulated
- Mock data uses realistic patterns but not actual prices

**"How do I know if data is real?"**
- Look for the green "LIVE" badge on stock cards
- Check the header indicator
- Hover over a stock to see the data source
