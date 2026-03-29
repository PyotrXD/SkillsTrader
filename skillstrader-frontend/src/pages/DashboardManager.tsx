import { useState } from 'react';
import { Link } from 'react-router-dom';
import { logout, pb } from '../pb';
import DashboardMetrics from './DashboardMetrics';
import DashboardEntitySidebar from '../components/custom/DashboardEntitySidebar';
import RecordsWorkspace from './RecordsWorkspace';
import './dashboard.css';

export default function DashboardManager() {
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
            <div className="dashBrandMeta">Manager - {email}</div>
          </div>
        </Link>

        <div className="dashTopbarActions">
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
            <p className="dashEyebrow">Manager</p>
            <h1 className="dashTitle">Core CRUD Workspace</h1>
            <p className="dashSub">
              Manage all core entities with create, edit, delete, and filter workflows.
            </p>
          </section>

          <DashboardMetrics />
          <RecordsWorkspace role="manager" activeKey={activeKey} />
        </main>
      </div>
    </div>
  );
}
