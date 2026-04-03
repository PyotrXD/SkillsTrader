import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { pb } from '../../lib/pocketbase/pb';
import Navbar from '../ui/Navbar';
import DashboardMetrics from '../../pages/DashboardMetrics';
import Sidebar from '../custom/Sidebar';
import RecordsWorkspace from '../../pages/RecordsWorkspace';

export default function Staff() {
  const email = pb.authStore.record?.email ?? 'your account';
  const location = useLocation();
  const [activeKey, setActiveKey] = useState<string>(
    (location.state as { activeKey?: string } | null)?.activeKey ?? 'candidates'
  );
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-row">
      <Sidebar
        activeKey={activeKey}
        isCollapsed={isMenuCollapsed}
        role="staff"
        onSelect={setActiveKey}
        onToggleCollapsed={() => setIsMenuCollapsed((value) => !value)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar role="Staff" email={email} />

        <div className="w-full mx-auto px-5 py-6 md:p-6 sm:p-3">
          <main className="grid gap-5">
            <section className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] shadow-[var(--shadow),var(--inset)] px-6 py-6">
              <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[var(--primary)] mb-2.5">Staff</p>
              <h1 className="font-[var(--font-display)] text-[clamp(26px,2.7vw,36px)] font-bold leading-[1.12] tracking-[-0.02em] m-0">Core CRUD Workspace</h1>
              <p className="mt-2.5 text-[var(--muted)] text-[14px] leading-[1.7] max-w-[70ch]">
                Staff can create and edit records across core entities. Deletion remains disabled for staff.
              </p>
            </section>

            <DashboardMetrics />
            <RecordsWorkspace role="staff" activeKey={activeKey} />
          </main>
        </div>
      </div>
    </div>
  );
}
