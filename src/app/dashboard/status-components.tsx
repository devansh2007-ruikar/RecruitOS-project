"use client";

import { useState } from "react";
import type { ApplicationStatus } from "@/lib/types";
import { STATUS_TRANSITIONS, STATUS_CONFIG } from "@/lib/types";
import { transitionStatus, type TransitionResult } from "./actions";

interface StatusActionsProps {
  applicationId: string;
  currentStatus: ApplicationStatus;
}

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium tracking-wide border ${config.bgColor} ${config.color}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" aria-hidden="true" />
      {config.label}
    </span>
  );
}

export function StatusActions({ applicationId, currentStatus }: StatusActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const transitions = STATUS_TRANSITIONS[currentStatus];
  if (!transitions || transitions.length === 0) return null;

  async function handleTransition(newStatus: ApplicationStatus) {
    setLoading(newStatus);
    setError(null);

    const result: TransitionResult = await transitionStatus(applicationId, newStatus);

    if (!result.success) {
      setError(result.error || "Failed to update status");
    }

    setLoading(null);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {transitions.map((target) => {
          const config = STATUS_CONFIG[target];
          const isReject = target === "rejected";
          return (
            <button
              key={target}
              onClick={() => handleTransition(target)}
              disabled={loading !== null}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]
                ${
                  isReject
                    ? "border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-danger)] hover:text-[var(--color-danger)] hover:bg-red-950/30"
                    : "border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] hover:bg-[var(--color-surface)]"
                }
              `}
            >
              {loading === target ? (
                <span className="inline-flex items-center gap-1.5 text-[var(--color-accent)]">
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Updating…
                </span>
              ) : (
                `→ ${config.label}`
              )}
            </button>
          );
        })}
      </div>
      {error && (
        <p className="text-xs text-[var(--color-danger)] font-medium flex items-center gap-1">
          <span aria-hidden="true">⚠</span> {error}
        </p>
      )}
    </div>
  );
}
