import { useEffect, useState } from 'react';
import CompanyMark from './CompanyMark';
import Modal from './ui/Modal';

interface HoldingModalProps {
  ticker: string | null;
  initialQuantity: number;
  initialAverageCost: number;
  onClose: () => void;
  onSave: (quantity: number, averageCost: number) => void;
}

/** Edit the shares and average cost of one stock (or enter them for a stock that is only watched). */
export default function HoldingModal({ ticker, initialQuantity, initialAverageCost, onClose, onSave }: HoldingModalProps) {
  const [quantity, setQuantity] = useState(initialQuantity);
  const [averageCost, setAverageCost] = useState(initialAverageCost);
  useEffect(() => { setQuantity(initialQuantity); setAverageCost(initialAverageCost); }, [ticker, initialQuantity, initialAverageCost]);
  if (!ticker) return null;

  return (
    <Modal
      titleId="holding-title"
      title={<span className="flex items-center gap-2.5"><CompanyMark ticker={ticker} size={26} />{initialQuantity > 0 ? `Edit ${ticker} holding` : `Add ${ticker} shares`}</span>}
      description="Enter your shares and average purchase price."
      onClose={onClose}
    >
      <form onSubmit={event => { event.preventDefault(); onSave(Math.max(0, quantity), Math.max(0, averageCost)); onClose(); }}>
        <div className="grid grid-cols-2 gap-3 p-5">
          <label className="eyebrow block">
            Shares
            <input type="number" inputMode="decimal" min="0" step="0.0001" value={quantity} onChange={event => setQuantity(Number(event.target.value))} autoFocus className="field num mt-2 normal-case tracking-normal" />
          </label>
          <label className="eyebrow block">
            Average cost
            <input type="number" inputMode="decimal" min="0" step="0.01" value={averageCost} onChange={event => setAverageCost(Number(event.target.value))} className="field num mt-2 normal-case tracking-normal" />
          </label>
          <p className="col-span-2 text-xs leading-5 text-ink-dim">Setting shares to 0 keeps {ticker} on your watchlist.</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-line p-5">
          <button type="button" onClick={onClose} className="btn btn-quiet">Cancel</button>
          <button type="submit" className="btn btn-primary">Save holding</button>
        </div>
      </form>
    </Modal>
  );
}
