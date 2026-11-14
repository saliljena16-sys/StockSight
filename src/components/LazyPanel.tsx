import { Suspense, type ReactNode } from 'react';
import ErrorBoundary from './ErrorBoundary';

/** Placeholder shown while a lazy panel's code loads: a row of controls and a block, like the panel itself. */
const PanelFallback = () => (
  <div role="status" aria-label="Loading" className="space-y-3">
    <div className="skeleton h-8 w-64 max-w-full" />
    <div className="skeleton h-[17rem] w-full" />
  </div>
);

/** Lazy panels get their own boundary, so a failed chunk replaces one section, not the whole page. */
const LazyPanel = ({ children, resetKey }: { children: ReactNode; resetKey?: string }) => (
  <ErrorBoundary variant="panel" resetKey={resetKey}>
    <Suspense fallback={<PanelFallback />}>{children}</Suspense>
  </ErrorBoundary>
);

export default LazyPanel;
