import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { logoutAction } from "@/app/login/actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center p-6 bg-[var(--color-bg)]">
        <div className="max-w-lg w-full p-8 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-700/60 text-left space-y-4">
          <div className="flex items-center gap-2.5 text-amber-900 dark:text-amber-200">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <h2 className="text-base font-semibold">Supabase Configuration Required</h2>
          </div>
          <p className="text-sm text-amber-800 dark:text-amber-300">
            The coordinator dashboard requires a connected Supabase project for PostgreSQL persistence and coordinator authentication.
          </p>
          <div className="space-y-2 text-xs text-amber-900 dark:text-amber-200">
            <p className="font-semibold uppercase tracking-wider">Required Setup Steps:</p>
            <ol className="list-decimal list-inside space-y-1.5 pl-1 leading-relaxed">
              <li>
                Create a project at{" "}
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-semibold"
                >
                  supabase.com
                </a>
              </li>
              <li>
                Fill in credentials in <code className="bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 rounded font-mono">.env.local</code>:
                <div className="mt-1.5 p-2.5 rounded bg-amber-100/90 dark:bg-amber-900/40 font-mono text-[11px] space-y-1">
                  <div>NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co</div>
                  <div>NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]</div>
                  <div>SUPABASE_SERVICE_ROLE_KEY=[service-role-key]</div>
                </div>
              </li>
              <li>
                Execute migration: run SQL from{" "}
                <code className="bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 rounded font-mono">supabase/migrations/001_initial_schema.sql</code> in the SQL Editor
              </li>
              <li>
                Add a coordinator in Supabase (Authentication &rarr; Users &rarr; Add User)
              </li>
            </ol>
          </div>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center h-9 px-4 rounded-lg bg-[var(--color-accent)] text-white text-xs font-medium hover:bg-[var(--color-accent-hover)] transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  if (!supabase) {
    redirect("/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Verify explicit coordinator authorization in database
  const { data: isCoordinator } = await supabase.rpc("is_coordinator", {
    p_user_id: user.id,
  });

  if (!isCoordinator) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center p-6 bg-[var(--color-bg)]">
        <div className="max-w-md w-full p-8 rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/40 dark:border-red-800 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-red-100 dark:bg-red-900/60 flex items-center justify-center text-red-600 dark:text-red-300">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-red-900 dark:text-red-200">
            Coordinator Access Required
          </h2>
          <p className="text-sm text-red-700 dark:text-red-300">
            Account <strong>{user.email}</strong> is not registered as an authorized coordinator.
            Only chapter coordinators can view candidate records and manage applications.
          </p>
          <div className="pt-2 flex justify-center">
            <form action={logoutAction}>
              <button
                type="submit"
                className="h-9 px-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-medium hover:bg-[var(--color-bg)] transition-colors"
              >
                Sign In with Another Account
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col">
      {/* Top bar */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-sm font-semibold"
            >
              <div className="w-7 h-7 rounded-md bg-[var(--color-accent)] flex items-center justify-center">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              RecruitOS
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--color-text-muted)] hidden sm:inline">
              {user.email}
            </span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="h-8 px-3 rounded-md border border-[var(--color-border)] text-xs font-medium
                  text-[var(--color-text-secondary)] hover:bg-[var(--color-accent-light)]
                  hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]
                  transition-colors"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}
