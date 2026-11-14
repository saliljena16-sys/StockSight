interface NoticeBannerProps {
  message: string;
  onDismiss: () => void;
}

/**
 * Dismissible confirmation ("AAPL holding updated."). Floats above the page so it never pushes
 * the portfolio down, and sits clear of the phone tab bar.
 */
export default function NoticeBanner({ message, onDismiss }: NoticeBannerProps) {
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-full border border-line-strong bg-raised py-1.5 pl-5 pr-1.5 text-sm text-ink shadow-[0_18px_50px_rgb(0_0_0/0.55)] md:bottom-6"
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
        <span className="truncate">{message}</span>
      </span>
      <button type="button" onClick={onDismiss} className="btn btn-quiet btn-sm shrink-0">Dismiss</button>
    </div>
  );
}
