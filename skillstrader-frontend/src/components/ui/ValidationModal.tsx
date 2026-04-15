import { useEffect, useRef } from 'react';

interface ValidationModalProps {
  /** Whether the modal is visible */
  open: boolean;
  /** Bold title shown at the top of the modal */
  title: string;
  /** Descriptive message body */
  message: string;
  /** Label for the confirm/action button (default: "Confirm") */
  confirmLabel?: string;
  /** Label for the cancel button (default: "Cancel") */
  cancelLabel?: string;
  /** Set to true to render the confirm button in a destructive (red) style */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ValidationModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ValidationModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus the cancel button when modal opens (safe default)
  useEffect(() => {
    if (open) {
      cancelRef.current?.focus();
    }
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="vm-title"
      aria-describedby="vm-message"
    >
      {/* Semi-transparent overlay */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Modal card */}
      <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-(--border) overflow-hidden animate-[fadeInScale_0.18s_ease]">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className={`mt-0.5 p-2 shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${destructive ? 'bg-[#fff0ed]' : 'bg-(--surface2)'}`}>
              {destructive ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              )}
            </div>

            <div>
              <h2 id="vm-title" className="text-lg font-bold text-(--text) leading-tight m-0">
                {title}
              </h2>
              <p id="vm-message" className="mt-1.5 text-base text-(--muted) leading-relaxed m-0">
                {message}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 px-6 pb-5">
          <button
            ref={cancelRef}
            type="button"
            className="px-4 py-2 rounded-md border border-(--border) bg-white text-(--text) text-base font-semibold cursor-pointer hover:bg-(--surface2) transition-colors"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-md text-base font-semibold cursor-pointer border-none transition-all hover:brightness-110 active:scale-95 ${
              destructive
                ? 'bg-gradient-to-br from-(--primary) to-(--primary2) text-white shadow-[0_4px_14px_rgba(200,75,49,0.25)]'
                : 'bg-(--text) text-white'
            }`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
