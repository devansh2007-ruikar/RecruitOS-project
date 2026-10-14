"use client";

import { useState, useCallback } from "react";
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
      <div className="text-center space-y-4 py-8">
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-600">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold">Application Submitted</h2>
        <p className="text-[var(--color-text-secondary)] max-w-sm mx-auto">
          Thank you, {formData.name}. Your application to the{" "}
          <strong>{formData.team}</strong> team has been received. We&apos;ll reach
          out to <strong>{formData.email}</strong> with updates.
        </p>
      </div>
    );
  }

  const teamQuestions = formData.team
    ? TEAM_QUESTIONS[formData.team as Team] || []
    : [];

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <nav aria-label="Application steps" className="flex items-center gap-1">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center flex-1">
            <div
              className={`
                h-1.5 w-full rounded-full transition-colors duration-200
                ${s <= step ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]"}
              `}
            />
          </div>
        ))}
      </nav>

      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
          Step {step} of 4
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">
          {step === 1 && "Personal Details"}
          {step === 2 && "Team Preference"}
          {step === 3 && "Team Questions"}
          {step === 4 && "Review & Submit"}
        </p>
      </div>

      {/* Step 1: Personal details */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1.5">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="Your full name"
              className={`w-full h-10 px-3 rounded-lg border text-sm
                bg-[var(--color-surface)] text-[var(--color-text-primary)]
                placeholder:text-[var(--color-text-muted)]
                ${errors.name ? "border-[var(--color-danger)]" : "border-[var(--color-border)]"}
                focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent`}
            />
            {errors.name && (
              <p className="text-xs text-[var(--color-danger)] mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="you@example.com"
              className={`w-full h-10 px-3 rounded-lg border text-sm
                bg-[var(--color-surface)] text-[var(--color-text-primary)]
                placeholder:text-[var(--color-text-muted)]
                ${errors.email ? "border-[var(--color-danger)]" : "border-[var(--color-border)]"}
                focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent`}
            />
            {errors.email && (
              <p className="text-xs text-[var(--color-danger)] mt-1">{errors.email}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="branch" className="block text-sm font-medium mb-1.5">
                Branch
              </label>
              <input
                id="branch"
                type="text"
                value={formData.branch}
                onChange={(e) => updateField("branch", e.target.value)}
                placeholder="e.g., Computer Science"
                className={`w-full h-10 px-3 rounded-lg border text-sm
                  bg-[var(--color-surface)] text-[var(--color-text-primary)]
                  placeholder:text-[var(--color-text-muted)]
                  ${errors.branch ? "border-[var(--color-danger)]" : "border-[var(--color-border)]"}
                  focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent`}
              />
              {errors.branch && (
                <p className="text-xs text-[var(--color-danger)] mt-1">{errors.branch}</p>
              )}
            </div>

            <div>
              <label htmlFor="year" className="block text-sm font-medium mb-1.5">
                Year
              </label>
              <select
                id="year"
                value={formData.year}
                onChange={(e) => updateField("year", e.target.value)}
                className={`w-full h-10 px-3 rounded-lg border text-sm
                  bg-[var(--color-surface)] text-[var(--color-text-primary)]
                  ${!formData.year ? "text-[var(--color-text-muted)]" : ""}
                  ${errors.year ? "border-[var(--color-danger)]" : "border-[var(--color-border)]"}
                  focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent`}
              >
                <option value="">Select year</option>
                {[1, 2, 3, 4, 5].map((y) => (
                  <option key={y} value={y}>
                    Year {y}
                  </option>
                ))}
              </select>
              {errors.year && (
                <p className="text-xs text-[var(--color-danger)] mt-1">{errors.year}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Team preference */}
      {step === 2 && (
        <div className="space-y-3">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Which team would you like to join?
          </p>
          <div className="space-y-2">
            {TEAMS.map((team) => (
              <label
                key={team}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                  ${
                    formData.team === team
                      ? "border-[var(--color-accent)] bg-[var(--color-accent-light)]"
                      : "border-[var(--color-border)] hover:border-[var(--color-text-muted)]"
                  }`}
              >
                <input
                  type="radio"
                  name="team"
                  value={team}
                  checked={formData.team === team}
                  onChange={(e) => updateField("team", e.target.value)}
                  className="sr-only"
                />
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0
                    ${
                      formData.team === team
                        ? "border-[var(--color-accent)]"
                        : "border-[var(--color-border)]"
                    }`}
                >
                  {formData.team === team && (
                    <div className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
                  )}
                </div>
                <span className="text-sm font-medium">{team}</span>
              </label>
            ))}
          </div>
          {errors.team && (
            <p className="text-xs text-[var(--color-danger)] mt-1">{errors.team}</p>
          )}
        </div>
      )}

      {/* Step 3: Team-specific questions */}
      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Answer the following for the <strong>{formData.team}</strong> team.
          </p>
          {teamQuestions.map((q) => (
            <div key={q.id}>
              <label htmlFor={q.id} className="block text-sm font-medium mb-1.5">
                {q.label}
                {q.required && (
                  <span className="text-[var(--color-danger)] ml-0.5">*</span>
                )}
              </label>

              {q.type === "textarea" && (
                <textarea
                  id={q.id}
                  rows={3}
                  value={formData.answers[q.id] || ""}
                  onChange={(e) => updateAnswer(q.id, e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-sm resize-y
                    bg-[var(--color-surface)] text-[var(--color-text-primary)]
                    placeholder:text-[var(--color-text-muted)]
                    ${errors[q.id] ? "border-[var(--color-danger)]" : "border-[var(--color-border)]"}
                    focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent`}
                />
              )}

              {q.type === "text" && (
                <input
                  id={q.id}
                  type="text"
                  value={formData.answers[q.id] || ""}
                  onChange={(e) => updateAnswer(q.id, e.target.value)}
                  className={`w-full h-10 px-3 rounded-lg border text-sm
                    bg-[var(--color-surface)] text-[var(--color-text-primary)]
                    placeholder:text-[var(--color-text-muted)]
                    ${errors[q.id] ? "border-[var(--color-danger)]" : "border-[var(--color-border)]"}
                    focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent`}
                />
              )}

              {q.type === "select" && (
                <select
                  id={q.id}
                  value={formData.answers[q.id] || ""}
                  onChange={(e) => updateAnswer(q.id, e.target.value)}
                  className={`w-full h-10 px-3 rounded-lg border text-sm
                    bg-[var(--color-surface)] text-[var(--color-text-primary)]
                    ${errors[q.id] ? "border-[var(--color-danger)]" : "border-[var(--color-border)]"}
                    focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent`}
                >
                  <option value="">Select an option</option>
                  {q.options?.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              )}

              {errors[q.id] && (
                <p className="text-xs text-[var(--color-danger)] mt-1">{errors[q.id]}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Please review your application before submitting.
          </p>

          <div className="space-y-3 p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
            <ReviewRow label="Name" value={formData.name} />
            <ReviewRow label="Email" value={formData.email} />
            <ReviewRow label="Branch" value={formData.branch} />
            <ReviewRow label="Year" value={formData.year} />
            <ReviewRow label="Team" value={formData.team} />

            {teamQuestions.length > 0 && (
              <>
                <div className="border-t border-[var(--color-border)] my-2" />
                {teamQuestions.map((q) => (
                  <ReviewRow
                    key={q.id}
                    label={q.label}
                    value={formData.answers[q.id] || "—"}
                  />
                ))}
              </>
            )}
          </div>

          {submitError && (
            <div
              className={`p-3 rounded-lg border text-sm ${
                isDuplicate
                  ? "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200"
                  : "bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200"
              }`}
              role="alert"
            >
              {isDuplicate && (
                <p className="font-medium mb-1">Duplicate Application</p>
              )}
              <p>{submitError}</p>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        {step > 1 ? (
          <button
            type="button"
            onClick={prevStep}
            disabled={submitting}
            className="h-10 px-4 rounded-lg border border-[var(--color-border)] text-sm font-medium
              text-[var(--color-text-secondary)] hover:bg-[var(--color-accent-light)]
              hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]
              transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>
        ) : (
          <div />
        )}

        {step < 4 ? (
          <button
            type="button"
            onClick={nextStep}
            className="h-10 px-6 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium
              hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="h-10 px-6 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium
              hover:bg-[var(--color-accent-hover)] transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
              inline-flex items-center gap-2"
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
            {submitting ? "Submitting…" : "Submit Application"}
          </button>
        )}
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1">
      <span className="text-xs font-medium text-[var(--color-text-muted)] sm:w-40 flex-shrink-0 uppercase tracking-wider">
        {label}
      </span>
      <span className="text-sm text-[var(--color-text-primary)] break-words">
        {value || "—"}
      </span>
    </div>
  );
}
