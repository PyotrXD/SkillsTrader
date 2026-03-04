import { pb } from '../pb';
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
          <button type="button" className="dashButton" onClick={() => pb.authStore.clear()}>
            Log out
          </button>
        </div>
      </header>

      <main className="dashMain">
        <section className="dashHero">
          <p className="dashEyebrow">Manager</p>
          <h1 className="dashTitle">Record operations</h1>
          <p className="dashSub">You can create, edit, and delete records.</p>
        </section>

        <section className="dashGrid" aria-label="Manager actions">
          <div className="dashCard">
            <h2 className="dashCardTitle">Create records</h2>
            <p className="dashCardBody">Add new items to the system using guided forms.</p>
            <button type="button" className="dashCardAction" disabled>
              Create (coming soon)
            </button>
          </div>

          <div className="dashCard">
            <h2 className="dashCardTitle">Edit records</h2>
            <p className="dashCardBody">Update existing records and correct details.</p>
            <button type="button" className="dashCardAction" disabled>
              Edit (coming soon)
            </button>
          </div>

          <div className="dashCard dashCardDanger">
            <h2 className="dashCardTitle">Delete records</h2>
            <p className="dashCardBody">Remove records when needed. Deletions are immediate.</p>
            <button type="button" className="dashCardAction" disabled>
              Delete (coming soon)
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

