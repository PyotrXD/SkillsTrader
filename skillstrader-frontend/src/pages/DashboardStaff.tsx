import { logout, pb } from '../pb';
import RecordsWorkspace from './RecordsWorkspace';
import './dashboard.css';

export default function DashboardStaff() {
  const email = pb.authStore.record?.email ?? 'your account';

  return (
    <div className="dashPage">
      <header className="dashTopbar">
        <div className="dashBrand">
          <div className="dashBrandMark" aria-hidden="true" />
          <div className="dashBrandText">
            <div className="dashBrandName">SkillsTrader</div>
            <div className="dashBrandMeta">Staff · {email}</div>
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
          <p className="dashEyebrow">Staff</p>
          <h1 className="dashTitle">Core CRUD Workspace</h1>
          <p className="dashSub">
            Staff can create and edit records across core entities. Deletion remains disabled for staff.
          </p>
        </section>

        <RecordsWorkspace role="staff" />
      </main>
    </div>
  );
}
