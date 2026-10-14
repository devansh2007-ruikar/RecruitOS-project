import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Application, StatusHistoryEntry, Team } from "@/lib/types";
import { TEAM_QUESTIONS, STATUS_CONFIG } from "@/lib/types";
import { StatusBadge, StatusActions } from "@/app/dashboard/status-components";

export const metadata: Metadata = {
  title: "Candidate Profile — RecruitOS",
  description: "Candidate application profile and status workflow.",
};

async function CandidateDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  if (!supabase) {
    notFound();
  }

  // Fetch application
  const { data: application, error } = await supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !application) {
    notFound();
  }

  const app = application as Application;

  // Fetch status history
  const { data: history } = await supabase
    .from("status_history")
    .select("*")
    .eq("application_id", id)
    .order("created_at", { ascending: false });

  const statusHistory = (history as StatusHistoryEntry[]) || [];

  // Get team questions for display
  const teamQuestions = TEAM_QUESTIONS[app.team as Team] || [];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]
          hover:text-[var(--color-text-secondary)] transition-colors"
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
        All Candidates
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{app.name}</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
            {app.email}
          </p>
        </div>
        <StatusBadge status={app.status} />
      </div>

      {/* Status actions */}
      <div className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
        <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
          Status Actions
        </p>
        <StatusActions applicationId={app.id} currentStatus={app.status} />
        {(!STATUS_CONFIG[app.status] ||
          app.status === "selected" ||
          app.status === "rejected") && (
          <p className="text-xs text-[var(--color-text-muted)] mt-2">
            This application is in a terminal state. No further transitions available.
          </p>
        )}
      </div>

      {/* Personal details */}
      <section className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] space-y-3">
        <h2 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
          Personal Details
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <DetailField label="Branch" value={app.branch} />
          <DetailField label="Year" value={String(app.year)} />
          <DetailField label="Team" value={app.team} />
          <DetailField
            label="Applied"
            value={new Date(app.created_at).toLocaleString("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          />
        </div>
      </section>

      {/* Team-specific answers */}
      {teamQuestions.length > 0 && (
        <section className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] space-y-3">
          <h2 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
            {app.team} Team Responses
          </h2>
          <div className="space-y-4">
            {teamQuestions.map((q) => (
              <div key={q.id}>
                <p className="text-xs font-medium text-[var(--color-text-muted)] mb-1">
                  {q.label}
                </p>
                <p className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap">
                  {app.answers[q.id] || "—"}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Status history / audit trail */}
      <section className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] space-y-3">
        <h2 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
          Status History
        </h2>
        {statusHistory.length === 0 ? (
          <p className="text-xs text-[var(--color-text-muted)]">
            No status changes recorded yet.
          </p>
        ) : (
          <div className="space-y-2">
            {statusHistory.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 text-xs py-1.5"
              >
                <span className="text-[var(--color-text-muted)] flex-shrink-0 w-32">
                  {new Date(entry.created_at).toLocaleString("en-IN", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
                <span className="text-[var(--color-text-secondary)]">
                  {entry.previous_status ? (
                    <>
                      <StatusBadge status={entry.previous_status} />
                      <span className="mx-1.5">→</span>
                    </>
                  ) : null}
                  <StatusBadge status={entry.new_status} />
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 max-w-3xl">
          <div className="h-6 w-32 bg-[var(--color-surface)] border border-[var(--color-border)] rounded animate-pulse" />
          <div className="h-48 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] animate-pulse" />
        </div>
      }
    >
      <CandidateDetailContent params={params} />
    </Suspense>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
