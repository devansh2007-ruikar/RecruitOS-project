import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full text-center space-y-8">
        {/* Logo mark */}
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-xl bg-[var(--color-accent)] flex items-center justify-center">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            RecruitOS
          </h1>
          <p className="text-[var(--color-text-secondary)] text-lg leading-relaxed">
            Blockchain Students Chapter — RBU
          </p>
          <p className="text-[var(--color-text-muted)] text-sm">
            Join our Technical, Design, or Events team.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/apply"
            className="inline-flex items-center justify-center h-11 px-6 rounded-lg
              bg-[var(--color-accent)] text-white font-medium text-sm
              hover:bg-[var(--color-accent-hover)] transition-colors
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]
              w-full sm:w-auto"
          >
            Apply Now
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center h-11 px-6 rounded-lg
              border border-[var(--color-border)] text-[var(--color-text-secondary)]
              font-medium text-sm hover:bg-[var(--color-accent-light)]
              hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]
              transition-colors w-full sm:w-auto"
          >
            Coordinator Login
          </Link>
        </div>
      </div>
    </main>
  );
}
