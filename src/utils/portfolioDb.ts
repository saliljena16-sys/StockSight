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
const RECORD_ID = 'app-state-v2';

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

async function loadLocal(): Promise<PortfolioState> {
  try {
    const db = await openDatabase();
    return await new Promise(resolve => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(RECORD_ID);
      request.onsuccess = () => resolve(normalizeState(request.result?.value));
      request.onerror = () => resolve(DEFAULT_PORTFOLIO_STATE);
    });
  } catch (error) {
    console.warn('Failed to load local portfolio state.', error);
    return DEFAULT_PORTFOLIO_STATE;
  }
}

async function saveLocal(state: PortfolioState): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put({ id: RECORD_ID, value: state });
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
  return loadLocal();
}

export async function savePortfolioState(state: PortfolioState, userId?: string | null): Promise<void> {
  await saveLocal(state);
  if (!userId || !hasSupabaseConfig || !supabase) return;
  try {
    const { error } = await supabase.from('portfolio_state').upsert({ id: `user-${userId}`, data: state }, { onConflict: 'id' });
    if (error) console.warn('Cloud portfolio save failed; state remains saved locally.', error);
  } catch (error) {
    console.warn('Cloud portfolio save failed; state remains saved locally.', error);
  }
}
