import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { isChunkLoadError } from '../utils/chunkLoadError';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** "page" fills the viewport (root boundary); "panel" replaces just one section. */
  variant?: 'page' | 'panel';
  /** When this value changes, a non-chunk error is cleared so the panel can render again. */
  resetKey?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render errors so the app never collapses to a blank page.
 *
 * A failed lazy import (usually a stale tab after a new deployment) can only be fixed by loading
 * the current index.html, because React.lazy caches the rejected import — so that case offers
 * "Reload". Other errors also offer "Try again" for panels.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('StockSight UI error', error, info.componentStack);
  }

  componentDidUpdate(previous: ErrorBoundaryProps) {
    const { error } = this.state;
    if (error && previous.resetKey !== this.props.resetKey && !isChunkLoadError(error)) {
      this.setState({ error: null });
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const chunkError = isChunkLoadError(error);
    const isPage = this.props.variant === 'page';
    const title = chunkError
      ? (isPage ? 'StockSight needs to reload' : "This section didn't load")
      : 'Something went wrong';
    const message = chunkError
      ? 'A newer version of StockSight may have been deployed, or the connection dropped while loading. Reload to get the latest version. Your portfolios are saved.'
      : isPage
        ? 'An unexpected error stopped the page from rendering. Reloading usually fixes it. Your portfolios are saved.'
        : 'An unexpected error stopped this section from rendering. The rest of StockSight still works.';

    return (
      <div
        role="alert"
        className={`flex flex-col items-center justify-center gap-3 px-6 text-center ${
          isPage ? 'min-h-screen bg-[var(--canvas)]' : 'min-h-[360px] rounded-[8px] border border-dashed border-white/[.12] bg-[var(--surface-1)] py-10'
        }`}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-300/25 bg-amber-300/[.06]">
          <AlertTriangle className="h-4 w-4 text-[var(--warning)]" aria-hidden="true" />
        </span>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="max-w-md text-[13px] leading-6 text-[var(--text-secondary)]">{message}</p>
        <div className="mt-1 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-lime-300 px-4 text-sm font-semibold text-[#10140f] hover:bg-lime-200"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Reload
          </button>
          {!chunkError && !isPage && (
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="h-10 rounded-[8px] border border-white/[.12] px-4 text-sm text-white hover:bg-white/[.05]"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    );
  }
}
