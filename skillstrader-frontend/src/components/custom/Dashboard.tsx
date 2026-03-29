import { Link } from 'react-router-dom';
import { logout, pb, pocketBaseUrl, type UserRole } from '../../lib/pocketbase/pb';
import Admin from '../user-role/Admin';
import Manager from '../user-role/Manager';
import Staff from '../user-role/Staff';

type Props = {
  role: UserRole | null;
};

export default function Dashboard({ role }: Props) {
  const email = pb.authStore.record?.email ?? 'your account';

  if (!role) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--border)] bg-[#f0ede8cf] backdrop-blur-md">
          <Link className="flex items-center gap-3 min-w-0 text-inherit no-underline" to="/dashboard">
            <div className="w-[34px] h-[34px] rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] shadow-[0_10px_24px_rgba(26,23,20,0.12)] shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <div className="font-[var(--font-display)] text-[18px] font-bold tracking-[0.2px]">SkillsTrader</div>
              <div className="text-[12px] text-[var(--muted)] truncate">Signed in as {email}</div>
            </div>
          </Link>

          <div className="flex items-center gap-2.5 shrink-0">
            <button type="button" className="border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] rounded-full px-3.5 py-2.5 text-[13px] font-bold cursor-pointer transition-all duration-150 hover:brightness-105 active:translate-y-[1px] active:filter-none inline-flex items-center justify-center no-underline" onClick={logout}>
              Log out
            </button>
          </div>
        </header>

        <main className="w-full max-w-[1160px] mx-auto px-5 py-6 md:px-10 md:py-8 grid gap-5 flex-1">
          <section className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] shadow-[var(--shadow),var(--inset)] px-6 py-6">
            <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[var(--primary)] mb-2.5">Setup required</p>
            <h1 className="font-[var(--font-display)] text-[clamp(26px,2.7vw,36px)] font-bold leading-[1.12] tracking-[-0.02em] m-0">Your account has no valid role</h1>
            <p className="mt-2.5 text-[var(--muted)] text-[14px] leading-[1.7] max-w-[70ch]">
              Set the <code className="font-mono bg-[rgba(26,23,20,0.06)] px-1.5 py-0.5 rounded-lg">role</code> field in PocketBase to one of:{' '}
              <strong>administrator</strong>, <strong>manager</strong>, <strong>staff</strong>.
            </p>
            <a className="inline-flex items-center mt-3.5 text-[var(--primary)] font-bold no-underline hover:brightness-110" href={`${pocketBaseUrl}/_/`} target="_blank" rel="noreferrer">
              Open PocketBase Dashboard
            </a>
          </section>
        </main>
      </div>
    );
  }

  switch (role) {
    case 'administrator':
      return <Admin />;
    case 'manager':
      return <Manager />;
    case 'staff':
      return <Staff />;
    default:
      return null;
  }
}
