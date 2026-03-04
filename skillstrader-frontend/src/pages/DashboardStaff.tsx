import { pb } from '../pb';
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
          <button type="button" className="dashButton" onClick={() => pb.authStore.clear()}>
            Log out
          </button>
        </div>
      </header>

      <main className="dashMain">
        <section className="dashHero">
          <p className="dashEyebrow">Staff</p>
          <h1 className="dashTitle">Work queue</h1>
          <p className="dashSub">
            You can work with records, but deletions require a manager&apos;s approval.
          </p>
        </section>

        <section className="dashGrid" aria-label="Staff actions">
          <div className="dashCard">
            <h2 className="dashCardTitle">View records</h2>
            <p className="dashCardBody">Browse records and keep information up to date.</p>
            <button type="button" className="dashCardAction" disabled>
              Open (coming soon)
            </button>
          </div>

          <div className="dashCard">
            <h2 className="dashCardTitle">Request deletion</h2>
            <p className="dashCardBody">
              Submit a deletion request. A manager must approve before anything is removed.
            </p>
            <button type="button" className="dashCardAction" disabled>
              Request approval (coming soon)
            </button>
          </div>

          <div className="dashCard dashCardMuted">
            <h2 className="dashCardTitle">Delete records</h2>
            <p className="dashCardBody">Disabled until a manager approves your request.</p>
            <button type="button" className="dashCardAction" disabled>
              Delete (requires approval)
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

