import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface HoldingModalProps {
  ticker: string | null;
  initialQuantity: number;
  initialAverageCost: number;
  onClose: () => void;
  onSave: (quantity: number, averageCost: number) => void;
}

export default function HoldingModal({ ticker, initialQuantity, initialAverageCost, onClose, onSave }: HoldingModalProps) {
  const [quantity, setQuantity] = useState(initialQuantity);
  const [averageCost, setAverageCost] = useState(initialAverageCost);
  useEffect(() => { setQuantity(initialQuantity); setAverageCost(initialAverageCost); }, [ticker, initialQuantity, initialAverageCost]);
  if (!ticker) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="holding-title">
      <form onSubmit={e => { e.preventDefault(); onSave(Math.max(0, quantity), Math.max(0, averageCost)); onClose(); }} className="w-full max-w-md rounded-[12px] border border-white/[.12] bg-[#101719] shadow-2xl">
        <div className="flex items-start justify-between border-b border-white/[.08] p-5"><div><h2 id="holding-title" className="text-lg font-semibold text-white">Edit {ticker} holding</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">Enter your shares and average purchase price.</p></div><button type="button" onClick={onClose} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-md text-[var(--text-secondary)] hover:bg-white/[.05]"><X className="h-5 w-5" /></button></div>
        <div className="grid gap-4 p-5 sm:grid-cols-2"><label className="text-xs text-[var(--text-secondary)]">Shares<input type="number" min="0" step="0.0001" value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="mt-2 h-11 w-full rounded-[7px] border border-white/[.12] bg-black/20 px-3 font-mono text-white outline-none focus:border-lime-300/50" /></label><label className="text-xs text-[var(--text-secondary)]">Average cost<input type="number" min="0" step="0.01" value={averageCost} onChange={e => setAverageCost(Number(e.target.value))} className="mt-2 h-11 w-full rounded-[7px] border border-white/[.12] bg-black/20 px-3 font-mono text-white outline-none focus:border-lime-300/50" /></label></div>
        <div className="flex justify-end gap-2 border-t border-white/[.08] p-5"><button type="button" onClick={onClose} className="h-10 rounded-[7px] border border-white/[.1] px-4 text-sm text-[var(--text-secondary)]">Cancel</button><button className="h-10 rounded-[7px] bg-lime-300 px-4 text-sm font-semibold text-[#10140f]">Save holding</button></div>
      </form>
    </div>
  );
}
