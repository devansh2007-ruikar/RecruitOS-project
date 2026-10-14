import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import ApplicationForm from "./application-form";

export const metadata: Metadata = {
  title: "Apply — Blockchain Students Chapter at RBU",
  description: "Submit your application to join the Technical, Design, or Events team.",
};

export default function ApplyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-text-primary)]">
      {/* Brand Header */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-3 group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] rounded-lg p-1"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg overflow-hidden bg-black border border-[var(--color-border)] flex items-center justify-center flex-shrink-0 group-hover:border-[var(--color-border-hover)] transition-colors">
              <Image
                src="/branding/blockchain-rbu.png"
                alt="Blockchain Students Chapter at RBU"
                width={40}
                height={40}
                priority
                className="object-contain w-full h-full"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm tracking-tight text-[var(--color-text-primary)]">
                Blockchain Students Chapter
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">
                RBU • Recruitment
              </span>
            </div>
          </Link>

          <Link
            href="/login"
            className="text-xs sm:text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors font-medium"
          >
            Coordinator Login &rarr;
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-xl">
          {/* Page Title & Back Link */}
          <div className="mb-8 space-y-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors mb-3"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Back to Home
            </Link>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--color-text-primary)]">
              Candidate Application
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              Complete the four steps below to submit your profile for consideration.
            </p>
          </div>

          {/* Form */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8 shadow-xl">
            <ApplicationForm />
          </div>
        </div>
      </main>
    </div>
  );
}
