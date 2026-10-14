import type { Metadata } from "next";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Application, ApplicationStatus } from "@/lib/types";
import { TEAMS, APPLICATION_STATUSES, STATUS_CONFIG } from "@/lib/types";
import { FilterSelect } from "./filter-select";
import { CandidateTable } from "./candidate-table";

export const metadata: Metadata = {
  title: "Dashboard — RecruitOS",
  description: "Recruitment dashboard for coordinators.",
};

async function DashboardContent({
  searchParams,
}: {
  searchParams: Promise<{ team?: string; status?: string; search?: string }>;
}) {
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
      <div className="p-6 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
        <p className="text-sm text-red-800 dark:text-red-200">
          Failed to load applications. Make sure your database is set up and the
          migration has been run.
        </p>
        <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-mono">
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
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Candidates</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
          {candidates.length} application{candidates.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <form className="flex-1" method="GET">
          {params.team && <input type="hidden" name="team" value={params.team} />}
          {params.status && <input type="hidden" name="status" value={params.status} />}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
              width="16"
              height="16"
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
              placeholder="Search by name or email…"
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-[var(--color-border)] text-sm
                bg-[var(--color-surface)] text-[var(--color-text-primary)]
                placeholder:text-[var(--color-text-muted)]
                focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
            />
          </div>
        </form>

        <Suspense>
          <FilterSelect
            name="team"
            options={[
              { value: "", label: "All Teams" },
              ...TEAMS.map((t) => ({ value: t, label: t })),
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
        <div className="space-y-4">
          <div className="h-8 w-40 bg-[var(--color-surface)] border border-[var(--color-border)] rounded animate-pulse" />
          <div className="h-64 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] animate-pulse" />
        </div>
      }
    >
      <DashboardContent searchParams={searchParams} />
    </Suspense>
  );
}
