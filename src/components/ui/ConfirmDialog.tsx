import type { ReactNode } from 'react';
import Modal from './Modal';

interface ConfirmDialogProps {
  /** id of the heading, used to label the dialog. */
  titleId: string;
  title: ReactNode;
  /** What will happen, including anything that will be lost. */
  message: ReactNode;
  /** Text of the destructive button, e.g. "Delete portfolio". */
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Asks before a destructive action. The confirm button has focus, so Enter confirms (as the
 * browser's confirm() did); Escape, Cancel or the backdrop close it without doing anything.
 */
export default function ConfirmDialog({ titleId, title, message, confirmLabel, onConfirm, onClose }: ConfirmDialogProps) {
  return (
    <Modal titleId={titleId} title={title} onClose={onClose}>
      <form onSubmit={event => { event.preventDefault(); onConfirm(); onClose(); }}>
        <p className="p-5 text-sm leading-6 text-ink-muted [overflow-wrap:anywhere]">{message}</p>
        <div className="flex justify-end gap-2 border-t border-line p-5">
          <button type="button" onClick={onClose} className="btn btn-quiet">Cancel</button>
          <button type="submit" autoFocus className="btn btn-danger">{confirmLabel}</button>
        </div>
      </form>
    </Modal>
  );
}
