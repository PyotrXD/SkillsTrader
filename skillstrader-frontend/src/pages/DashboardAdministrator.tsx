import { pb, pocketBaseUrl } from '../pb';
import './dashboard.css';

export default function DashboardAdministrator() {
  const email = pb.authStore.record?.email ?? 'your account';

  return (
    <div className="dashPage">
      <header className="dashTopbar">
        <div className="dashBrand">
          <div className="dashBrandMark" aria-hidden="true" />
          <div className="dashBrandText">
            <div className="dashBrandName">SkillsTrader</div>
            <div className="dashBrandMeta">Administrator · {email}</div>
          </div>
        </div>

        <div className="dashTopbarActions">
          <a
            className="dashButton dashButtonPrimary"
            href={`${pocketBaseUrl}/_/`}
            target="_blank"
            rel="noreferrer"
          >
            PocketBase Dashboard
          </a>
          <button type="button" className="dashButton" onClick={() => pb.authStore.clear()}>
            Log out
          </button>
        </div>
      </header>

      <main className="dashMain">
        <section className="dashHero">
          <p className="dashEyebrow">Administrator</p>
          <h1 className="dashTitle">Full access</h1>
          <p className="dashSub">
            You can access everything, including the PocketBase dashboard and all record operations.
          </p>
        </section>

        <section className="dashGrid" aria-label="Administrator actions">
          <div className="dashCard">
            <h2 className="dashCardTitle">Manage records</h2>
            <p className="dashCardBody">Create, edit, and delete records across all collections.</p>
            <button type="button" className="dashCardAction" disabled>
              Open records (coming soon)
            </button>
          </div>

          <div className="dashCard">
            <h2 className="dashCardTitle">User & role management</h2>
            <p className="dashCardBody">Assign roles and manage user access.</p>
            <button type="button" className="dashCardAction" disabled>
              Open users (coming soon)
            </button>
          </div>

          <div className="dashCard dashCardAccent">
            <h2 className="dashCardTitle">PocketBase dashboard</h2>
            <p className="dashCardBody">Open the admin UI to configure collections and rules.</p>
            <a className="dashCardAction" href={`${pocketBaseUrl}/_/`} target="_blank" rel="noreferrer">
              Open PocketBase
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}

