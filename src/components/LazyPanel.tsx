import { Suspense, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import ErrorBoundary from './ErrorBoundary';

const PanelFallback = () => <div className="flex min-h-[420px] items-center justify-center text-sm text-[var(--text-secondary)]"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading workspace…</div>;

/** Lazy panels get their own boundary, so a failed chunk replaces one section, not the whole page. */
const LazyPanel = ({ children, resetKey }: { children: ReactNode; resetKey?: string }) => (
  <ErrorBoundary variant="panel" resetKey={resetKey}>
    <Suspense fallback={<PanelFallback />}>{children}</Suspense>
  </ErrorBoundary>
);

export default LazyPanel;
