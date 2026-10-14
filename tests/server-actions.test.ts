import test from "node:test";
import assert from "node:assert/strict";
import { submitApplication } from "../src/app/apply/actions";
import { loginAction } from "../src/app/login/actions";
import { transitionStatus } from "../src/app/dashboard/actions";
import { isSupabaseConfigured } from "../src/lib/supabase/server";

test("isSupabaseConfigured correctly reports false when environment variables are missing/placeholders", () => {
  // In the test runner environment without populated .env.local keys
  assert.equal(isSupabaseConfigured(), false);
});

test("submitApplication fails with clear error when Supabase is unconfigured (no silent localStorage fallback)", async () => {
  const result = await submitApplication({
    name: "Devansh Ruikar",
    email: "devansh@example.com",
    branch: "Computer Science",
    year: 3,
    team: "Technical",
    answers: {
      tech_languages: "TypeScript, Rust",
      tech_project: "RecruitOS",
      tech_interest: "Web Development",
    },
  });

  assert.equal(result.success, false);
  assert.match(result.error ?? "", /Supabase configuration is missing/i);
});

test("submitApplication returns validation errors on invalid payload", async () => {
  const result = await submitApplication({
    name: "",
    email: "invalid-email",
    branch: "",
    year: 99,
    team: "InvalidTeam",
    answers: {},
  });

  assert.equal(result.success, false);
  assert.ok(result.fieldErrors);
  assert.ok(result.fieldErrors["name"]);
  assert.ok(result.fieldErrors["email"]);
  assert.ok(result.fieldErrors["year"]);
  assert.ok(result.fieldErrors["team"]);
});

test("loginAction fails with clear error when Supabase is unconfigured", async () => {
  const formData = new FormData();
  formData.set("email", "coordinator@rbu.edu");
  formData.set("password", "secretpassword");

  const result = await loginAction(formData);
  assert.ok(result?.error);
  assert.match(result.error, /Supabase configuration is missing/i);
});

test("transitionStatus fails with clear error when Supabase is unconfigured", async () => {
  const result = await transitionStatus("00000000-0000-0000-0000-000000000000", "shortlisted");
  assert.equal(result.success, false);
  assert.match(result.error ?? "", /Supabase configuration is missing/i);
});
