import { hasSupabaseConfig, supabase } from './supabase';

export type PortfolioMap = Record<string, string[]>;
export type HoldingMap = Record<string, Record<string, { quantity: number; averageCost: number }>>;

export interface PortfolioState {
  portfolios: PortfolioMap;
  holdings: HoldingMap;
  cash: Record<string, number>;
  transactions: Record<string, Array<{ id: string; ticker: string; type: 'buy' | 'sell'; quantity: number; price: number; date: string }>>;
}

export const DEFAULT_PORTFOLIOS: PortfolioMap = { 'My Watchlist': ['AAPL', 'MSFT', 'NVDA'] };
export const DEFAULT_PORTFOLIO_STATE: PortfolioState = {
  portfolios: DEFAULT_PORTFOLIOS,
  holdings: { 'My Watchlist': {} },
  cash: { 'My Watchlist': 0 },
  transactions: { 'My Watchlist': [] },
};

const DB_NAME = 'stocksight-db';
const STORE_NAME = 'portfolios';
const GUEST_RECORD_ID = 'guest-state-v3';
const POPULAR_TICKERS = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA', 'JPM', 'AMD', 'NFLX', 'WMT', 'JNJ'];

export function createGuestPortfolioState(): PortfolioState {
  const shuffled = [...POPULAR_TICKERS];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  const tickers = shuffled.slice(0, 4);
  return {
    portfolios: { 'Popular Picks': tickers },
    holdings: { 'Popular Picks': {} },
    cash: { 'Popular Picks': 0 },
    transactions: { 'Popular Picks': [] },
  };
}

function getLocalRecordId(userId?: string | null) {
  return userId ? `user-cache-${userId}` : GUEST_RECORD_ID;
}

function normalizeState(value: unknown): PortfolioState {
  if (!value || typeof value !== 'object') return DEFAULT_PORTFOLIO_STATE;
  const candidate = value as Partial<PortfolioState>;
  const portfolios = candidate.portfolios && typeof candidate.portfolios === 'object'
    ? candidate.portfolios
    : value as PortfolioMap;
  if (!Object.values(portfolios).every(Array.isArray)) return DEFAULT_PORTFOLIO_STATE;
  return {
    portfolios,
    holdings: candidate.holdings ?? Object.fromEntries(Object.keys(portfolios).map(name => [name, {}])),
    cash: candidate.cash ?? Object.fromEntries(Object.keys(portfolios).map(name => [name, 0])),
    transactions: candidate.transactions ?? Object.fromEntries(Object.keys(portfolios).map(name => [name, []])),
  };
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open portfolio database'));
  });
}

async function loadLocal(userId?: string | null): Promise<PortfolioState> {
  try {
    const db = await openDatabase();
    return await new Promise(resolve => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(getLocalRecordId(userId));
      request.onsuccess = () => resolve(request.result?.value ? normalizeState(request.result.value) : createGuestPortfolioState());
      request.onerror = () => resolve(createGuestPortfolioState());
    });
  } catch (error) {
    console.warn('Failed to load local portfolio state.', error);
    return createGuestPortfolioState();
  }
}

async function saveLocal(state: PortfolioState, userId?: string | null): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put({ id: getLocalRecordId(userId), value: state });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error('Failed to save portfolio state'));
    });
  } catch (error) {
    console.warn('Failed to save local portfolio state.', error);
  }
}

export async function loadPortfolioState(userId?: string | null): Promise<PortfolioState> {
  // Anonymous portfolios never leave the device.
  if (userId && hasSupabaseConfig && supabase) {
    try {
      const { data, error } = await supabase.from('portfolio_state').select('data').eq('id', `user-${userId}`).maybeSingle();
      if (!error && data?.data) return normalizeState(data.data);
      if (error) console.warn('Cloud portfolio fetch failed; using local state.', error);
    } catch (error) {
      console.warn('Cloud portfolio fetch failed; using local state.', error);
    }
  }
  return loadLocal(userId);
}

export async function savePortfolioState(state: PortfolioState, userId?: string | null): Promise<void> {
  await saveLocal(state, userId);
  if (!userId || !hasSupabaseConfig || !supabase) return;
  try {
    const { error } = await supabase.from('portfolio_state').upsert({ id: `user-${userId}`, data: state }, { onConflict: 'id' });
    if (error) console.warn('Cloud portfolio save failed; state remains saved locally.', error);
  } catch (error) {
    console.warn('Cloud portfolio save failed; state remains saved locally.', error);
  }
}
