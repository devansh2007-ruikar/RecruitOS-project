"use client";

import { useState } from "react";
import { loginAction } from "./actions";

export default function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    if (redirectTo) {
      formData.set("redirect", redirectTo);
    }

    try {
      const result = await loginAction(formData);
      if (result?.error) {
        setError(result.error);
      }
    } catch {
      // redirect() throws a NEXT_REDIRECT error — this is expected
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div
          className="p-3 rounded-lg border bg-red-50 border-red-200 text-red-800
            dark:bg-red-950 dark:border-red-800 dark:text-red-200 text-sm"
          role="alert"
        >
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1.5">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="coordinator@rbu.edu"
          className="w-full h-10 px-3 rounded-lg border border-[var(--color-border)] text-sm
            bg-[var(--color-surface)] text-[var(--color-text-primary)]
            placeholder:text-[var(--color-text-muted)]
            focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-1.5">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="w-full h-10 px-3 rounded-lg border border-[var(--color-border)] text-sm
            bg-[var(--color-surface)] text-[var(--color-text-primary)]
            placeholder:text-[var(--color-text-muted)]
            focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full h-10 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium
          hover:bg-[var(--color-accent-hover)] transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
          inline-flex items-center justify-center gap-2"
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {loading ? "Signing in…" : "Sign In"}
      </button>
    </form>
  );
}
