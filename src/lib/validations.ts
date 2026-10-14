import { z } from "zod";
import { TEAMS } from "./types";

/**
 * Zod schema for the multi-step application form.
 * Validates all fields before submission.
 */

// Step 1: Personal details
export const personalDetailsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be under 100 characters"),
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address")
    .max(255, "Email must be under 255 characters"),
  branch: z
    .string()
    .trim()
    .min(1, "Branch is required")
    .max(100, "Branch must be under 100 characters"),
  year: z
    .number({ message: "Year is required" })
    .int("Year must be a whole number")
    .min(1, "Year must be between 1 and 5")
    .max(5, "Year must be between 1 and 5"),
});

// Step 2: Team preference
export const teamPreferenceSchema = z.object({
  team: z.enum(TEAMS, {
    message: "Please select a team",
  }),
});

// Step 3: Team-specific answers — validated dynamically
export const teamAnswersSchema = z.record(
  z.string(),
  z.string().max(2000, "Response must be under 2000 characters")
);

// Full application schema for server-side validation
export const applicationSchema = personalDetailsSchema
  .merge(teamPreferenceSchema)
  .extend({
    answers: teamAnswersSchema,
  });

export type PersonalDetailsInput = z.infer<typeof personalDetailsSchema>;
export type TeamPreferenceInput = z.infer<typeof teamPreferenceSchema>;
export type ApplicationInput = z.infer<typeof applicationSchema>;

/** Normalize email: lowercase, trim whitespace */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}
