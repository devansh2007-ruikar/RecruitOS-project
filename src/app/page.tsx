import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-text-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-3.5 group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] rounded-lg p-1"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg overflow-hidden bg-black border border-[var(--color-border)] flex items-center justify-center flex-shrink-0 group-hover:border-[var(--color-border-hover)] transition-colors">
              <Image
                src="/branding/blockchain-rbu.png"
                alt="Blockchain Students Chapter at RBU"
                width={44}
                height={44}
                priority
                className="object-contain w-full h-full"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm sm:text-base tracking-tight leading-tight text-[var(--color-text-primary)]">
                Blockchain Students Chapter
              </span>
              <span className="text-xs text-[var(--color-text-muted)] tracking-wider">
                RBU • RecruitOS
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center min-h-[44px] px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-surface-raised)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
            >
              Coordinator Login
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-[var(--color-border)] py-16 sm:py-24 lg:py-28">
          {/* Subtle geometric line pattern (non-interactive decoration) */}
          <div
            className="absolute inset-0 pointer-events-none select-none overflow-hidden opacity-35"
            aria-hidden="true"
          >
            <svg
              className="absolute -right-20 -top-20 w-[600px] h-[600px] sm:w-[800px] sm:h-[800px] text-[var(--color-accent)]"
              viewBox="0 0 800 800"
              fill="none"
            >
              <defs>
                <linearGradient id="hero-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.05" />
                </linearGradient>
              </defs>
              <circle cx="400" cy="400" r="320" stroke="url(#hero-grad)" strokeWidth="1" strokeDasharray="4 8" />
              <circle cx="400" cy="400" r="240" stroke="url(#hero-grad)" strokeWidth="1" />
              <circle cx="400" cy="400" r="160" stroke="url(#hero-grad)" strokeWidth="1" strokeDasharray="2 6" />
              <polygon points="400,160 628,326 541,594 259,594 172,326" stroke="#22D3EE" strokeWidth="1" strokeOpacity="0.3" fill="none" />
              <line x1="400" y1="160" x2="400" y2="400" stroke="#3B82F6" strokeWidth="1" strokeOpacity="0.4" />
              <line x1="628" y1="326" x2="400" y2="400" stroke="#3B82F6" strokeWidth="1" strokeOpacity="0.4" />
              <line x1="541" y1="594" x2="400" y2="400" stroke="#3B82F6" strokeWidth="1" strokeOpacity="0.4" />
              <line x1="259" y1="594" x2="400" y2="400" stroke="#3B82F6" strokeWidth="1" strokeOpacity="0.4" />
              <line x1="172" y1="326" x2="400" y2="400" stroke="#3B82F6" strokeWidth="1" strokeOpacity="0.4" />
            </svg>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              {/* Left Column: Asymmetric text */}
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-secondary)]">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse" />
                  <span>Connected people. Structured recruitment.</span>
                </div>

                <div className="space-y-4">
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-[var(--color-text-primary)] leading-[1.1]">
                    Build what comes next.
                  </h1>
                  <p className="text-base sm:text-lg text-[var(--color-text-secondary)] leading-relaxed max-w-xl">
                    Apply to the Blockchain Students Chapter at RBU. Find your place in Technical, Design, or Events.
                  </p>
                </div>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
                  <Link
                    href="/apply"
                    className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 rounded-lg bg-[var(--color-accent)] text-[var(--color-accent-fg)] font-semibold text-base hover:bg-[var(--color-accent-hover)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] shadow-sm"
                  >
                    Start application
                    <svg
                      className="ml-2 w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center min-h-[44px] px-5 py-3 rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-surface-raised)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
                  >
                    Coordinator sign-in
                  </Link>
                </div>

                {/* Scope Note */}
                <p className="text-xs text-[var(--color-text-muted)] pt-2">
                  RecruitOS technical assignment prototype for the RBU student chapter recruitment cycle.
                </p>
              </div>

              {/* Right Column: Editorial brand display & geometric frame */}
              <div className="lg:col-span-5 flex justify-center lg:justify-end">
                <div className="w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-6 relative shadow-2xl">
                  {/* Subtle corner geometry */}
                  <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
                    <span className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-mono">
                      CHAPTER_IDENTITY
                    </span>
                    <span className="text-xs font-mono text-[var(--color-accent)]">
                      RBU::COHORT_2026
                    </span>
                  </div>

                  {/* Chapter brand asset faithfully presented */}
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-black border border-[var(--color-border)] flex items-center justify-center p-4">
                    <Image
                      src="/branding/blockchain-rbu.png"
                      alt="Blockchain Students Chapter at RBU Official Logo"
                      width={320}
                      height={320}
                      priority
                      className="object-contain w-full h-full"
                    />
                  </div>

                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                      <span>Available Domains</span>
                      <span className="text-[var(--color-text-primary)] font-medium">3 Specialized Teams</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                      <span>Evaluation Workflow</span>
                      <span className="text-[var(--color-text-primary)] font-medium">4-Stage Review</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Three Teams */}
        <section className="py-16 sm:py-20 border-b border-[var(--color-border)] bg-[var(--color-surface)]/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="max-w-2xl space-y-3">
              <span className="text-xs font-mono uppercase tracking-wider text-[var(--color-accent)]">
                DISCIPLINES
              </span>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--color-text-primary)]">
                Three teams. One connected mission.
              </h2>
              <p className="text-sm sm:text-base text-[var(--color-text-secondary)] leading-relaxed">
                Choose the domain where your skills, curiosity, and drive create the most impact. Every application is reviewed directly by domain coordinators.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Technical */}
              <div className="p-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-4 hover:border-[var(--color-border-hover)] transition-colors">
                <div className="w-10 h-10 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-accent)]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                  </svg>
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Technical</h3>
                  <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                    Protocols, smart contracts, Web3 tooling, and full-stack software development. Hands-on coding and technical research.
                  </p>
                </div>
                <div className="pt-2 border-t border-[var(--color-border)]">
                  <span className="text-xs text-[var(--color-text-muted)] font-mono">
                    Focus: Systems • Web3 • Architecture
                  </span>
                </div>
              </div>

              {/* Design */}
              <div className="p-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-4 hover:border-[var(--color-border-hover)] transition-colors">
                <div className="w-10 h-10 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-accent)]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                    <polyline points="2 17 12 22 22 17" />
                    <polyline points="2 12 12 17 22 12" />
                  </svg>
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Design</h3>
                  <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                    User experience, product interfaces, brand systems, technical illustrations, and interactive media communicating complex concepts.
                  </p>
                </div>
                <div className="pt-2 border-t border-[var(--color-border)]">
                  <span className="text-xs text-[var(--color-text-muted)] font-mono">
                    Focus: UI/UX • Systems • Visual Identity
                  </span>
                </div>
              </div>

              {/* Events */}
              <div className="p-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-4 hover:border-[var(--color-border-hover)] transition-colors">
                <div className="w-10 h-10 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-accent)]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Events</h3>
                  <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                    Hackathons, technical workshops, keynote sessions, university partnerships, and chapter operations connecting our community.
                  </p>
                </div>
                <div className="pt-2 border-t border-[var(--color-border)]">
                  <span className="text-xs text-[var(--color-text-muted)] font-mono">
                    Focus: Hackathons • Logistics • Community
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Structured Recruitment Process */}
        <section className="py-16 sm:py-20 border-b border-[var(--color-border)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="max-w-2xl space-y-3">
              <span className="text-xs font-mono uppercase tracking-wider text-[var(--color-accent)]">
                PIPELINE
              </span>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--color-text-primary)]">
                From application to cohort onboarding
              </h2>
              <p className="text-sm sm:text-base text-[var(--color-text-secondary)] leading-relaxed">
                A structured four-step intake process ensuring fair review and clear progression for every candidate.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Step 1 */}
              <div className="p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-3">
                <span className="text-xs font-mono text-[var(--color-accent)] font-semibold">01 / APPLY</span>
                <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Candidate Submission</h3>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  Submit personal details, select your preferred team, and answer targeted domain questions.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-3">
                <span className="text-xs font-mono text-[var(--color-accent)] font-semibold">02 / REVIEW</span>
                <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Coordinator Review</h3>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  Authorized coordinators evaluate applications and advance qualified submissions to Shortlisted.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-3">
                <span className="text-xs font-mono text-[var(--color-accent)] font-semibold">03 / INTERVIEW</span>
                <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Interview Stage</h3>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  Shortlisted candidates participate in an interactive conversation with chapter leads.
                </p>
              </div>

              {/* Step 4 */}
              <div className="p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-3">
                <span className="text-xs font-mono text-[var(--color-accent)] font-semibold">04 / DECISION</span>
                <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Final Cohort</h3>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  Selected candidates are inducted into the active Blockchain Students Chapter cohort.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)] py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-sm text-[var(--color-text-secondary)]">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded overflow-hidden bg-black border border-[var(--color-border)] flex items-center justify-center flex-shrink-0">
              <Image
                src="/branding/blockchain-rbu.png"
                alt="Logo"
                width={28}
                height={28}
                className="object-contain"
              />
            </div>
            <span>Blockchain Students Chapter at RBU</span>
          </div>

          <div className="flex items-center gap-6 text-xs text-[var(--color-text-muted)]">
            <Link href="/apply" className="hover:text-[var(--color-text-primary)] transition-colors">
              Apply
            </Link>
            <Link href="/login" className="hover:text-[var(--color-text-primary)] transition-colors">
              Coordinator Login
            </Link>
            <Link href="/dashboard" className="hover:text-[var(--color-text-primary)] transition-colors">
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

