import { Suspense } from "react";
import { connection } from "next/server";
import Image from "next/image";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { logoutAction } from "@/app/login/actions";

function SupabaseNotConfigured() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--color-bg)]">
      <div className="max-w-lg w-full p-8 rounded-xl border border-amber-800/80 bg-amber-950/40 text-left space-y-4 shadow-xl">
        <div className="flex items-center gap-2.5 text-amber-200">
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
        <p className="text-sm text-amber-300 leading-relaxed">
          The coordinator dashboard requires a connected Supabase project for PostgreSQL persistence and coordinator authentication.
        </p>
        <div className="space-y-2 text-xs text-amber-200">
          <p className="font-semibold uppercase tracking-wider font-mono">Required Setup Steps:</p>
          <ol className="list-decimal list-inside space-y-1.5 pl-1 leading-relaxed text-amber-300">
            <li>
              Create a project at{" "}
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="underline font-semibold text-amber-100"
              >
                supabase.com
              </a>
            </li>
            <li>
              Configure <code className="bg-amber-900/60 px-1.5 py-0.5 rounded font-mono">.env.local</code>:
              <div className="mt-1.5 p-2.5 rounded bg-amber-950/80 font-mono text-[11px] space-y-1 text-amber-300 border border-amber-800/60">
                <div>NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co</div>
                <div>NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]</div>
                <div>SUPABASE_SERVICE_ROLE_KEY=[service-role-key]</div>
              </div>
            </li>
            <li>
              Execute schema migrations in the Supabase SQL Editor.
            </li>
            <li>
              Add a coordinator in Supabase Authentication &rarr; Users.
            </li>
          </ol>
        </div>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-lg bg-[var(--color-accent)] text-[var(--color-accent-fg)] text-xs font-semibold hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            Back to Chapter Home
          </Link>
        </div>
      </div>
    </div>
  );
}

function DashboardLayoutSkeleton() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)] animate-pulse">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)]" />
            <div className="h-4 w-28 bg-[var(--color-border)] rounded" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-4 w-36 bg-[var(--color-border)] rounded hidden sm:inline-block" />
            <div className="h-9 w-20 bg-[var(--color-border)] rounded" />
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="h-8 w-48 bg-[var(--color-surface)] border border-[var(--color-border)] rounded" />
        <div className="h-64 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]" />
      </main>
    </div>
  );
}

async function DashboardAuthGate({
  children,
}: {
  children: React.ReactNode;
}) {
  // Defer request-dependent auth check and time-dependent values (e.g. JWT Date.now()) to request time
  await connection();

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
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--color-bg)]">
        <div className="max-w-md w-full p-8 rounded-xl border border-red-800 bg-red-950/40 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 mx-auto rounded-full bg-red-900/60 border border-red-700 flex items-center justify-center text-red-300">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-red-200 tracking-tight">
            Coordinator Access Required
          </h2>
          <p className="text-sm text-red-300 leading-relaxed">
            Account <strong className="text-red-100">{user.email}</strong> is authenticated with Supabase, but is not authorized in the coordinator registry. Only registered chapter coordinators can view candidate records and manage applications.
          </p>
          <div className="pt-2 flex justify-center">
            <form action={logoutAction}>
              <button
                type="submit"
                className="min-h-[44px] px-5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
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
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-text-primary)]">
      {/* Top bar with Chapter Brand Identity */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] rounded-lg p-1"
            >
              <div className="w-9 h-9 rounded-lg overflow-hidden bg-black border border-[var(--color-border)] flex items-center justify-center flex-shrink-0 group-hover:border-[var(--color-border-hover)] transition-colors">
                <Image
                  src="/branding/blockchain-rbu.png"
                  alt="Blockchain Students Chapter at RBU"
                  width={36}
                  height={36}
                  priority
                  className="object-contain w-full h-full"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-sm tracking-tight text-[var(--color-text-primary)]">
                  RecruitOS
                </span>
                <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
                  Blockchain RBU • Workspace
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono px-2.5 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] hidden sm:inline-block">
              {user.email}
            </span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="min-h-[36px] px-3.5 rounded-lg border border-[var(--color-border)] text-xs font-medium
                  text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
                  hover:bg-[var(--color-surface-raised)] hover:border-[var(--color-border-hover)]
                  transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured()) {
    return <SupabaseNotConfigured />;
  }

  return (
    <Suspense fallback={<DashboardLayoutSkeleton />}>
      <DashboardAuthGate>
        {children}
      </DashboardAuthGate>
    </Suspense>
  );
}

