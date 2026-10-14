"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface FilterSelectProps {
  name: string;
  options: { value: string; label: string }[];
}

export function FilterSelect({ name, options }: FilterSelectProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentValue = searchParams.get(name) || "";

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) {
      params.set(name, e.target.value);
    } else {
      params.delete(name);
    }
    const qs = params.toString();
    router.push(`/dashboard${qs ? `?${qs}` : ""}`);
  }

  return (
    <div className="relative inline-block">
      <select
        value={currentValue}
        onChange={handleChange}
        aria-label={`Filter by ${name}`}
        className="min-h-[44px] pl-3.5 pr-9 rounded-lg border border-[var(--color-border)] text-sm font-medium
          bg-[var(--color-surface-raised)] text-[var(--color-text-primary)]
          focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent
          appearance-none cursor-pointer hover:border-[var(--color-border-hover)] transition-colors"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[var(--color-surface)] text-[var(--color-text-primary)]">
            {opt.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-[var(--color-text-muted)]" aria-hidden="true">
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </div>
    </div>
  );
}
