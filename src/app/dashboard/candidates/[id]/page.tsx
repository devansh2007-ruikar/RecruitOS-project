import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
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
  await connection();
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
        className="inline-flex items-center gap-2 min-h-[44px] px-3 -ml-3 text-sm font-medium text-[var(--color-text-secondary)]
          hover:text-[var(--color-cyan)] rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
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
          aria-hidden="true"
        >
          <path d="M19 12H5" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back to Candidate Directory
      </Link>

      {/* Header */}
      <div className="p-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-[var(--color-cyan)]/5 to-transparent pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[var(--color-canvas)] text-[var(--color-cyan)] border border-[var(--color-cyan)]/20">
                {app.team.toUpperCase()}
              </span>
              <span className="text-xs text-[var(--color-text-muted)] font-mono">
                ID: {app.id.slice(0, 8)}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
              {app.name}
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              {app.email}
            </p>
          </div>
          <div className="self-start">
            <StatusBadge status={app.status} />
          </div>
        </div>
      </div>

      {/* Status actions */}
      <div className="p-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--color-border)]">
          <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider font-mono">
            Pipeline Transition Actions
          </p>
          <span className="text-xs text-[var(--color-text-muted)] font-mono">
            Current: {app.status}
          </span>
        </div>
        <StatusActions applicationId={app.id} currentStatus={app.status} />
        {(!STATUS_CONFIG[app.status] ||
          app.status === "selected" ||
          app.status === "rejected") && (
          <p className="text-xs text-[var(--color-text-muted)] mt-3 pt-2 border-t border-[var(--color-border)]/50">
            This candidate is in a terminal pipeline state ({app.status}). No further transitions are available.
          </p>
        )}
      </div>

      {/* Personal details */}
      <section className="p-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-4">
        <h2 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider font-mono pb-2 border-b border-[var(--color-border)]">
          Application Details
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-sm">
          <DetailField label="Candidate Name" value={app.name} />
          <DetailField label="Academic Branch" value={app.branch} />
          <DetailField label="Academic Year" value={`Year ${app.year}`} />
          <DetailField label="Applied Team Preference" value={`${app.team} Team`} />
          <DetailField
            label="Submitted At"
            value={new Date(app.created_at).toLocaleString("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          />
          <DetailField label="Email Address" value={app.email} />
        </div>
      </section>

      {/* Team-specific answers */}
      {teamQuestions.length > 0 && (
        <section className="p-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-4">
          <h2 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider font-mono pb-2 border-b border-[var(--color-border)]">
            {app.team} Team Questionnaire Responses
          </h2>
          <div className="space-y-4">
            {teamQuestions.map((q) => (
              <div
                key={q.id}
                className="p-4 rounded-lg bg-[var(--color-canvas)]/70 border border-[var(--color-border)] space-y-2"
              >
                <p className="text-xs font-semibold text-[var(--color-cyan)] uppercase tracking-wider">
                  {q.label}
                </p>
                <p className="text-sm text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap">
                  {app.answers[q.id] || "—"}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Status history / audit trail */}
      <section className="p-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-4">
        <h2 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider font-mono pb-2 border-b border-[var(--color-border)]">
          Audit Timeline & Status Transitions
        </h2>
        {statusHistory.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] py-2">
            No status changes recorded yet. Application is at initial status.
          </p>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--color-border)]">
            {statusHistory.map((entry) => (
              <div key={entry.id} className="relative">
                {/* Timeline node */}
                <div className="absolute -left-[22px] top-1.5 w-3 h-3 rounded-full bg-[var(--color-surface)] border-2 border-[var(--color-cyan)]" />
                <div className="p-3.5 rounded-lg bg-[var(--color-canvas)]/60 border border-[var(--color-border)]/70">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-mono text-[var(--color-text-muted)]">
                      {new Date(entry.created_at).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                    <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
                      Actor: {entry.actor_id ? entry.actor_id.slice(0, 8) : "System"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-sm">
                    {entry.previous_status ? (
                      <>
                        <StatusBadge status={entry.previous_status} />
                        <span className="text-[var(--color-text-muted)] font-mono text-xs">→</span>
                      </>
                    ) : (
                      <span className="text-xs font-mono text-[var(--color-text-muted)] mr-1">Initial state:</span>
                    )}
                    <StatusBadge status={entry.new_status} />
                  </div>
                </div>
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
    <div className="p-3 rounded-lg bg-[var(--color-canvas)]/60 border border-[var(--color-border)]/60">
      <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider font-mono">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">{value}</p>
    </div>
  );
}
