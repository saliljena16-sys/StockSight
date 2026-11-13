import { useEffect, useRef, useState } from 'react';
import type { AuthResult } from '../components/AuthModal';
import { supabase } from '../utils/supabase';
import { createGuestPortfolioState, loadPortfolioState, savePortfolioState, type PortfolioState } from '../utils/portfolioDb';
import { authRedirectUrl, describeAuthError } from '../utils/auth';
import { toPortfolioState } from '../utils/portfolioState';
import type {
  PortfolioAverageCosts,
  PortfolioCash,
  PortfolioQuantities,
  PortfolioTickers,
  PortfolioTransactions,
} from '../types/portfolio';

interface AuthSyncOptions {
  portfolios: PortfolioTickers;
  quantities: PortfolioQuantities;
  averageCosts: PortfolioAverageCosts;
  cash: PortfolioCash;
  transactions: PortfolioTransactions;
  applyPortfolioState: (state: PortfolioState) => void;
  onNotice: (message: string) => void;
}

/**
 * Supabase session plus portfolio persistence: loads the right portfolio state for the current
 * user (guest or signed in), re-loads it on auth changes, and saves every change for that owner.
 */
export function useAuthSync({ portfolios, quantities, averageCosts, cash, transactions, applyPortfolioState, onNotice }: AuthSyncOptions) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  // Whose state is currently loaded; saving is skipped until it matches the signed-in user.
  const persistenceOwnerRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    let isMounted = true;

    const hydrateSession = async () => {
      const currentUser = supabase ? (await supabase.auth.getSession()).data.session?.user ?? null : null;
      const nextUserId = currentUser?.id ?? null;
      const saved = await loadPortfolioState(nextUserId);
      if (!isMounted) return;

      persistenceOwnerRef.current = nextUserId;
      setUserId(nextUserId);
      setUserEmail(currentUser?.email ?? null);
      if (saved && Object.keys(saved.portfolios).length > 0) {
        applyPortfolioState(saved);
      }

      setIsHydrated(true);
    };

    hydrateSession();

    const { data: authListener } = supabase
      ? supabase.auth.onAuthStateChange((_event, session) => {
          const currentUser = session?.user ?? null;
          setUserId(currentUser?.id ?? null);
          setUserEmail(currentUser?.email ?? null);
          void hydrateSession();
        })
      : { data: { subscription: { unsubscribe: () => undefined } } };

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isHydrated || persistenceOwnerRef.current !== userId) return;
    void savePortfolioState(toPortfolioState({ portfolios, quantities, averageCosts, cash, transactions }), userId);
  }, [portfolios, quantities, averageCosts, cash, transactions, isHydrated, userId]);

  const signIn = async (mode: 'signin' | 'signup', email: string, password: string): Promise<AuthResult> => {
    if (!supabase) {
      return { error: 'Cloud sync is not configured for this deployment.' };
    }
    const { data, error } = mode === 'signin'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: authRedirectUrl(window.location.origin) } });
    if (error) {
      return { error: describeAuthError(error.message) };
    }
    if (mode === 'signup' && !data.session) {
      return { confirmationRequired: true };
    }
    setUserId(data.user?.id ?? null);
    setUserEmail(data.user?.email ?? null);
    onNotice('Portfolio sync is active.');
    return {};
  };

  const resendConfirmation = async (email: string): Promise<string | null> => {
    if (!supabase) return 'Cloud sync is not configured.';
    const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: authRedirectUrl(window.location.origin) } });
    return error?.message ?? null;
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    const guestState = createGuestPortfolioState();
    persistenceOwnerRef.current = null;
    setUserId(null);
    setUserEmail(null);
    applyPortfolioState(guestState);
    await savePortfolioState(guestState, null);
    onNotice('Signed out. Showing a fresh selection of popular stocks.');
  };

  return { userEmail, signIn, resendConfirmation, signOut };
}
