interface NoticeBannerProps {
  message: string;
  onDismiss: () => void;
}

/** Dismissible confirmation shown at the top of the main content. */
export default function NoticeBanner({ message, onDismiss }: NoticeBannerProps) {
  return <div role="status" className="mb-5 flex items-center justify-between rounded-[8px] border border-lime-300/20 bg-lime-300/[.06] px-4 py-3 text-sm text-lime-100"><span>{message}</span><button onClick={onDismiss} className="text-xs text-lime-200/70 hover:text-white">Dismiss</button></div>;
}
