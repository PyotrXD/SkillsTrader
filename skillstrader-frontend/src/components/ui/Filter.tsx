import Selection from "./Selection";

interface Option {
  value: string;
  label: string;
}

interface FilterProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
}

export default function Filter({ value, onChange, options, placeholder = "Filter...", className = "" }: FilterProps) {
  return (
    <div className={`relative w-full ${className}`}>
      <Selection
        value={value}
        onChange={onChange}
        options={options}
        placeholder={placeholder}
        className="w-full rounded-md"
      />
    </div>
  );
}
