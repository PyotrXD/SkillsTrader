import { RECORD_ENTITY_ITEMS } from '../../pages/RecordsWorkspace';

type Props = {
  activeKey: string;
  isCollapsed: boolean;
  onSelect: (key: string) => void;
  onToggleCollapsed: () => void;
};

export default function DashboardEntitySidebar({
  activeKey,
  isCollapsed,
  onSelect,
  onToggleCollapsed,
}: Props) {
  return (
    <aside className={`dashEntitySidebar ${isCollapsed ? 'dashEntitySidebarCollapsed' : ''}`}>
      <button
        type="button"
        className="dashButton dashEntityCollapseButton"
        aria-label={isCollapsed ? 'Expand records menu' : 'Collapse records menu'}
        aria-expanded={!isCollapsed}
        onClick={onToggleCollapsed}
      >
        {isCollapsed ? '>>' : '<<'}
      </button>

      <div className="dashEntityTabs" role="tablist" aria-label="Core entities">
        {RECORD_ENTITY_ITEMS.map((entity) => {
          const selected = entity.key === activeKey;
          return (
            <button
              key={entity.key}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`dashEntityTab ${selected ? 'dashEntityTabActive' : ''}`}
              onClick={() => onSelect(entity.key)}
            >
              {isCollapsed ? entity.label.slice(0, 1) : entity.label}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
