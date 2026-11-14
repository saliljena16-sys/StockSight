import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from './ui/Modal';

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

  const submit = async (event: FormEvent) => {
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
    <Modal
      titleId="auth-title"
      title={mode === 'signin' ? 'Welcome back' : 'Create your account'}
      description="Sync portfolios securely across devices."
      onClose={onClose}
    >
      <form onSubmit={submit} noValidate>
        {confirmationEmail ? (
          <div className="space-y-4 p-5">
            <div className="rounded-control border border-line-strong bg-raised p-4">
              <p className="text-sm font-semibold text-ink">Check your email</p>
              <p className="mt-2 text-xs leading-5 text-ink-muted">We sent a verification link to <strong className="font-semibold text-ink">{confirmationEmail}</strong>. Open that link before signing in.</p>
            </div>
            {resendMessage && <p role="status" className="text-xs leading-5 text-ink-muted">{resendMessage}</p>}
            <button
              type="button"
              disabled={loading}
              onClick={async () => { setLoading(true); setResendMessage(''); const message = await onResend(confirmationEmail); setLoading(false); setResendMessage(message ?? 'A new verification email was sent.'); }}
              className="btn btn-secondary w-full"
            >
              Resend verification email
            </button>
            <button type="button" onClick={() => { setConfirmationEmail(''); setMode('signin'); setError(''); }} className="btn btn-quiet w-full">I verified my email — sign in</button>
          </div>
        ) : (
          <div className="space-y-4 p-5">
            <label className="eyebrow block">
              Email
              <input type="email" autoComplete="email" autoFocus value={email} onChange={event => setEmail(event.target.value)} className="field mt-2 font-sans normal-case tracking-normal" />
            </label>
            <label className="eyebrow block">
              Password
              <input type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={event => setPassword(event.target.value)} className="field mt-2 font-sans normal-case tracking-normal" />
            </label>
            {error && <p role="alert" className="rounded-control border border-loss/40 bg-loss/[0.08] p-3 text-xs leading-5 text-loss">{error}</p>}
            <button type="submit" disabled={loading} className="btn btn-primary w-full">
              {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
            <button type="button" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }} className="btn btn-quiet w-full">
              {mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}
            </button>
          </div>
        )}
      </form>
    </Modal>
  );
}
