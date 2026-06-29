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
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--border)] bg-gradient-to-r from-[var(--navy)] to-[var(--navy2)]">
          <Link className="flex items-center gap-3 min-w-0 text-inherit no-underline" to="/dashboard">
            <div className="w-[34px] h-[34px] rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary2)] shadow-[0_10px_24px_rgba(255,193,7,0.25)] shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <div className="font-[var(--font-display)] text-[18px] font-bold tracking-[0.2px] text-white">SkillsTrader</div>
              <div className="text-[12px] text-white/70 truncate">Signed in as {email}</div>
            </div>
          </Link>

          <div className="flex items-center gap-2.5 shrink-0">
            <button type="button" className="border border-white/30 bg-white/10 text-white rounded-full px-3.5 py-2.5 text-[13px] font-bold cursor-pointer transition-all duration-150 hover:bg-white/20 active:translate-y-[1px] inline-flex items-center justify-center no-underline" onClick={logout}>
              Log out
            </button>
          </div>
        </header>

        <main className="w-full mx-auto grid gap-5 flex-1 p-6">
          <section className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] shadow-[var(--shadow),var(--inset)] px-6 py-6">
            <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[var(--primary)] mb-2.5">Setup required</p>
            <h1 className="font-[var(--font-display)] text-[clamp(26px,2.7vw,36px)] font-bold leading-[1.12] tracking-[-0.02em] m-0 text-[var(--navy)]">Your account has no valid role</h1>
            <p className="mt-2.5 text-[var(--muted)] text-[14px] leading-[1.7] max-w-[70ch]">
              Set the <code className="font-mono bg-[var(--surface2)] px-1.5 py-0.5 rounded-lg">role</code> field in PocketBase to one of:{' '}
              <strong>administrator</strong>, <strong>manager</strong>, <strong>staff</strong>.
            </p>
            <a className="inline-flex items-center mt-3.5 text-[var(--primary)] font-bold no-underline hover:brightness-110 transition-all" href={`${pocketBaseUrl}/_/`} target="_blank" rel="noreferrer">
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
