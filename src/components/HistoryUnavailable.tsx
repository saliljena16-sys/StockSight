import { LineChart } from 'lucide-react';

interface HistoryUnavailableProps {
  title?: string;
  message: string;
  reason?: string;
  className?: string;
}

/** Empty state shown in place of a chart when daily price history could not be loaded. */
export default function HistoryUnavailable({
  title = 'Price history unavailable',
  message,
  reason,
  className = 'min-h-[360px]',
}: HistoryUnavailableProps) {
  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center gap-3 rounded-[8px] border border-dashed border-white/[.12] bg-[var(--surface-1)] px-6 py-10 text-center ${className}`}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[.1] bg-white/[.03]">
        <LineChart className="h-4 w-4 text-[var(--text-tertiary)]" aria-hidden="true" />
      </span>
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="max-w-md text-[13px] leading-6 text-[var(--text-secondary)]">{message}</p>
      {reason && (
        <p className="max-w-md font-mono text-[11px] text-[var(--text-tertiary)]">{reason}</p>
      )}
    </div>
  );
}
