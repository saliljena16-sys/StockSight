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
  className = 'min-h-[18rem]',
}: HistoryUnavailableProps) {
  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center gap-2.5 rounded-control border border-dashed border-line-strong px-6 py-6 text-center ${className}`}
    >
      <span className="mb-1 grid h-10 w-10 place-items-center rounded-full border border-line">
        <LineChart className="h-4 w-4 text-ink-dim" aria-hidden="true" />
      </span>
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="max-w-md text-balance text-[13px] leading-6 text-ink-muted">{message}</p>
      {reason && (
        <p className="num max-w-md text-[11px] leading-4 text-ink-dim">{reason}</p>
      )}
    </div>
  );
}
