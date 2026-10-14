import type { Metadata } from "next";
import Link from "next/link";
import ApplicationForm from "./application-form";

export const metadata: Metadata = {
  title: "Apply — RecruitOS",
  description: "Submit your application to join the Blockchain Students Chapter at RBU.",
};

export default function ApplyPage() {
  return (
    <main className="flex-1 flex flex-col items-center px-4 py-10 sm:py-16">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]
              hover:text-[var(--color-text-secondary)] transition-colors mb-6"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">
            Apply to Join
          </h1>
          <p className="text-[var(--color-text-secondary)] text-sm mt-1">
            Blockchain Students Chapter — RBU
          </p>
        </div>

        {/* Form */}
        <ApplicationForm />
      </div>
    </main>
  );
}
