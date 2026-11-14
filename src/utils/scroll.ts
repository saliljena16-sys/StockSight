/** Scrolls the page to the top: smoothly, or instantly when the user prefers reduced motion. */
export function scrollToTop() {
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
}
