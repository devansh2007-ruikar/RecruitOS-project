"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { Application, ApplicationStatus } from "@/lib/types";
import { STATUS_CONFIG } from "@/lib/types";
import { StatusBadge, StatusActions } from "./status-components";
import { bulkTransitionStatus } from "./actions";

interface CandidateTableProps {
  candidates: Application[];
}

const BULK_ACTIONS: { status: ApplicationStatus; label: string; isDanger?: boolean }[] = [
  { status: "shortlisted", label: "Shortlist Selected" },
  { status: "interview", label: "Move to Interview" },
  { status: "selected", label: "Mark as Selected" },
  { status: "rejected", label: "Reject Selected", isDanger: true },
];

export function CandidateTable({ candidates }: CandidateTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const allSelected = candidates.length > 0 && selectedIds.length === candidates.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < candidates.length;

  function toggleSelectAll() {
    setActionError(null);
    setActionSuccess(null);
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(candidates.map((c) => c.id));
    }
  }

  function toggleSelectOne(id: string) {
    setActionError(null);
    setActionSuccess(null);
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function handleBulkTransition(targetStatus: ApplicationStatus) {
    if (selectedIds.length === 0) return;

    setActionError(null);
    setActionSuccess(null);

    startTransition(async () => {
      const result = await bulkTransitionStatus(selectedIds, targetStatus);
      if (result.success) {
        setActionSuccess(
          `Successfully updated ${result.count ?? selectedIds.length} candidate${
            selectedIds.length !== 1 ? "s" : ""
          } to ${STATUS_CONFIG[targetStatus].label}.`
        );
        setSelectedIds([]);
      } else {
        setActionError(result.error || "Bulk status transition failed.");
      }
    });
  }

  if (candidates.length === 0) {
    return (
      <div className="text-center py-20 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] space-y-3">
        <div className="w-12 h-12 mx-auto rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-accent)]">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="17" y1="11" x2="23" y2="11" />
          </svg>
        </div>
        <p className="text-base font-semibold text-[var(--color-text-primary)]">No applications found</p>
        <p className="text-sm text-[var(--color-text-secondary)] max-w-sm mx-auto leading-relaxed">
          No candidates match the current filter criteria. Try clearing search filters or check back after new submissions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Feedback alerts */}
      {actionSuccess && (
        <div
          role="status"
          className="p-3.5 rounded-xl border border-emerald-800 bg-emerald-950/60 text-emerald-200 text-sm flex items-center justify-between"
        >
          <div className="flex items-center gap-2 font-medium">
            <span aria-hidden="true">✓</span>
            <span>{actionSuccess}</span>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-emerald-400 hover:text-emerald-200 ml-2 p-1"
            aria-label="Dismiss success message"
          >
            ✕
          </button>
        </div>
      )}

      {actionError && (
        <div
          role="alert"
          className="p-3.5 rounded-xl border border-red-800 bg-red-950/60 text-red-200 text-sm flex items-center justify-between"
        >
          <div>
            <p className="font-semibold mb-0.5 flex items-center gap-1.5">
              <span aria-hidden="true">⚠</span> Bulk Transition Rejected
            </p>
            <p className="text-red-300 text-xs sm:text-sm">{actionError}</p>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-red-400 hover:text-red-200 ml-3 p-1"
            aria-label="Dismiss error message"
          >
            ✕
          </button>
        </div>
      )}

      {/* Bulk action toolbar */}
      {selectedIds.length > 0 && (
        <div className="p-3.5 rounded-xl border border-[var(--color-accent)]/50 bg-[var(--color-surface-raised)] flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm shadow-lg">
          <div className="flex items-center gap-2.5 font-medium">
            <span className="text-[var(--color-text-primary)] font-semibold">
              <span className="text-[var(--color-accent)]">{selectedIds.length}</span> candidate{selectedIds.length !== 1 ? "s" : ""} selected
            </span>
            <button
              onClick={() => setSelectedIds([])}
              className="underline text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] text-xs"
            >
              Deselect All
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono text-[var(--color-text-muted)] uppercase tracking-wider hidden sm:inline">Bulk Transitions:</span>
            {BULK_ACTIONS.map((action) => (
              <button
                key={action.status}
                onClick={() => handleBulkTransition(action.status)}
                disabled={isPending}
                className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]
                  ${
                    action.isDanger
                      ? "border border-red-800/80 bg-red-950/60 text-red-300 hover:bg-red-900/80 hover:text-red-100"
                      : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] hover:bg-[var(--color-surface-raised)]"
                  }`}
              >
                {action.label}
              </button>
            ))}
            {isPending && (
              <span className="inline-flex items-center gap-1.5 text-[var(--color-accent)] text-xs font-mono">
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing…
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main Table Container */}
      <div className="border border-[var(--color-border)] rounded-xl overflow-hidden bg-[var(--color-surface)] shadow-xl">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-raised)]">
                <th className="w-12 px-4 py-3.5 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isIndeterminate;
                    }}
                    onChange={toggleSelectAll}
                    aria-label="Select all candidates on page"
                    className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-accent)] focus:ring-[var(--color-accent)] cursor-pointer bg-[var(--color-surface)]"
                  />
                </th>
                <th className="text-left font-mono text-xs text-[var(--color-text-muted)] uppercase tracking-wider px-4 py-3.5">
                  Candidate Profile
                </th>
                <th className="text-left font-mono text-xs text-[var(--color-text-muted)] uppercase tracking-wider px-4 py-3.5">
                  Team
                </th>
                <th className="text-left font-mono text-xs text-[var(--color-text-muted)] uppercase tracking-wider px-4 py-3.5">
                  Recruitment Status
                </th>
                <th className="text-left font-mono text-xs text-[var(--color-text-muted)] uppercase tracking-wider px-4 py-3.5">
                  Submission Date
                </th>
                <th className="text-left font-mono text-xs text-[var(--color-text-muted)] uppercase tracking-wider px-4 py-3.5">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {candidates.map((app) => {
                const isSelected = selectedIds.includes(app.id);
                return (
                  <tr
                    key={app.id}
                    className={`hover:bg-[var(--color-surface-raised)]/70 transition-colors ${
                      isSelected ? "bg-[var(--color-accent-light)]/20" : ""
                    }`}
                  >
                    <td className="w-12 px-4 py-3.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(app.id)}
                        aria-label={`Select candidate ${app.name}`}
                        className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-accent)] focus:ring-[var(--color-accent)] cursor-pointer bg-[var(--color-surface)]"
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      <Link
                        href={`/dashboard/candidates/${app.id}`}
                        className="hover:text-[var(--color-accent)] transition-colors group block"
                      >
                        <p className="font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
                          {app.name}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)] font-mono">
                          {app.email}
                        </p>
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-[var(--color-text-secondary)] font-medium">
                      {app.team}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="px-4 py-3.5 text-xs font-mono text-[var(--color-text-muted)]">
                      {formatDate(app.created_at)}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusActions
                        applicationId={app.id}
                        currentStatus={app.status}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="md:hidden divide-y divide-[var(--color-border)]">
          {candidates.map((app) => {
            const isSelected = selectedIds.includes(app.id);
            return (
              <div
                key={app.id}
                className={`p-4 space-y-3.5 transition-colors ${
                  isSelected ? "bg-[var(--color-accent-light)]/20" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectOne(app.id)}
                      aria-label={`Select candidate ${app.name}`}
                      className="w-4 h-4 mt-1 rounded border-[var(--color-border)] text-[var(--color-accent)] focus:ring-[var(--color-accent)] cursor-pointer bg-[var(--color-surface-raised)]"
                    />
                    <div>
                      <Link
                        href={`/dashboard/candidates/${app.id}`}
                        className="hover:text-[var(--color-accent)] transition-colors group"
                      >
                        <p className="font-semibold text-base text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)]">
                          {app.name}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)] font-mono">
                          {app.email}
                        </p>
                      </Link>
                    </div>
                  </div>
                  <StatusBadge status={app.status} />
                </div>
                <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] pl-7">
                  <span className="font-medium text-[var(--color-text-secondary)]">{app.team} Team</span>
                  <span className="font-mono">{formatDate(app.created_at)}</span>
                </div>
                <div className="pl-7 pt-1">
                  <StatusActions
                    applicationId={app.id}
                    currentStatus={app.status}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
