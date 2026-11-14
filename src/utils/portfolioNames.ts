// Portfolio names are compared case-insensitively after trimming, so "Core" and "core " clash.
const comparable = (name: string) => name.trim().toLowerCase();

/** The existing portfolio that `name` would clash with, ignoring `currentName` (the one being renamed). */
export function findPortfolioNameConflict(name: string, existingNames: string[], currentName?: string): string | undefined {
  const wanted = comparable(name);
  return existingNames.find(existing => existing !== currentName && comparable(existing) === wanted);
}

/** A user-facing reason `name` can't be used, or null when it is free. */
export function portfolioNameError(name: string, existingNames: string[], currentName?: string): string | null {
  const conflict = findPortfolioNameConflict(name, existingNames, currentName);
  return conflict === undefined ? null : `A portfolio named "${conflict}" already exists. Choose a different name.`;
}

/** "Portfolio N" for the first N (from count + 1) that isn't taken. */
export function suggestPortfolioName(existingNames: string[]): string {
  let index = existingNames.length + 1;
  while (findPortfolioNameConflict(`Portfolio ${index}`, existingNames)) index += 1;
  return `Portfolio ${index}`;
}

interface AskForPortfolioNameOptions {
  /** Shows a prompt and returns the answer, or null when cancelled (window.prompt in the app). */
  ask: (message: string, defaultValue: string) => string | null;
  message: string;
  defaultValue: string;
  existingNames: string[];
  /** Set when renaming: that portfolio's own name is allowed, and keeping it means "no change". */
  currentName?: string;
}

/**
 * Prompts for a portfolio name until it is free or the user cancels. A clashing name is never
 * returned: the prompt is shown again with the reason, prefilled with what was typed.
 * Returns the trimmed name, or null for cancel / blank / unchanged rename.
 */
export function askForPortfolioName({ ask, message, defaultValue, existingNames, currentName }: AskForPortfolioNameOptions): string | null {
  let promptMessage = message;
  let promptValue = defaultValue;
  for (;;) {
    const answer = ask(promptMessage, promptValue);
    if (!answer || !answer.trim()) return null;
    const cleaned = answer.trim();
    if (currentName !== undefined && cleaned === currentName) return null;
    const error = portfolioNameError(cleaned, existingNames, currentName);
    if (!error) return cleaned;
    promptMessage = error;
    promptValue = cleaned;
  }
}
