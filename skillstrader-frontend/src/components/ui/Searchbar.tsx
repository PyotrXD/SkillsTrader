import { Icon } from "@iconify/react";

interface SearchbarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function Searchbar({ value, onChange, placeholder = "Search...", className = "" }: SearchbarProps) {
  return (
    <div className={`relative w-full ${className}`}>
      <input
        type="text"
        className="w-full border border-(--border) bg-white text-(--text) rounded-md px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--primary) pr-10"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
        <Icon icon="iconamoon:search-light" width="20" height="20" />
      </span>
    </div>
  );
}
