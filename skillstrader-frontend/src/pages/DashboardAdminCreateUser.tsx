import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { getPocketBaseUiError, logout, pb, pocketBaseUrl, type UserRole } from '../pb';
import './dashboard.css';

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
      setForm((previous) => ({
        ...initialForm,
        role: previous.role,
      }));
    } catch (err) {
      const message = getErrorMessage(err);
      if (message) setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="dashPage">
      <header className="dashTopbar">
        <Link className="dashBrand dashBrandLink" to="/dashboard">
          <div className="dashBrandMark" aria-hidden="true" />
          <div className="dashBrandText">
            <div className="dashBrandName">SkillsTrader</div>
            <div className="dashBrandMeta">Administrator - {email}</div>
          </div>
        </Link>

        <div className="dashTopbarActions">
          <a
            className="dashButton dashButtonPrimary"
            href={`${pocketBaseUrl}/_/`}
            target="_blank"
            rel="noreferrer"
          >
            PocketBase Dashboard
          </a>
          <button type="button" className="dashButton" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <main className="dashMain">
        <section className="dashHero">
          <p className="dashEyebrow">Administrator</p>
          <h1 className="dashTitle">Create User Account</h1>
          <p className="dashSub">
            Create users directly from this admin screen and assign a role.
          </p>
          <Link to="/dashboard" className="dashLink">
            Back to administrator dashboard
          </Link>
        </section>

        <section className="dashCrudSection">
          <form className="dashFormGrid" onSubmit={onSubmit}>
            <label className="dashField">
              <span>Email</span>
              <input
                className="dashInput"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              />
            </label>

            <label className="dashField">
              <span>Name</span>
              <input
                className="dashInput"
                type="text"
                autoComplete="name"
                required
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </label>

            <label className="dashField">
              <span>Password</span>
              <input
                className="dashInput"
                type="password"
                autoComplete="new-password"
                required
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              />
            </label>

            <label className="dashField">
              <span>Password confirm</span>
              <input
                className="dashInput"
                type="password"
                autoComplete="new-password"
                required
                value={form.passwordConfirm}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, passwordConfirm: event.target.value }))
                }
              />
            </label>

            <label className="dashField">
              <span>Role</span>
              <select
                className="dashInput"
                value={form.role}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, role: event.target.value as UserRole }))
                }
              >
                <option value="administrator">administrator</option>
                <option value="manager">manager</option>
                <option value="staff">staff</option>
              </select>
            </label>

            <div className="dashField">
              <span>&nbsp;</span>
              <button type="submit" className="dashButton dashButtonPrimary" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>

          {error ? <p className="dashError">{error}</p> : null}
          {success ? <p className="dashMuted">{success}</p> : null}
        </section>
      </main>
    </div>
  );
}
