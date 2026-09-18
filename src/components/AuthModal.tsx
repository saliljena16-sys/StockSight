import { useState } from 'react';
import { Loader2, X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (mode: 'signin' | 'signup', email: string, password: string) => Promise<AuthResult>;
  onResend: (email: string) => Promise<string | null>;
}

export interface AuthResult {
  error?: string;
  confirmationRequired?: boolean;
}

export default function AuthModal({ isOpen, onClose, onSubmit, onResend }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [confirmationEmail, setConfirmationEmail] = useState('');
  const [resendMessage, setResendMessage] = useState('');
  const [loading, setLoading] = useState(false);
  if (!isOpen) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.includes('@') || password.length < 6) {
      setError('Enter a valid email and a password with at least 6 characters.');
      return;
    }
    setLoading(true);
    setError('');
    const result = await onSubmit(mode, email.trim(), password);
    setLoading(false);
    if (result.error) setError(result.error);
    else if (result.confirmationRequired) setConfirmationEmail(email.trim());
    else onClose();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <form onSubmit={submit} className="w-full max-w-md rounded-[12px] border border-white/[.12] bg-[#101719] shadow-2xl">
        <div className="flex items-start justify-between border-b border-white/[.08] p-5">
          <div><h2 id="auth-title" className="text-lg font-semibold text-white">{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">Sync portfolios securely across devices.</p></div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-md text-[var(--text-secondary)] hover:bg-white/[.05] hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        {confirmationEmail ? (
          <div className="space-y-4 p-5">
            <div className="rounded-[8px] border border-lime-300/20 bg-lime-300/[.06] p-4">
              <p className="text-sm font-semibold text-lime-100">Check your email</p>
              <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">We sent a verification link to <strong className="text-white">{confirmationEmail}</strong>. Open that link before signing in.</p>
            </div>
            {resendMessage && <p role="status" className="text-xs text-[var(--text-secondary)]">{resendMessage}</p>}
            <button type="button" disabled={loading} onClick={async () => { setLoading(true); setResendMessage(''); const message = await onResend(confirmationEmail); setLoading(false); setResendMessage(message ?? 'A new verification email was sent.'); }} className="h-11 w-full rounded-[7px] border border-white/[.12] text-sm font-medium text-white hover:bg-white/[.05] disabled:opacity-60">Resend verification email</button>
            <button type="button" onClick={() => { setConfirmationEmail(''); setMode('signin'); setError(''); }} className="w-full text-xs text-[var(--text-secondary)] hover:text-white">I verified my email — sign in</button>
          </div>
        ) : <div className="space-y-4 p-5">
          <label className="block text-xs font-medium text-[var(--text-secondary)]">Email<input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-2 h-11 w-full rounded-[7px] border border-white/[.12] bg-black/20 px-3 text-sm text-white outline-none focus:border-lime-300/50" /></label>
          <label className="block text-xs font-medium text-[var(--text-secondary)]">Password<input type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} className="mt-2 h-11 w-full rounded-[7px] border border-white/[.12] bg-black/20 px-3 text-sm text-white outline-none focus:border-lime-300/50" /></label>
          {error && <p role="alert" className="rounded-[7px] border border-red-400/20 bg-red-400/[.06] p-3 text-xs text-red-300">{error}</p>}
          <button disabled={loading} className="flex h-11 w-full items-center justify-center gap-2 rounded-[7px] bg-lime-300 text-sm font-semibold text-[#10140f] hover:bg-lime-200 disabled:opacity-60">{loading && <Loader2 className="h-4 w-4 animate-spin" />}{mode === 'signin' ? 'Sign in' : 'Create account'}</button>
          <button type="button" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }} className="w-full text-xs text-[var(--text-secondary)] hover:text-white">{mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}</button>
        </div>}
      </form>
    </div>
  );
}
