import { useState, type FormEvent } from 'react';
import { checkPortfolioName } from '../../utils/portfolioNames';
import Modal from '../ui/Modal';

interface PortfolioNameDialogProps {
  /** Omit to create a new portfolio; set to the portfolio being renamed. */
  currentName?: string;
  existingNames: string[];
  /** Prefilled (and selected, so typing replaces it): a free suggestion, or the current name. */
  defaultValue: string;
  /** Returns false if the name was rejected (it never is after the dialog's own check). */
  onSave: (name: string) => boolean;
  onClose: () => void;
}

/**
 * Name a new portfolio or rename one. A name that clashes with another portfolio (ignoring case
 * and surrounding spaces) is refused with the reason and the dialog stays open with what was
 * typed. Enter saves, Escape cancels.
 */
export default function PortfolioNameDialog({ currentName, existingNames, defaultValue, onSave, onClose }: PortfolioNameDialogProps) {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);
  const renaming = currentName !== undefined;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const check = checkPortfolioName(value, existingNames, currentName);
    if (check.status === 'empty') return;
    if (check.status === 'clash') {
      setError(check.message);
      return;
    }
    if (check.status === 'ok' && !onSave(check.name)) return;
    onClose();
  };

  return (
    <Modal titleId="portfolio-name-title" title={renaming ? 'Rename portfolio' : 'New portfolio'} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <div className="space-y-4 p-5">
          <label className="eyebrow block">
            Portfolio name
            <input
              type="text"
              value={value}
              onChange={event => { setValue(event.target.value); setError(null); }}
              onFocus={event => event.target.select()}
              autoFocus
              autoComplete="off"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'portfolio-name-error' : undefined}
              className="field mt-2 font-sans normal-case tracking-normal"
            />
          </label>
          {error && <p id="portfolio-name-error" role="alert" className="rounded-control border border-loss/40 bg-loss/[0.08] p-3 text-xs leading-5 text-loss [overflow-wrap:anywhere]">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-line p-5">
          <button type="button" onClick={onClose} className="btn btn-quiet">Cancel</button>
          <button type="submit" disabled={!value.trim()} className="btn btn-primary">{renaming ? 'Rename' : 'Create portfolio'}</button>
        </div>
      </form>
    </Modal>
  );
}
