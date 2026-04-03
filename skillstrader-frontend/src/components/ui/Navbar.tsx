import { useState, useRef, useEffect } from 'react';
import { logout, pocketBaseUrl } from '../../lib/pocketbase/pb';
import ValidationModal from './ValidationModal';

interface NavbarProps {
  role: 'Staff' | 'Manager' | 'Administrator';
  email: string;
}

type PendingAction = 'logout' | 'pocketbase' | null;

export default function Navbar({ role, email }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function requestAction(action: PendingAction) {
    setMenuOpen(false);
    setPendingAction(action);
  }

  function handleConfirm() {
    if (pendingAction === 'logout') {
      logout();
    } else if (pendingAction === 'pocketbase') {
      window.open(`${pocketBaseUrl}/_/`, '_blank', 'noreferrer');
    }
    setPendingAction(null);
  }

  function handleCancel() {
    setPendingAction(null);
  }

  const modalConfig = {
    logout: {
      title: 'Log out?',
      message: 'You will be signed out of your current session.',
      confirmLabel: 'Log out',
      destructive: true,
    },
    pocketbase: {
      title: 'Open PocketBase Dashboard?',
      message: 'This will open the PocketBase admin panel in a new tab.',
      confirmLabel: 'Open',
      destructive: false,
    },
  } as const;

  const activeModal = pendingAction ? modalConfig[pendingAction] : null;

  return (
    <>
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--border)] bg-white backdrop-blur-md">
        <div />

        <div className="relative flex items-center gap-2.5 shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary2)] text-white font-bold flex items-center justify-center cursor-pointer shadow-md hover:brightness-110 hover:-translate-y-[1px] active:translate-y-0 transition-all outline-none border-none"
            title="Profile menu"
          >
            {email.charAt(0).toUpperCase()}
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-12 min-w-[240px] bg-white border border-[var(--border)] rounded-2xl shadow-xl py-2 flex flex-col z-20 overflow-hidden">
              <div className="px-5 py-3 border-b border-[var(--border)] mb-1 bg-white">
                <strong className="block text-[14px] leading-tight font-bold text-[var(--text)]">{role}</strong>
                <span className="block text-[12px] text-[var(--muted)] truncate">{email}</span>
              </div>

              {role === 'Administrator' && (
                <button
                  type="button"
                  className="px-5 py-2.5 text-[13px] font-medium text-[var(--text)] hover:bg-[var(--surface2)] transition-colors text-left w-full cursor-pointer bg-transparent border-none"
                  onClick={() => requestAction('pocketbase')}
                >
                  PocketBase
                </button>
              )}

              <button
                type="button"
                className="px-5 py-2.5 text-[13px] font-medium text-[var(--primary)] hover:bg-[var(--primary3)] transition-colors text-left w-full cursor-pointer bg-transparent border-none"
                onClick={() => requestAction('logout')}
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Confirmation modal — rendered outside the header so it overlays the whole page */}
      {activeModal && (
        <ValidationModal
          open
          title={activeModal.title}
          message={activeModal.message}
          confirmLabel={activeModal.confirmLabel}
          destructive={activeModal.destructive}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </>
  );
}
