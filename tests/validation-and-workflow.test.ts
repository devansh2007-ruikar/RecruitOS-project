import test from "node:test";
import assert from "node:assert/strict";

import {
  personalDetailsSchema,
  teamPreferenceSchema,
  applicationSchema,
  normalizeEmail,
} from "../src/lib/validations";
import {
  TEAMS,
  STATUS_TRANSITIONS,
  TERMINAL_STATUSES,
  TEAM_QUESTIONS,
  type ApplicationStatus,
  type Team,
} from "../src/lib/types";

// ============================================================================
// 1. Email normalization tests
// ============================================================================
test("Email normalization trims and lowercases addresses", () => {
  assert.equal(normalizeEmail("  Student@RBU.EDU  "), "student@rbu.edu");
  assert.equal(normalizeEmail("Jane.DOE@gmail.com"), "jane.doe@gmail.com");
  assert.equal(normalizeEmail("test.user+tag@example.org"), "test.user+tag@example.org");
});

// ============================================================================
// 2. Personal details validation tests
// ============================================================================
test("Personal details: accepts valid inputs", () => {
  const valid = {
    name: "Aarav Sharma",
    email: "aarav@rbu.edu",
    branch: "Computer Science",
    year: 2,
  };
  const result = personalDetailsSchema.safeParse(valid);
  assert.equal(result.success, true);
});

test("Personal details: rejects invalid email", () => {
  const invalid = {
    name: "Aarav Sharma",
    email: "not-an-email",
    branch: "Computer Science",
    year: 2,
  };
  const result = personalDetailsSchema.safeParse(invalid);
  assert.equal(result.success, false);
  if (!result.success) {
    assert.match(result.error.issues[0].message, /valid email/i);
  }
});

test("Personal details: enforces year between 1 and 5", () => {
  assert.equal(
    personalDetailsSchema.safeParse({
      name: "Test",
      email: "t@rbu.edu",
      branch: "CSE",
      year: 0,
    }).success,
    false
  );

  assert.equal(
    personalDetailsSchema.safeParse({
      name: "Test",
      email: "t@rbu.edu",
      branch: "CSE",
      year: 6,
    }).success,
    false
  );

  assert.equal(
    personalDetailsSchema.safeParse({
      name: "Test",
      email: "t@rbu.edu",
      branch: "CSE",
      year: 3,
    }).success,
    true
  );
});

test("Personal details: rejects empty or short names", () => {
  assert.equal(
    personalDetailsSchema.safeParse({
      name: "A",
      email: "a@rbu.edu",
      branch: "CSE",
      year: 1,
    }).success,
    false
  );

  assert.equal(
    personalDetailsSchema.safeParse({
      name: "   ",
      email: "a@rbu.edu",
      branch: "CSE",
      year: 1,
    }).success,
    false
  );
});

// ============================================================================
// 3. Team selection tests
// ============================================================================
test("Team preference: accepts configured teams", () => {
  for (const team of TEAMS) {
    const result = teamPreferenceSchema.safeParse({ team });
    assert.equal(result.success, true);
  }
});

test("Team preference: rejects unconfigured teams", () => {
  const result = teamPreferenceSchema.safeParse({ team: "Finance" });
  assert.equal(result.success, false);
});

// ============================================================================
// 4. Team-specific conditional questions tests
// ============================================================================
test("Team-specific questions are properly defined for all teams", () => {
  for (const team of TEAMS) {
    const questions = TEAM_QUESTIONS[team as Team];
    assert.ok(Array.isArray(questions), `Questions for ${team} must be an array`);
    assert.ok(questions.length > 0, `${team} must have at least one question`);

    for (const q of questions) {
      assert.ok(q.id, "Question must have an id");
      assert.ok(q.label, "Question must have a label");
      assert.ok(["text", "textarea", "select"].includes(q.type), "Valid question type");
      if (q.type === "select") {
        assert.ok(Array.isArray(q.options) && q.options.length > 0, "Select question needs options");
      }
    }
  }
});

// ============================================================================
// 5. Full application schema validation tests
// ============================================================================
test("Application schema validates complete submission", () => {
  const validApp = {
    name: "Diya Patel",
    email: "diya@rbu.edu",
    branch: "Information Technology",
    year: 3,
    team: "Technical",
    answers: {
      tech_languages: "TypeScript, Python, Rust",
      tech_project: "Built a decentralized voting demo",
      tech_interest: "Blockchain / Web3",
    },
  };

  const result = applicationSchema.safeParse(validApp);
  assert.equal(result.success, true);
});

// ============================================================================
// 6. Allowed transitions test suite
// ============================================================================
test("Status transitions: Applied allowed targets", () => {
  const allowed = STATUS_TRANSITIONS["applied"];
  assert.deepEqual(allowed.sort(), ["rejected", "shortlisted"].sort());
});

test("Status transitions: Shortlisted allowed targets", () => {
  const allowed = STATUS_TRANSITIONS["shortlisted"];
  assert.deepEqual(allowed.sort(), ["interview", "rejected"].sort());
});

test("Status transitions: Interview allowed targets", () => {
  const allowed = STATUS_TRANSITIONS["interview"];
  assert.deepEqual(allowed.sort(), ["rejected", "selected"].sort());
});

test("Status transitions: Terminal states allow no further transitions", () => {
  for (const status of TERMINAL_STATUSES) {
    assert.equal(
      STATUS_TRANSITIONS[status].length,
      0,
      `Terminal status ${status} must have 0 outgoing transitions`
    );
  }
});

test("Status transitions: Disallowed transitions cannot be taken", () => {
  function isValidTransition(from: ApplicationStatus, to: ApplicationStatus): boolean {
    return STATUS_TRANSITIONS[from].includes(to);
  }

  // Cannot jump Applied -> Selected
  assert.equal(isValidTransition("applied", "selected"), false);
  // Cannot jump Applied -> Interview
  assert.equal(isValidTransition("applied", "interview"), false);
  // Cannot jump Shortlisted -> Selected
  assert.equal(isValidTransition("shortlisted", "selected"), false);
  // Terminal status cannot transition
  assert.equal(isValidTransition("selected", "applied"), false);
  assert.equal(isValidTransition("rejected", "shortlisted"), false);
});
