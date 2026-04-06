import { type ReactNode, useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string; // Modal title (e.g. Add, Edit, Delete)
}

export default function Modal({ open, onClose, children, title }: ModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Modal content */}
      <div className="relative z-10 w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-(--border) overflow-hidden animate-[fadeInScale_0.18s_ease]">
        {title && (
          <div className="px-8 pt-4 pb-3 border-b border-(--border) bg-white flex items-center justify-between">
            <h2 className="text-2xl font-bold text-(--text) bg-white tracking-tight m-0">{title}</h2>
            <button
              type="button"
              className="ml-4 p-1.5 cursor-pointer rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors focus:outline-none"
              aria-label="Close"
              onClick={onClose}
              style={{ marginRight: '-0.5rem' }}
            >
              <svg width="22" height="22" viewBox="0 0 20 20" fill="none"><path d="M6.5 6.5L13.5 13.5M13.5 6.5L6.5 13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </div>
        )}
        <div className="px-8 py-7">{children}</div>
      </div>
    </div>
  );
}