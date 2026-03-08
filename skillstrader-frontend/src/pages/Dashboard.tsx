import { Link } from 'react-router-dom';
import { logout, pb, pocketBaseUrl, type UserRole } from '../pb';
import DashboardAdministrator from './DashboardAdministrator';
import DashboardManager from './DashboardManager';
import DashboardStaff from './DashboardStaff';
import './dashboard.css';

type Props = {
  role: UserRole | null;
};

export default function Dashboard({ role }: Props) {
  const email = pb.authStore.record?.email ?? 'your account';

  if (!role) {
    return (
      <div className="dashPage">
        <header className="dashTopbar">
          <Link className="dashBrand dashBrandLink" to="/dashboard">
            <div className="dashBrandMark" aria-hidden="true" />
            <div className="dashBrandText">
              <div className="dashBrandName">SkillsTrader</div>
              <div className="dashBrandMeta">Signed in as {email}</div>
            </div>
          </Link>

          <div className="dashTopbarActions">
            <button type="button" className="dashButton" onClick={logout}>
              Log out
            </button>
          </div>
        </header>

        <main className="dashMain">
          <section className="dashHero">
            <p className="dashEyebrow">Setup required</p>
            <h1 className="dashTitle">Your account has no valid role</h1>
            <p className="dashSub">
              Set the <code className="dashCode">role</code> field in PocketBase to one of:{' '}
              <strong>administrator</strong>, <strong>manager</strong>, <strong>staff</strong>.
            </p>
            <a className="dashLink" href={`${pocketBaseUrl}/_/`} target="_blank" rel="noreferrer">
              Open PocketBase Dashboard
            </a>
          </section>
        </main>
      </div>
    );
  }

  switch (role) {
    case 'administrator':
      return <DashboardAdministrator />;
    case 'manager':
      return <DashboardManager />;
    case 'staff':
      return <DashboardStaff />;
    default:
      return null;
  }
}
