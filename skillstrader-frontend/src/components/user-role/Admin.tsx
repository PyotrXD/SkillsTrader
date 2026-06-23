import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { pb } from '../../lib/pocketbase/pb';
import Navbar from '../ui/Navbar';
import Sidebar from '../custom/Sidebar';
import RecordsWorkspace from '../../pages/RecordsWorkspace';
import { UsersPanel } from '../custom/Users';
import AuditLog from '../custom/AuditLog';

export default function Admin() {
  const email = pb.authStore.record?.email ?? 'your account';
  const location = useLocation();
  const [activeKey, setActiveKey] = useState<string>(
    (location.state as { activeKey?: string } | null)?.activeKey ?? 'dashboard'
  );
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-row">
      <Sidebar
        activeKey={activeKey}
        isCollapsed={isMenuCollapsed}
        role="administrator"
        onSelect={setActiveKey}
        onToggleCollapsed={() => setIsMenuCollapsed((value) => !value)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar role="Administrator" email={email} />

        <div className="w-full mx-auto px-5 py-6 md:p-6 sm:p-3">
          <main className="grid gap-5">
            {activeKey === 'users' ? (
              <UsersPanel />
            ) : activeKey === 'audit_log' ? (
              <AuditLog />
            ) : (
              <RecordsWorkspace role="administrator" activeKey={activeKey} onNavigate={setActiveKey} />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
