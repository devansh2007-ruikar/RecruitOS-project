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
      <div className="text-center py-16 text-[var(--color-text-muted)]">
        <svg
          className="mx-auto mb-3"
          width="40"
          height="40"
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
        <p className="text-sm font-medium">No applications found</p>
        <p className="text-xs mt-1">
          Try adjusting your search or filters, or wait for candidate submissions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Feedback alerts */}
      {actionSuccess && (
        <div
          role="status"
          className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between"
        >
          <span>{actionSuccess}</span>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-emerald-600 hover:text-emerald-800 ml-2"
            aria-label="Dismiss success message"
          >
            ✕
          </button>
        </div>
      )}

      {actionError && (
        <div
          role="alert"
          className="p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-800 text-red-800 dark:text-red-200 text-xs flex items-center justify-between"
        >
          <div>
            <p className="font-semibold mb-0.5">Bulk Update Rejected</p>
            <p>{actionError}</p>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-red-600 hover:text-red-800 ml-3"
            aria-label="Dismiss error message"
          >
            ✕
          </button>
        </div>
      )}

      {/* Bulk action toolbar */}
      {selectedIds.length > 0 && (
        <div className="p-3 rounded-lg border border-[var(--color-accent)] bg-[var(--color-accent-light)] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 font-medium">
            <span>
              <strong>{selectedIds.length}</strong> candidate{selectedIds.length !== 1 ? "s" : ""} selected
            </span>
            <button
              onClick={() => setSelectedIds([])}
              className="underline text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            >
              Clear
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[var(--color-text-muted)] hidden sm:inline">Bulk actions:</span>
            {BULK_ACTIONS.map((action) => (
              <button
                key={action.status}
                onClick={() => handleBulkTransition(action.status)}
                disabled={isPending}
                className={`h-7 px-2.5 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                  ${
                    action.isDanger
                      ? "border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950 dark:border-red-800 dark:text-red-300"
                      : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                  }`}
              >
                {action.label}
              </button>
            ))}
            {isPending && (
              <span className="inline-flex items-center gap-1 text-[var(--color-text-muted)]">
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
      <div className="border border-[var(--color-border)] rounded-lg overflow-hidden bg-[var(--color-surface)]">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
                <th className="w-10 px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isIndeterminate;
                    }}
                    onChange={toggleSelectAll}
                    aria-label="Select all candidates on page"
                    className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-accent)] focus:ring-[var(--color-accent)] cursor-pointer"
                  />
                </th>
                <th className="text-left font-medium text-xs text-[var(--color-text-muted)] uppercase tracking-wider px-4 py-3">
                  Candidate
                </th>
                <th className="text-left font-medium text-xs text-[var(--color-text-muted)] uppercase tracking-wider px-4 py-3">
                  Team
                </th>
                <th className="text-left font-medium text-xs text-[var(--color-text-muted)] uppercase tracking-wider px-4 py-3">
                  Status
                </th>
                <th className="text-left font-medium text-xs text-[var(--color-text-muted)] uppercase tracking-wider px-4 py-3">
                  Applied
                </th>
                <th className="text-left font-medium text-xs text-[var(--color-text-muted)] uppercase tracking-wider px-4 py-3">
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
                    className={`hover:bg-[var(--color-bg)] transition-colors ${
                      isSelected ? "bg-[var(--color-accent-light)]/40" : ""
                    }`}
                  >
                    <td className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(app.id)}
                        aria-label={`Select candidate ${app.name}`}
                        className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-accent)] focus:ring-[var(--color-accent)] cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/candidates/${app.id}`}
                        className="hover:text-[var(--color-accent)] transition-colors"
                      >
                        <p className="font-medium">{app.name}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {app.email}
                        </p>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                      {app.team}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--color-text-muted)]">
                      {formatDate(app.created_at)}
                    </td>
                    <td className="px-4 py-3">
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

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-[var(--color-border)]">
          {candidates.map((app) => {
            const isSelected = selectedIds.includes(app.id);
            return (
              <div
                key={app.id}
                className={`p-4 space-y-3 ${
                  isSelected ? "bg-[var(--color-accent-light)]/40" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectOne(app.id)}
                      aria-label={`Select candidate ${app.name}`}
                      className="w-4 h-4 mt-0.5 rounded border-[var(--color-border)] text-[var(--color-accent)] focus:ring-[var(--color-accent)] cursor-pointer"
                    />
                    <div>
                      <Link
                        href={`/dashboard/candidates/${app.id}`}
                        className="hover:text-[var(--color-accent)] transition-colors"
                      >
                        <p className="font-medium text-sm">{app.name}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {app.email}
                        </p>
                      </Link>
                    </div>
                  </div>
                  <StatusBadge status={app.status} />
                </div>
                <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] pl-7">
                  <span>{app.team}</span>
                  <span>{formatDate(app.created_at)}</span>
                </div>
                <div className="pl-7">
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
