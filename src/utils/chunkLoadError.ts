// Messages browsers and Vite use when a lazily imported chunk can't be fetched — typically
// because a new deployment replaced the hashed asset files the open tab still refers to.
const CHUNK_ERROR_PATTERNS = [
  /Failed to fetch dynamically imported module/i, // Chromium
  /error loading dynamically imported module/i, // Firefox
  /Importing a module script failed/i, // Safari
  /Unable to preload CSS/i, // Vite's CSS preload helper
  /Loading (CSS )?chunk [\w-]+ failed/i, // webpack-style bundles
];

export function isChunkLoadError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const { name, message } = error as { name?: unknown; message?: unknown };
  if (name === 'ChunkLoadError') return true;
  return typeof message === 'string' && CHUNK_ERROR_PATTERNS.some(pattern => pattern.test(message));
}
