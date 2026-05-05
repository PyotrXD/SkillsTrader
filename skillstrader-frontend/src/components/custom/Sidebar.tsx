import type { ReactElement } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { RECORD_ENTITY_ITEMS } from '../../pages/RecordsWorkspace';
import type { UserRole } from '../../lib/pocketbase/pb';

type Props = {
  activeKey: string;
  isCollapsed: boolean;
  role: UserRole;
  onSelect: (key: string) => void;
  onToggleCollapsed: () => void;
};

const ENTITY_ICONS: Record<string, ReactElement> = {
  candidates: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  positions: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"><path d="M2.217 14.02a9 9 0 1 0 16.566-7.04a9 9 0 0 0-16.566 7.04m14.646 2.845L22.5 22.5"/><path d="M7.5 7.5a3 3 0 1 0 6 0a3 3 0 0 0-6 0m3 4.5v4.5m4.224-1.5a4.473 4.473 0 0 0-8.449 0"/></g></svg>
  ),
  employer: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </svg>
  ),
  job_orders: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  placements: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  interviews: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
};

const USERS_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const COLLAPSE_ICON_OPEN = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const COLLAPSE_ICON_CLOSED = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const AUDIT_LOG_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="8" y1="13" x2="16" y2="13" />
    <line x1="8" y1="17" x2="12" y2="17" />
    <circle cx="17" cy="17" r="3" />
    <line x1="19.5" y1="19.5" x2="21" y2="21" />
  </svg>
);

const NAV_BASE =
  'flex items-center gap-2.5 rounded-xl text-[13px] font-semibold cursor-pointer transition-colors border';
const NAV_ACTIVE =
  'bg-gradient-to-br from-[var(--primary)] to-[var(--primary2)] border-transparent text-white shadow-[0_4px_12px_rgba(200,75,49,0.2)]';
const NAV_IDLE =
  'border-transparent bg-transparent text-[var(--text)] hover:bg-[var(--surface2)]';

export default function Sidebar({
  activeKey,
  isCollapsed,
  role,
  onSelect,
  onToggleCollapsed,
}: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const onUsersPage = location.pathname.startsWith('/dashboard/admin/users');
  const showUsers = role === 'administrator' || role === 'manager';
  const sizeClass = isCollapsed ? 'p-2 justify-center' : 'px-3 py-2.5 justify-start';

  function handleEntitySelect(key: string) {
    if (onUsersPage) {
      navigate('/dashboard', { state: { activeKey: key } });
    } else {
      onSelect(key);
    }
  }

  return (
    <aside
      className={`bg-white border-r border-(--border) py-5 flex flex-col gap-5 transition-[width] duration-300 sticky top-0 h-screen overflow-y-auto shrink-0 ${
        isCollapsed ? 'w-18 px-2.5' : 'w-60 px-4'
      }`}
    >
      {/* Brand + collapse toggle */}
      <div className={`flex items-center ${isCollapsed ? 'flex-col gap-3 justify-center' : 'justify-between'}`}>
        <Link className="flex items-center gap-2.5 min-w-0 text-inherit no-underline" to="/dashboard">
          {!isCollapsed && (
            <h1 className='text-black truncate tracking-widest pl-3 text-base'>
              <span className='font-bold text-base'>Skills</span>Trader
            </h1>
          )}
        </Link>
        <button
          type="button"
          className="w-7 h-7 flex items-center justify-center border border-(--border) rounded-full text-(--muted) hover:bg-(--surface2) transition-colors cursor-pointer bg-transparent shrink-0"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!isCollapsed}
          onClick={onToggleCollapsed}
        >
          {isCollapsed ? COLLAPSE_ICON_CLOSED : COLLAPSE_ICON_OPEN}
        </button>
      </div>

      {/* Flat nav list */}
      <nav className="grid gap-1" aria-label="Main navigation">
        {/* Users — Admin & Manager only, listed first */}
        {showUsers && (
          <button
            type="button"
            title={isCollapsed ? 'Users' : undefined}
            className={`${NAV_BASE} ${sizeClass} ${activeKey === 'users' || onUsersPage ? NAV_ACTIVE : NAV_IDLE}`}
            onClick={() => onSelect('users')}
          >
            <span className="shrink-0">{USERS_ICON}</span>
            {!isCollapsed && <span>Users</span>}
          </button>
        )}

        {/* Entity items */}
        {RECORD_ENTITY_ITEMS.map((entity) => {
          const selected = entity.key === activeKey && activeKey !== 'users' && !onUsersPage;
          const icon = ENTITY_ICONS[entity.key];
          return (
            <button
              key={entity.key}
              type="button"
              role="tab"
              aria-selected={selected}
              title={isCollapsed ? entity.label : undefined}
              className={`${NAV_BASE} ${sizeClass} ${selected ? NAV_ACTIVE : NAV_IDLE}`}
              onClick={() => handleEntitySelect(entity.key)}
            >
              <span className="shrink-0">{icon}</span>
              {!isCollapsed && <span>{entity.label}</span>}
            </button>
          );
        })}

        {/* Audit Log — Administrator only */}
        {role === 'administrator' && (
          <>
            {!isCollapsed && (
              <div className="mt-2 mb-0.5 px-1">
                <span className="text-[10px] font-bold tracking-widest uppercase text-(--muted)">
                  Admin
                </span>
              </div>
            )}
            <button
              type="button"
              title={isCollapsed ? 'Audit Log' : undefined}
              className={`${NAV_BASE} ${sizeClass} ${
                activeKey === 'audit_log' && !onUsersPage ? NAV_ACTIVE : NAV_IDLE
              }`}
              onClick={() => onSelect('audit_log')}
            >
              <span className="shrink-0">{AUDIT_LOG_ICON}</span>
              {!isCollapsed && <span>Audit Log</span>}
            </button>
          </>
        )}
      </nav>
    </aside>
  );
}
