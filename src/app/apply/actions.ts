"use server";

import { applicationSchema, normalizeEmail } from "@/lib/validations";
import { TEAM_QUESTIONS } from "@/lib/types";
import type { Team } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export interface SubmitApplicationResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  duplicate?: boolean;
}

export async function submitApplication(
  data: unknown
): Promise<SubmitApplicationResult> {
  // 1. Validate with Zod
  const parsed = applicationSchema.safeParse(data);

  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".");
      if (!fieldErrors[path]) fieldErrors[path] = [];
      fieldErrors[path].push(issue.message);
    }
    return { success: false, error: "Validation failed", fieldErrors };
  }

  const { name, email, branch, year, team, answers } = parsed.data;

  // 2. Validate that required team-specific questions are answered
  const teamQuestions = TEAM_QUESTIONS[team as Team];
  if (teamQuestions) {
    for (const q of teamQuestions) {
      if (q.required && (!answers[q.id] || answers[q.id].trim() === "")) {
        return {
          success: false,
          error: `Please answer: "${q.label}"`,
        };
      }
    }
  }

  // 3. Normalize email
  const emailNormalized = normalizeEmail(email);

  // 4. Persist to Supabase
  const supabase = await createClient();

  if (!supabase) {
    return {
      success: false,
      error:
        "Supabase configuration is missing. Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment to submit applications.",
    };
  }

  const { error: insertError } = await supabase.from("applications").insert({
    name: name.trim(),
    email: email.trim(),
    email_normalized: emailNormalized,
    branch: branch.trim(),
    year,
    team,
    answers,
    status: "applied",
  });

  if (insertError) {
    // Check for unique constraint violation (duplicate email)
    if (
      insertError.code === "23505" ||
      insertError.message?.includes("duplicate") ||
      insertError.message?.includes("unique")
    ) {
      return {
        success: false,
        error: "An application with this email already exists.",
        duplicate: true,
      };
    }

    console.error("Supabase insert error:", insertError);
    return {
      success: false,
      error: "Failed to submit application. Please try again.",
    };
  }

  return { success: true };
}
