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
    <select
      value={currentValue}
      onChange={handleChange}
      className="h-9 px-3 pr-8 rounded-lg border border-[var(--color-border)] text-sm
        bg-[var(--color-surface)] text-[var(--color-text-primary)]
        focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent
        appearance-none cursor-pointer"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
