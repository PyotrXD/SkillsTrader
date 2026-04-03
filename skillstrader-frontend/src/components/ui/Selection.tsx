import type { ReactNode } from 'react';

interface Option {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

interface SelectionProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  className?: string;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}

export default function Selection({
  value,
  onChange,
  options,
  className = '',
  label,
  placeholder = 'Select...',
  disabled = false,
  required = false,
}: SelectionProps) {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <span className="block mb-1 text-sm font-bold text-(--muted)">{label}</span>
      )}
      <div className={`relative w-full`}>
        <select
          className="w-full appearance-none border border-(--border) bg-white text-(--text) rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--primary) transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          required={required}
        >
          {placeholder && (
            <option value="" disabled hidden>{placeholder}</option>
          )}
          {options.map(opt => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>{opt.label}</option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </span>
      </div>
    </div>
  );
}
