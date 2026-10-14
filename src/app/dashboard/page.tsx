import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Application, ApplicationStatus } from "@/lib/types";
import { TEAMS, APPLICATION_STATUSES, STATUS_CONFIG } from "@/lib/types";
import { FilterSelect } from "./filter-select";
import { CandidateTable } from "./candidate-table";

export const metadata: Metadata = {
  title: "Candidates — RecruitOS Workspace",
  description: "Recruitment dashboard for chapter coordinators.",
};

async function DashboardContent({
  searchParams,
}: {
  searchParams: Promise<{ team?: string; status?: string; search?: string }>;
}) {
  await connection();
  const params = await searchParams;
  const supabase = await createClient();

  if (!supabase) {
    return null;
  }

  // Build query with filters
  let query = supabase
    .from("applications")
    .select("*")
    .order("created_at", { ascending: false });

  if (params.team && TEAMS.includes(params.team as (typeof TEAMS)[number])) {
    query = query.eq("team", params.team);
  }
  if (params.status && APPLICATION_STATUSES.includes(params.status as ApplicationStatus)) {
    query = query.eq("status", params.status);
  }
  if (params.search) {
    query = query.or(
      `name.ilike.%${params.search}%,email.ilike.%${params.search}%`
    );
  }

  const { data: applications, error } = await query;

  if (error) {
    return (
      <div className="p-6 rounded-xl border border-red-800 bg-red-950/60 text-red-200 shadow-lg">
        <p className="text-base font-semibold">
          Failed to load applications.
        </p>
        <p className="text-sm mt-1 text-red-300">
          Make sure your database connection is active and schema migrations have been applied.
        </p>
        <p className="text-xs text-red-400 mt-2 font-mono">
          {error.message}
        </p>
      </div>
    );
  }

  const candidates = (applications as Application[]) || [];

  // Status counts
  const counts: Record<string, number> = {};
  for (const app of candidates) {
    counts[app.status] = (counts[app.status] || 0) + 1;
  }

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[var(--color-border)]">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
              Candidate Pipeline
            </h1>
            <span className="px-2.5 py-0.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-xs font-mono text-[var(--color-accent)] font-semibold">
              {candidates.length} record{candidates.length !== 1 ? "s" : ""}
            </span>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Review applicant profiles, evaluate domain questions, and execute status transitions.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <form className="flex-1" method="GET">
          {params.team && <input type="hidden" name="team" value={params.team} />}
          {params.status && <input type="hidden" name="status" value={params.status} />}
          <div className="relative">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              name="search"
              type="text"
              defaultValue={params.search || ""}
              placeholder="Search candidate by name or email…"
              className="w-full min-h-[44px] pl-10 pr-4 rounded-lg border border-[var(--color-border)] text-sm
                bg-[var(--color-surface-raised)] text-[var(--color-text-primary)]
                placeholder:text-[var(--color-text-muted)]
                focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-colors"
            />
          </div>
        </form>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-2.5">
          <Suspense>
            <FilterSelect
              name="team"
              options={[
                { value: "", label: "All Teams" },
                ...TEAMS.map((t) => ({ value: t, label: `${t} Team` })),
              ]}
            />
            <FilterSelect
              name="status"
              options={[
                { value: "", label: "All Statuses" },
                ...APPLICATION_STATUSES.map((s) => ({
                  value: s,
                  label: `${STATUS_CONFIG[s].label}${counts[s] ? ` (${counts[s]})` : ""}`,
                })),
              ]}
            />
          </Suspense>
        </div>
      </div>

      {/* Interactive Candidate Table with Selection & Bulk Updates */}
      <CandidateTable candidates={candidates} />
    </div>
  );
}

export default function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string; status?: string; search?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="h-8 w-48 bg-[var(--color-surface)] border border-[var(--color-border)] rounded" />
          <div className="h-11 w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg" />
          <div className="h-64 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]" />
        </div>
      }
    >
      <DashboardContent searchParams={searchParams} />
    </Suspense>
  );
}

