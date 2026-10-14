import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import LoginForm from "./login-form";

export const metadata: Metadata = {
  title: "Coordinator Login — RecruitOS",
  description: "Sign in to the RecruitOS coordinator dashboard.",
};

async function LoginFormWrapper({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;
  return <LoginForm redirectTo={redirect} />;
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  return (
    <main className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]
              hover:text-[var(--color-text-secondary)] transition-colors mb-6"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">
            Coordinator Login
          </h1>
          <p className="text-[var(--color-text-secondary)] text-sm mt-1">
            Sign in to access the recruitment dashboard.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="h-44 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] animate-pulse" />
          }
        >
          <LoginFormWrapper searchParams={searchParams} />
        </Suspense>

        <p className="text-xs text-[var(--color-text-muted)] mt-6 text-center">
          Coordinator accounts are created by project administrators.
          <br />
          Self-registration is not available.
        </p>
      </div>
    </main>
  );
}
