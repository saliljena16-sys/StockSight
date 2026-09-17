// Stock data fetching utilities
export interface StockDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockInfo {
  ticker: string;
  name: string;
  sector: string;
  currentPrice: number;
  previousClose: number;
  historicalData: StockDataPoint[];
  lastUpdated: string;
  isLiveData: boolean;
  dataSource: string;
}

// Mock data generator for demo purposes
function generateMockData(ticker: string, days: number = 365): StockDataPoint[] {
  const data: StockDataPoint[] = [];
  const basePrice = 100 + Math.random() * 200;
  let price = basePrice;
  
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    const change = (Math.random() - 0.5) * 0.04;
    price = price * (1 + change);
    
    const open = price * (1 + (Math.random() - 0.5) * 0.02);
    const close = price;
    const high = Math.max(open, close) * (1 + Math.random() * 0.02);
    const low = Math.min(open, close) * (1 - Math.random() * 0.02);
    const volume = Math.floor(1000000 + Math.random() * 10000000);
    
    data.push({
      date: date.toISOString().split('T')[0],
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume
    });
  }
  
  return data;
}

export async function getStockInfo(ticker: string): Promise<StockInfo> {
  const t = ticker.toUpperCase();
  
  // Try to fetch real data from Alpha Vantage (demo key has limited functionality)
  try {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${t}&apikey=demo&outputsize=full`;
    const response = await fetch(url);
    
    if (response.ok) {
      const json = await response.json();
      const timeSeries = json['Time Series (Daily)'];
      
      if (timeSeries) {
        const data: StockDataPoint[] = [];
        const dates = Object.keys(timeSeries).sort().reverse().slice(0, 365);
        
        for (const date of dates) {
          const d = timeSeries[date];
          data.push({
            date,
            open: parseFloat(d['1. open']),
            high: parseFloat(d['2. high']),
            low: parseFloat(d['3. low']),
            close: parseFloat(d['4. close']),
            volume: parseInt(d['5. volume'])
          });
        }
        
        if (data.length > 50) {
          const currentPrice = data[0].close;
          const previousClose = data[1]?.close || currentPrice;
          
          return {
            ticker: t,
            name: t,
            sector: 'Unknown',
            currentPrice,
            previousClose,
            historicalData: data.reverse(),
            lastUpdated: new Date().toISOString(),
            isLiveData: true,
            dataSource: 'Alpha Vantage'
          };
        }
      }
    }
  } catch (e) {
    console.warn('Failed to fetch live data, using mock data');
  }
  
  // Fallback to mock data
  const data = generateMockData(t);
  const currentPrice = data[data.length - 1].close;
  const previousClose = data[data.length - 2]?.close || currentPrice;
  
  return {
    ticker: t,
    name: t,
    sector: 'Unknown',
    currentPrice,
    previousClose,
    historicalData: data,
    lastUpdated: new Date().toISOString(),
    isLiveData: false,
    dataSource: 'Demo Data'
  };
}

export const STARTER_STOCKS = ['AAPL', 'MSFT', 'NVDA'];

export function getAllAvailableTickers(): string[] {
  return ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA', 'JPM'];
}

export function simulatePriceUpdate(stock: StockInfo): StockInfo {
  const change = (Math.random() - 0.5) * (stock.isLiveData ? 0.001 : 0.002);
  return {
    ...stock,
    currentPrice: Math.round(stock.currentPrice * (1 + change) * 100) / 100
  };
}
