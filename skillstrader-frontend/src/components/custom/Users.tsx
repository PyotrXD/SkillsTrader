import { useState } from 'react';
import type { FormEvent } from 'react';
import { getPocketBaseUiError, pb, type UserRole } from '../../lib/pocketbase/pb';
import Navbar from '../ui/Navbar';
import Sidebar from './Sidebar';

type CreateUserForm = {
  email: string;
  password: string;
  passwordConfirm: string;
  name: string;
  role: UserRole;
};

const initialForm: CreateUserForm = {
  email: '',
  password: '',
  passwordConfirm: '',
  name: '',
  role: 'staff',
};

function getErrorMessage(err: unknown): string {
  const uiMessage = getPocketBaseUiError(err, '');
  if (uiMessage === null) return '';
  if (uiMessage.trim()) return uiMessage;
  if (err && typeof err === 'object') {
    const message = (err as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return 'Failed to create user. Check the details and try again.';
}

export default function DashboardAdminCreateUser() {
  const email = pb.authStore.record?.email ?? 'your account';
  const [form, setForm] = useState<CreateUserForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  // Users page doesn't need a real activeKey — pass a dummy that won't match any entity
  const activeKey = '__users__';

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await pb.collection('users').create({
        email: form.email.trim(),
        password: form.password,
        passwordConfirm: form.passwordConfirm,
        name: form.name.trim(),
        role: form.role,
      });
      setSuccess(`User ${form.email.trim()} created with role ${form.role}.`);
      setForm((previous) => ({ ...initialForm, role: previous.role }));
    } catch (err) {
      const message = getErrorMessage(err);
      if (message) setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-row">
      <Sidebar
        activeKey={activeKey}
        isCollapsed={isMenuCollapsed}
        role="administrator"
        onSelect={() => {}}
        onToggleCollapsed={() => setIsMenuCollapsed((v) => !v)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar role="Administrator" email={email} />

        <div className="w-full max-w-[1160px] mx-auto px-5 py-6 md:px-10 md:py-8">
          <main className="grid gap-5">
            <section className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] shadow-[var(--shadow),var(--inset)] px-6 py-6">
              <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[var(--primary)] mb-2.5">Users</p>
              <h1 className="font-[var(--font-display)] text-[clamp(26px,2.7vw,36px)] font-bold leading-[1.12] tracking-[-0.02em] m-0">Create User Account</h1>
              <p className="mt-2.5 text-[var(--muted)] text-[14px] leading-[1.7] max-w-[70ch]">
                Create users directly and assign a role.
              </p>
            </section>

            <section className="bg-[var(--surface)] border border-[var(--border)] rounded-[18px] shadow-[0_14px_44px_rgba(26,23,20,0.08),var(--inset)] p-[18px]">
              <form className="grid grid-cols-1 md:grid-cols-2 gap-2.5" onSubmit={onSubmit}>
                <label className="grid gap-[5px]">
                  <span className="text-[12px] text-[var(--muted)] font-bold">Email</span>
                  <input
                    className="w-full border border-[var(--border)] bg-white text-[var(--text)] rounded-xl px-[11px] py-[10px] text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                    type="email"
                    autoComplete="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  />
                </label>

                <label className="grid gap-[5px]">
                  <span className="text-[12px] text-[var(--muted)] font-bold">Name</span>
                  <input
                    className="w-full border border-[var(--border)] bg-white text-[var(--text)] rounded-xl px-[11px] py-[10px] text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                    type="text"
                    autoComplete="name"
                    required
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  />
                </label>

                <label className="grid gap-[5px]">
                  <span className="text-[12px] text-[var(--muted)] font-bold">Password</span>
                  <input
                    className="w-full border border-[var(--border)] bg-white text-[var(--text)] rounded-xl px-[11px] py-[10px] text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  />
                </label>

                <label className="grid gap-[5px]">
                  <span className="text-[12px] text-[var(--muted)] font-bold">Password confirm</span>
                  <input
                    className="w-full border border-[var(--border)] bg-white text-[var(--text)] rounded-xl px-[11px] py-[10px] text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={form.passwordConfirm}
                    onChange={(e) => setForm((p) => ({ ...p, passwordConfirm: e.target.value }))}
                  />
                </label>

                <label className="grid gap-[5px]">
                  <span className="text-[12px] text-[var(--muted)] font-bold">Role</span>
                  <select
                    className="w-full border border-[var(--border)] bg-white text-[var(--text)] rounded-xl px-[11px] py-[10px] text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                    value={form.role}
                    onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as UserRole }))}
                  >
                    <option value="administrator">administrator</option>
                    <option value="manager">manager</option>
                    <option value="staff">staff</option>
                  </select>
                </label>

                <div className="grid gap-[5px]">
                  <span className="invisible">&nbsp;</span>
                  <button
                    type="submit"
                    className="border-none text-white bg-gradient-to-br from-[var(--primary)] to-[var(--primary2)] shadow-[0_8px_26px_rgba(200,75,49,0.18)] rounded-full px-3.5 py-2.5 text-[13px] font-bold cursor-pointer transition-all duration-150 hover:brightness-105 active:translate-y-[1px] active:filter-none inline-flex items-center justify-center disabled:opacity-70"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Creating...' : 'Create User'}
                  </button>
                </div>
              </form>

              {error ? <p className="m-0 mt-3 text-[#9f2d20] text-[13px]">{error}</p> : null}
              {success ? <p className="m-0 mt-3 text-[var(--muted)] text-[13px]">{success}</p> : null}
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
