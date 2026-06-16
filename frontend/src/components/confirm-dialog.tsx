import './confirm-dialog.css';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
  mode?: 'confirm' | 'info';
  busy?: boolean;
  onConfirm?: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  mode = 'confirm',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div
      className="confirm-dialog__backdrop"
      role="presentation"
      onClick={busy ? undefined : onCancel}
    >
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="confirm-dialog__title">
          {title}
        </h2>
        <p id="confirm-dialog-message" className="confirm-dialog__message">
          {message}
        </p>
        <div className="confirm-dialog__actions">
          {mode === 'confirm' ? (
            <>
              <button
                type="button"
                className="confirm-dialog__button"
                disabled={busy}
                onClick={onCancel}
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                className={`confirm-dialog__button confirm-dialog__button--${
                  variant === 'danger' ? 'danger' : 'primary'
                }`}
                disabled={busy}
                onClick={onConfirm}
              >
                {busy ? 'Processing…' : confirmLabel}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="confirm-dialog__button confirm-dialog__button--primary"
              disabled={busy}
              onClick={onCancel}
            >
              Got it
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
