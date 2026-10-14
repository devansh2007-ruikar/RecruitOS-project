"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { TEAMS, TEAM_QUESTIONS, type Team } from "@/lib/types";
import {
  personalDetailsSchema,
  teamPreferenceSchema,
} from "@/lib/validations";
import { submitApplication, type SubmitApplicationResult } from "./actions";

type Step = 1 | 2 | 3 | 4;

interface FormData {
  name: string;
  email: string;
  branch: string;
  year: string;
  team: string;
  answers: Record<string, string>;
}

const INITIAL_FORM: FormData = {
  name: "",
  email: "",
  branch: "",
  year: "",
  team: "",
  answers: {},
};

export default function ApplicationForm() {
  const [step, setStep] = useState<Step>(1);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);

  const updateField = useCallback(
    (field: keyof FormData, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    []
  );

  const updateAnswer = useCallback((questionId: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      answers: { ...prev.answers, [questionId]: value },
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  }, []);

  const validateStep = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      const result = personalDetailsSchema.safeParse({
        name: formData.name,
        email: formData.email,
        branch: formData.branch,
        year: formData.year ? parseInt(formData.year, 10) : undefined,
      });
      if (!result.success) {
        for (const issue of result.error.issues) {
          const key = issue.path[0] as string;
          if (!newErrors[key]) newErrors[key] = issue.message;
        }
      }
    }

    if (step === 2) {
      const result = teamPreferenceSchema.safeParse({ team: formData.team || undefined });
      if (!result.success) {
        newErrors.team = "Please select a team";
      }
    }

    if (step === 3 && formData.team) {
      const questions = TEAM_QUESTIONS[formData.team as Team] || [];
      for (const q of questions) {
        if (q.required && (!formData.answers[q.id] || formData.answers[q.id].trim() === "")) {
          newErrors[q.id] = "This field is required";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [step, formData]);

  const nextStep = useCallback(() => {
    if (validateStep()) {
      setStep((s) => Math.min(s + 1, 4) as Step);
    }
  }, [validateStep]);

  const prevStep = useCallback(() => {
    setStep((s) => Math.max(s - 1, 1) as Step);
    setSubmitError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setSubmitError(null);
    setIsDuplicate(false);

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        branch: formData.branch,
        year: parseInt(formData.year, 10),
        team: formData.team,
        answers: formData.answers,
      };

      const result: SubmitApplicationResult = await submitApplication(payload);

      if (result.success) {
        setSubmitted(true);
      } else {
        setSubmitError(result.error || "Submission failed");
        if (result.duplicate) {
          setIsDuplicate(true);
        }
        if (result.fieldErrors) {
          const flat: Record<string, string> = {};
          for (const [key, msgs] of Object.entries(result.fieldErrors)) {
            flat[key] = msgs[0];
          }
          setErrors(flat);
        }
      }
    } catch {
      setSubmitError("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [formData]);

  // Success state
  if (submitted) {
    return (
      <div className="text-center space-y-5 py-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30 flex items-center justify-center text-[var(--color-accent)]">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] tracking-tight">Application Submitted</h2>
          <p className="text-base text-[var(--color-text-secondary)] max-w-md mx-auto leading-relaxed">
            Thank you, <strong className="text-[var(--color-text-primary)]">{formData.name}</strong>. Your application to the{" "}
            <strong className="text-[var(--color-accent)]">{formData.team}</strong> team has been received. Our chapter coordinators will review your responses and contact you at <strong className="text-[var(--color-text-primary)]">{formData.email}</strong>.
          </p>
        </div>
        <div className="pt-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-primary)] hover:border-[var(--color-border-hover)] transition-colors"
          >
            Return to Chapter Overview
          </Link>
        </div>
      </div>
    );
  }

  const teamQuestions = formData.team
    ? TEAM_QUESTIONS[formData.team as Team] || []
    : [];

  const stepTitles = [
    { num: 1, label: "Personal Details" },
    { num: 2, label: "Team Preference" },
    { num: 3, label: "Team Questions" },
    { num: 4, label: "Review & Submit" },
  ];

  return (
    <div className="space-y-6">
      {/* 4-Step Progress Indicator */}
      <nav aria-label="Application progress" className="space-y-2.5">
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="font-mono text-[var(--color-accent)] uppercase tracking-wider">
            Step {step} of 4
          </span>
          <span className="text-[var(--color-text-secondary)] font-medium">
            {stepTitles[step - 1].label}
          </span>
        </div>

        {/* Visual progress bar segments */}
        <div className="grid grid-cols-4 gap-2">
          {stepTitles.map((s) => {
            const isCompleted = s.num < step;
            const isCurrent = s.num === step;
            return (
              <div key={s.num} className="space-y-1">
                <div
                  className={`h-1.5 w-full rounded-full transition-colors duration-200 ${
                    isCurrent
                      ? "bg-[var(--color-accent)]"
                      : isCompleted
                      ? "bg-[var(--color-blue)]"
                      : "bg-[var(--color-border)]"
                  }`}
                />
              </div>
            );
          })}
        </div>
      </nav>

      {/* Step 1: Personal Details */}
      {step === 1 && (
        <div className="space-y-5">
          <div className="space-y-1 border-b border-[var(--color-border)] pb-3">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Personal Details</h2>
            <p className="text-sm text-[var(--color-text-secondary)]">Provide your official student contact information.</p>
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
              Full Name <span className="text-[var(--color-accent)]">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="e.g., Aarav Sharma"
              className={`w-full min-h-[44px] px-3.5 rounded-lg border text-base sm:text-sm
                bg-[var(--color-surface-raised)] text-[var(--color-text-primary)]
                placeholder:text-[var(--color-text-muted)]
                ${errors.name ? "border-[var(--color-danger)] ring-1 ring-[var(--color-danger)]" : "border-[var(--color-border)]"}
                focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-colors`}
            />
            {errors.name && (
              <p className="text-sm text-[var(--color-danger)] mt-1.5 font-medium flex items-center gap-1">
                <span aria-hidden="true">⚠</span> {errors.name}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
              Email Address <span className="text-[var(--color-accent)]">*</span>
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="student@rbu.edu"
              className={`w-full min-h-[44px] px-3.5 rounded-lg border text-base sm:text-sm
                bg-[var(--color-surface-raised)] text-[var(--color-text-primary)]
                placeholder:text-[var(--color-text-muted)]
                ${errors.email ? "border-[var(--color-danger)] ring-1 ring-[var(--color-danger)]" : "border-[var(--color-border)]"}
                focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-colors`}
            />
            {errors.email ? (
              <p className="text-sm text-[var(--color-danger)] mt-1.5 font-medium flex items-center gap-1">
                <span aria-hidden="true">⚠</span> {errors.email}
              </p>
            ) : (
              <p className="text-xs text-[var(--color-text-muted)] mt-1.5">We will send interview notices to this address.</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="branch" className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                Branch / Discipline <span className="text-[var(--color-accent)]">*</span>
              </label>
              <input
                id="branch"
                type="text"
                value={formData.branch}
                onChange={(e) => updateField("branch", e.target.value)}
                placeholder="e.g., Computer Science"
                className={`w-full min-h-[44px] px-3.5 rounded-lg border text-base sm:text-sm
                  bg-[var(--color-surface-raised)] text-[var(--color-text-primary)]
                  placeholder:text-[var(--color-text-muted)]
                  ${errors.branch ? "border-[var(--color-danger)] ring-1 ring-[var(--color-danger)]" : "border-[var(--color-border)]"}
                  focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-colors`}
              />
              {errors.branch && (
                <p className="text-sm text-[var(--color-danger)] mt-1.5 font-medium flex items-center gap-1">
                  <span aria-hidden="true">⚠</span> {errors.branch}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="year" className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                Current Year <span className="text-[var(--color-accent)]">*</span>
              </label>
              <select
                id="year"
                value={formData.year}
                onChange={(e) => updateField("year", e.target.value)}
                className={`w-full min-h-[44px] px-3.5 rounded-lg border text-base sm:text-sm
                  bg-[var(--color-surface-raised)] text-[var(--color-text-primary)]
                  ${!formData.year ? "text-[var(--color-text-muted)]" : ""}
                  ${errors.year ? "border-[var(--color-danger)] ring-1 ring-[var(--color-danger)]" : "border-[var(--color-border)]"}
                  focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-colors`}
              >
                <option value="">Select year (1 – 5)</option>
                {[1, 2, 3, 4, 5].map((y) => (
                  <option key={y} value={y}>
                    Year {y}
                  </option>
                ))}
              </select>
              {errors.year && (
                <p className="text-sm text-[var(--color-danger)] mt-1.5 font-medium flex items-center gap-1">
                  <span aria-hidden="true">⚠</span> {errors.year}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Team Preference */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="space-y-1 border-b border-[var(--color-border)] pb-3">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Team Preference</h2>
            <p className="text-sm text-[var(--color-text-secondary)]">Select the primary team domain you are applying for.</p>
          </div>

          <div className="space-y-3">
            {TEAMS.map((team) => {
              const isSelected = formData.team === team;
              const descriptions: Record<string, string> = {
                Technical: "Smart contracts, protocols, full-stack tools, and Web3 systems engineering.",
                Design: "User interface, product design, brand systems, and technical infographics.",
                Events: "Hackathons, speaker workshops, operations, logistics, and sponsorships.",
              };

              return (
                <label
                  key={team}
                  className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-all min-h-[64px]
                    ${
                      isSelected
                        ? "border-[var(--color-accent)] bg-[var(--color-surface-raised)] ring-1 ring-[var(--color-accent)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-surface-raised)]"
                    }`}
                >
                  <input
                    type="radio"
                    name="team"
                    value={team}
                    checked={isSelected}
                    onChange={(e) => updateField("team", e.target.value)}
                    className="sr-only"
                  />
                  <div
                    className={`w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors
                      ${
                        isSelected
                          ? "border-[var(--color-accent)]"
                          : "border-[var(--color-border)]"
                      }`}
                  >
                    {isSelected && (
                      <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent)]" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <span className="text-base font-semibold text-[var(--color-text-primary)] block">
                      {team} Team
                    </span>
                    <span className="text-sm text-[var(--color-text-secondary)] block leading-relaxed">
                      {descriptions[team]}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>

          {errors.team && (
            <p className="text-sm text-[var(--color-danger)] font-medium flex items-center gap-1">
              <span aria-hidden="true">⚠</span> {errors.team}
            </p>
          )}
        </div>
      )}

      {/* Step 3: Team-Specific Questions */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="space-y-1 border-b border-[var(--color-border)] pb-3">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
              {formData.team} Domain Questions
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Answer the domain-specific questions to demonstrate your experience and interests.
            </p>
          </div>

          <div className="space-y-5">
            {teamQuestions.map((q) => (
              <div key={q.id} className="space-y-1.5">
                <label htmlFor={q.id} className="block text-sm font-medium text-[var(--color-text-primary)] leading-snug">
                  {q.label}
                  {q.required ? (
                    <span className="text-[var(--color-accent)] ml-1">*</span>
                  ) : (
                    <span className="text-xs text-[var(--color-text-muted)] ml-1 font-normal">(Optional)</span>
                  )}
                </label>

                {q.type === "textarea" && (
                  <textarea
                    id={q.id}
                    rows={4}
                    value={formData.answers[q.id] || ""}
                    onChange={(e) => updateAnswer(q.id, e.target.value)}
                    placeholder="Enter your response…"
                    className={`w-full px-3.5 py-2.5 rounded-lg border text-base sm:text-sm resize-y
                      bg-[var(--color-surface-raised)] text-[var(--color-text-primary)]
                      placeholder:text-[var(--color-text-muted)]
                      ${errors[q.id] ? "border-[var(--color-danger)] ring-1 ring-[var(--color-danger)]" : "border-[var(--color-border)]"}
                      focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-colors`}
                  />
                )}

                {q.type === "text" && (
                  <input
                    id={q.id}
                    type="text"
                    value={formData.answers[q.id] || ""}
                    onChange={(e) => updateAnswer(q.id, e.target.value)}
                    placeholder="https://… or answer text"
                    className={`w-full min-h-[44px] px-3.5 rounded-lg border text-base sm:text-sm
                      bg-[var(--color-surface-raised)] text-[var(--color-text-primary)]
                      placeholder:text-[var(--color-text-muted)]
                      ${errors[q.id] ? "border-[var(--color-danger)] ring-1 ring-[var(--color-danger)]" : "border-[var(--color-border)]"}
                      focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-colors`}
                  />
                )}

                {q.type === "select" && (
                  <select
                    id={q.id}
                    value={formData.answers[q.id] || ""}
                    onChange={(e) => updateAnswer(q.id, e.target.value)}
                    className={`w-full min-h-[44px] px-3.5 rounded-lg border text-base sm:text-sm
                      bg-[var(--color-surface-raised)] text-[var(--color-text-primary)]
                      ${!formData.answers[q.id] ? "text-[var(--color-text-muted)]" : ""}
                      ${errors[q.id] ? "border-[var(--color-danger)] ring-1 ring-[var(--color-danger)]" : "border-[var(--color-border)]"}
                      focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-colors`}
                  >
                    <option value="">Select option</option>
                    {q.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}

                {errors[q.id] && (
                  <p className="text-sm text-[var(--color-danger)] font-medium flex items-center gap-1">
                    <span aria-hidden="true">⚠</span> {errors[q.id]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Review & Submit */}
      {step === 4 && (
        <div className="space-y-5">
          <div className="space-y-1 border-b border-[var(--color-border)] pb-3">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Review Application</h2>
            <p className="text-sm text-[var(--color-text-secondary)]">Verify all details before submitting. You cannot edit after submission.</p>
          </div>

          <div className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5">
            <div className="space-y-2 border-b border-[var(--color-border)] pb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-[var(--color-accent)]">Personal Information</span>
              <ReviewRow label="Full Name" value={formData.name} />
              <ReviewRow label="Email" value={formData.email} />
              <ReviewRow label="Branch" value={formData.branch} />
              <ReviewRow label="Year" value={`Year ${formData.year}`} />
            </div>

            <div className="space-y-2 border-b border-[var(--color-border)] pb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-[var(--color-accent)]">Team Selection</span>
              <ReviewRow label="Selected Team" value={`${formData.team} Team`} />
            </div>

            {teamQuestions.length > 0 && (
              <div className="space-y-3 pt-1">
                <span className="text-xs font-mono uppercase tracking-wider text-[var(--color-accent)]">Team Responses</span>
                {teamQuestions.map((q) => (
                  <div key={q.id} className="space-y-1 pt-1">
                    <p className="text-xs text-[var(--color-text-muted)] font-medium">{q.label}</p>
                    <p className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-border)]">
                      {formData.answers[q.id] || "—"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {submitError && (
            <div
              className={`p-4 rounded-xl border text-sm ${
                isDuplicate
                  ? "bg-amber-950/60 border-amber-800 text-amber-200"
                  : "bg-red-950/60 border-red-800 text-red-200"
              }`}
              role="alert"
            >
              {isDuplicate && (
                <p className="font-semibold mb-1 text-amber-100 flex items-center gap-1.5">
                  <span aria-hidden="true">⚠</span> Duplicate Application
                </p>
              )}
              <p className="leading-relaxed">{submitError}</p>
            </div>
          )}
        </div>
      )}

      {/* Navigation Buttons (Min 44px Touch Targets) */}
      <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
        {step > 1 ? (
          <button
            type="button"
            onClick={prevStep}
            disabled={submitting}
            className="min-h-[44px] px-5 py-2.5 rounded-lg border border-[var(--color-border)] text-sm font-medium
              text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-hover)]
              hover:bg-[var(--color-surface-raised)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
          >
            &larr; Back
          </button>
        ) : (
          <div />
        )}

        {step < 4 ? (
          <button
            type="button"
            onClick={nextStep}
            className="min-h-[44px] px-7 py-2.5 rounded-lg bg-[var(--color-accent)] text-[var(--color-accent-fg)] font-semibold text-sm
              hover:bg-[var(--color-accent-hover)] transition-colors shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
          >
            Continue &rarr;
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="min-h-[44px] px-7 py-2.5 rounded-lg bg-[var(--color-accent)] text-[var(--color-accent-fg)] font-semibold text-sm
              hover:bg-[var(--color-accent-hover)] transition-colors shadow-sm
              disabled:opacity-50 disabled:cursor-not-allowed
              inline-flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
          >
            {submitting && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            {submitting ? "Submitting Application…" : "Submit Application"}
          </button>
        )}
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 text-sm">
      <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
        {label}
      </span>
      <span className="font-medium text-[var(--color-text-primary)] break-words">
        {value || "—"}
      </span>
    </div>
  );
}
