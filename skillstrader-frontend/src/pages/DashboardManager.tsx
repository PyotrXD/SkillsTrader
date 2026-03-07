import { logout, pb } from '../pb';
import RecordsWorkspace from './RecordsWorkspace';
import './dashboard.css';

export default function DashboardManager() {
  const email = pb.authStore.record?.email ?? 'your account';

  return (
    <div className="dashPage">
      <header className="dashTopbar">
        <div className="dashBrand">
          <div className="dashBrandMark" aria-hidden="true" />
          <div className="dashBrandText">
            <div className="dashBrandName">SkillsTrader</div>
            <div className="dashBrandMeta">Manager · {email}</div>
          </div>
        </div>

        <div className="dashTopbarActions">
          <button type="button" className="dashButton" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <main className="dashMain">
        <section className="dashHero">
          <p className="dashEyebrow">Manager</p>
          <h1 className="dashTitle">Core CRUD Workspace</h1>
          <p className="dashSub">
            Manage all core entities with create, edit, delete, and filter workflows.
          </p>
        </section>

        <RecordsWorkspace role="manager" />
      </main>
    </div>
  );
}
