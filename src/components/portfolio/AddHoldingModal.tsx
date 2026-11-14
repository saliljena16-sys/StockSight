import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { formatShares } from '../../utils/format';
import Modal from '../ui/Modal';

/** A stock already in the active portfolio. */
export interface WatchedStock {
  ticker: string;
  /** Shares held (0 when it is only watched). */
  quantity: number;
  averageCost?: number;
  /** Live price, when the quote has loaded. */
  price?: number;
}

interface AddHoldingModalProps {
  isOpen: boolean;
  onClose: () => void;
  watchlist: WatchedStock[];
  /** Saves shares and an average cost for a ticker, adding it to the watchlist if needed. */
  onSaveHolding: (ticker: string, quantity: number, averageCost: number) => void;
  /** Adds a ticker to the watchlist without any shares. */
  onWatch: (ticker: string) => void;
}

const POPULAR_STOCKS = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA', 'AMD', 'NFLX', 'JPM', 'V', 'JNJ', 'WMT', 'PG', 'MA', 'DIS', 'BAC', 'INTC', 'CRM', 'PYPL'];
const TICKER_PATTERN = /^[A-Z][A-Z.-]{0,5}$/;

/**
 * Add a holding in one dialog: pick or type a symbol, enter shares and what you paid.
 * Leaving shares empty just adds the stock to the watchlist.
 */
export default function AddHoldingModal({ isOpen, onClose, watchlist, onSaveHolding, onWatch }: AddHoldingModalProps) {
  const [symbol, setSymbol] = useState('');
  const [shares, setShares] = useState('');
  const [cost, setCost] = useState('');
  const sharesRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSymbol('');
      setShares('');
      setCost('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isValidTicker = TICKER_PATTERN.test(symbol);
  const existing = watchlist.find(item => item.ticker === symbol);
  const quantity = Math.max(0, Number(shares) || 0);
  const addingShares = quantity > 0;
  // With the cost left blank, fall back to what is already known: the saved cost, else the live price.
  const fallbackCost = existing?.averageCost ?? existing?.price;
  const enteredCost = cost.trim() === '' ? undefined : Math.max(0, Number(cost) || 0);
  const averageCost = enteredCost ?? fallbackCost;

  const needsCost = addingShares && averageCost === undefined;
  const alreadyWatched = !addingShares && Boolean(existing);
  const canSubmit = isValidTicker && !needsCost && !alreadyWatched;

  const watchedWithoutShares = watchlist.filter(item => item.quantity <= 0).map(item => item.ticker);
  const popular = POPULAR_STOCKS.filter(ticker => !watchlist.some(item => item.ticker === ticker)).slice(0, 8);

  const pick = (ticker: string) => {
    setSymbol(ticker);
    sharesRef.current?.focus();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    if (addingShares && averageCost !== undefined) onSaveHolding(symbol, quantity, averageCost);
    else onWatch(symbol);
    onClose();
  };

  const chips = (label: string, tickers: string[]) => tickers.length > 0 && (
    <div>
      <p className="eyebrow mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {tickers.map(ticker => (
          <button
            key={ticker}
            type="button"
            aria-pressed={symbol === ticker}
            onClick={() => pick(ticker)}
            className="seg border-line aria-pressed:border-accent"
          >
            {ticker}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Modal titleId="add-holding-title" title="Add holding" description="Pick or type a US ticker. Leave shares empty to just watch it." onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <div className="space-y-5 p-5">
          <div>
            <label htmlFor="add-holding-symbol" className="eyebrow mb-2 block">Symbol</label>
            <input
              id="add-holding-symbol"
              type="text"
              value={symbol}
              onChange={event => setSymbol(event.target.value.toUpperCase().trim())}
              placeholder="e.g. AAPL"
              autoFocus
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              aria-invalid={symbol.length > 0 && !isValidTicker}
              aria-describedby="add-holding-symbol-hint"
              className="field num uppercase placeholder:normal-case"
            />
            <p id="add-holding-symbol-hint" role={symbol.length > 0 && !isValidTicker ? 'alert' : undefined} className={`mt-2 text-xs leading-5 ${symbol.length > 0 && !isValidTicker ? 'text-warn' : 'text-ink-dim'}`}>
              {symbol.length > 0 && !isValidTicker
                ? 'Use a valid 1–6 character US ticker symbol.'
                : existing && existing.quantity > 0
                  ? `You hold ${formatShares(existing.quantity)} ${existing.quantity === 1 ? 'share' : 'shares'} of ${symbol}. Saving replaces that position.`
                  : existing
                    ? `${symbol} is on your watchlist. Enter shares to add it to your holdings.`
                    : 'Live quote when available, with a clearly labelled demo fallback.'}
            </p>
          </div>

          {chips('On your watchlist', watchedWithoutShares)}
          {chips('Popular', popular)}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="add-holding-shares" className="eyebrow mb-2 block">Shares</label>
              <input
                id="add-holding-shares"
                ref={sharesRef}
                type="number"
                inputMode="decimal"
                min="0"
                step="0.0001"
                value={shares}
                onChange={event => setShares(event.target.value)}
                placeholder="0"
                className="field num"
              />
            </div>
            <div>
              <label htmlFor="add-holding-cost" className="eyebrow mb-2 block">Average cost</label>
              <div className="relative">
                <span className="num pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-dim" aria-hidden="true">$</span>
                <input
                  id="add-holding-cost"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={cost}
                  onChange={event => setCost(event.target.value)}
                  placeholder={fallbackCost !== undefined ? fallbackCost.toFixed(2) : '0.00'}
                  aria-describedby="add-holding-cost-hint"
                  aria-invalid={needsCost}
                  className="field num pl-7"
                />
              </div>
            </div>
            <p id="add-holding-cost-hint" role={needsCost ? 'alert' : undefined} className={`col-span-2 -mt-1 text-xs leading-5 ${needsCost ? 'text-warn' : 'text-ink-dim'}`}>
              {needsCost
                ? 'Enter what you paid per share. It is used for your total return.'
                : fallbackCost !== undefined
                  ? `Per share. Leave blank to use ${existing?.averageCost !== undefined ? 'your saved cost' : 'the live price'} ($${fallbackCost.toFixed(2)}).`
                  : 'What you paid per share. It is used for your total return.'}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-line p-5">
          <button type="button" onClick={onClose} className="btn btn-quiet">Cancel</button>
          <button type="submit" disabled={!canSubmit} className="btn btn-primary">
            <Plus className="h-4 w-4" aria-hidden="true" />
            {addingShares ? 'Add holding' : 'Add to watchlist'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
