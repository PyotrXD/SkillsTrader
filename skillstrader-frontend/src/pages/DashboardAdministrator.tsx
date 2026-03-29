import { useState } from 'react';
import { Link } from 'react-router-dom';
import { logout, pb, pocketBaseUrl } from '../pb';
import DashboardMetrics from './DashboardMetrics';
import DashboardEntitySidebar from '../components/custom/DashboardEntitySidebar';
import RecordsWorkspace from './RecordsWorkspace';
import './dashboard.css';

export default function DashboardAdministrator() {
  const email = pb.authStore.record?.email ?? 'your account';
  const [activeKey, setActiveKey] = useState('candidates');
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);

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
          <Link className="dashButton" to="/dashboard/admin/users/new">
            Create User
          </Link>
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

      <div className={`dashPageShell ${isMenuCollapsed ? 'dashPageShellCollapsed' : ''}`}>
        <DashboardEntitySidebar
          activeKey={activeKey}
          isCollapsed={isMenuCollapsed}
          onSelect={setActiveKey}
          onToggleCollapsed={() => setIsMenuCollapsed((value) => !value)}
        />

        <main className="dashMain">
          <section className="dashHero">
            <p className="dashEyebrow">Administrator</p>
            <h1 className="dashTitle">Core CRUD Workspace</h1>
            <p className="dashSub">
              Full record operations for candidates, employers, job orders, placements, interviews, and documents.
            </p>
          </section>

          <DashboardMetrics />
          <RecordsWorkspace role="administrator" activeKey={activeKey} />
        </main>
      </div>
    </div>
  );
}

