import { useState, useRef, useEffect } from "react";
import { Icon } from "@iconify/react";

interface PositionOption {
  id: string;
  industry: string;
  title: string;
}

interface IndustryPositionPickerProps {
  positions: PositionOption[];
  value: string; // selected position title
  onChange: (positionTitle: string) => void;
  loading?: boolean;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export default function IndustryPositionPicker({
  positions,
  value,
  onChange,
  loading = false,
  placeholder = "Select a position...",
  required = false,
  className = "",
}: IndustryPositionPickerProps) {
  const [open, setOpen] = useState(false);
  const [hoveredIndustry, setHoveredIndustry] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Unique sorted industries
  const industries = Array.from(new Set(positions.map((p) => p.industry)))
    .filter(Boolean)
    .sort();

  // Positions for the hovered industry
  const positionsForIndustry = positions.filter(
    (p) => p.industry === hoveredIndustry
  );

  // Auto-hover the first industry when opening
  useEffect(() => {
    if (open && industries.length > 0 && !hoveredIndustry) {
      setHoveredIndustry(industries[0]);
    }
    if (!open) {
      setHoveredIndustry(null);
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handleSelect(title: string) {
    onChange(title);
    setOpen(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("");
    setOpen(false);
  }

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 border rounded-md px-3 py-2.5 text-sm bg-white text-(--text) outline-none transition-all
          ${open ? "border-(--primary) ring-2 ring-(--primary)/20" : "border-(--border)"}
          ${required && !value ? "" : ""}
        `}
      >
        <span className={value ? "text-(--text) font-medium" : "text-(--muted)"}>
          {loading ? "Loading positions..." : (value || placeholder)}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          {value && !loading && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => e.key === "Enter" && handleClear(e as any)}
              className="text-(--muted) hover:text-red-500 transition-colors cursor-pointer"
              title="Clear selection"
            >
              <Icon icon="tabler:x" width="14" height="14" />
            </span>
          )}
          <Icon
            icon="mdi:chevron-down"
            width="18"
            height="18"
            className={`text-(--muted) transition-transform ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {/* Dropdown panel - Binago ang w-full sa w-max */}
        {open && !loading && (
        <div className="absolute z-50 mt-1 w-max min-w-full bg-white border border-(--border) rounded-md shadow-lg overflow-hidden flex">

            {/* Left pane — Industries */}
            <div className="w-48 border-r border-(--border) bg-(--surface) shrink-0"> {/* Ginawang w-48 mula w-44 */}
            {industries.length === 0 ? (
                <div className="px-3 py-4 text-sm text-(--muted) text-center">
                No industries yet
                </div>
            ) : (
                <ul className="max-h-64 overflow-y-auto py-1">
                {industries.map((ind) => (
                    <li
                    key={ind}
                    onMouseEnter={() => setHoveredIndustry(ind)}
                    onClick={() => setHoveredIndustry(ind)}
                    className={`flex items-start justify-between gap-3 px-3 py-2.5 cursor-pointer text-sm select-none transition-colors
                        ${hoveredIndustry === ind
                        ? "bg-(--primary) text-white font-semibold"
                        : "text-(--text) hover:bg-(--surface2)"
                        }`}
                    >
                    {/* TINANGGAL ANG TRUNCATE DITO */}
                    <span className="whitespace-normal leading-tight flex-1">{ind}</span>
                    <Icon icon="mdi:chevron-right" width="14" height="14" className="shrink-0 mt-0.5 opacity-60" />
                    </li>
                ))}
                </ul>
            )}
            </div>

            {/* Right pane — Positions */}
            <div className="min-w-[200px] flex-1"> {/* Nilagyan ng specific min-w */}
            {!hoveredIndustry ? (
                <div className="px-3 py-4 text-sm text-(--muted) text-center">
                Hover an industry
                </div>
            ) : (
                <ul className="max-h-64 overflow-y-auto py-1">
                {positionsForIndustry.map((p) => {
                    const isSelected = value === p.title;
                    return (
                    <li
                        key={p.id}
                        onClick={() => handleSelect(p.title)}
                        className={`flex items-start justify-between gap-3 px-4 py-2.5 cursor-pointer text-sm select-none transition-colors border-b border-(--border)/50 last:border-b-0
                        ${isSelected
                            ? "bg-(--primary) text-white font-semibold"
                            : "text-(--text) hover:bg-(--surface2)"
                        }`}
                    >
                        {/* SIGURADUHING NAKA WHITESPACE-NORMAL */}
                        <span className="whitespace-normal leading-tight flex-1">{p.title}</span>
                        {isSelected && (
                        <Icon icon="tabler:check" width="14" height="14" className="shrink-0 mt-0.5" />
                        )}
                    </li>
                    );
                })}
                </ul>
            )}
            </div>
        </div>
        )}
    </div>
  );
}