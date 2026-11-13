/** User-facing message for a Supabase auth error. */
export function describeAuthError(message: string): string {
  return message.toLowerCase().includes('email not confirmed')
    ? 'Verify your email using the confirmation link before signing in.'
    : message;
}

/** Where Supabase confirmation emails send the user back to. */
export function authRedirectUrl(origin: string): string {
  return `${origin}/`;
}
