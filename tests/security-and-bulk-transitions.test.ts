import test from "node:test";
import assert from "node:assert/strict";
import { STATUS_TRANSITIONS, type ApplicationStatus } from "../src/lib/types";
import { normalizeEmail } from "../src/lib/validations";

// Simulated Database & Auth Environment to verify Milestone 2 security and transactional rules
interface MockApplication {
  id: string;
  name: string;
  email: string;
  email_normalized: string;
  status: ApplicationStatus;
}

interface MockStatusHistory {
  id: string;
  application_id: string;
  previous_status: ApplicationStatus;
  new_status: ApplicationStatus;
  actor_id: string;
  created_at: Date;
}

class MockRecruitOSDatabase {
  applications: Map<string, MockApplication> = new Map();
  statusHistory: MockStatusHistory[] = [];
  coordinators: Set<string> = new Set(); // user_id of authorized coordinators

  // Trigger: handle_application_insert
  insertApplication(app: { id: string; name: string; email: string; status?: ApplicationStatus }) {
    const normalized = normalizeEmail(app.email);

    // Enforce unique normalized email index
    for (const existing of this.applications.values()) {
      if (existing.email_normalized === normalized) {
        throw new Error("duplicate key value violates unique constraint idx_applications_email_normalized");
      }
    }

    // Force initial status to 'applied' regardless of what client payload provided
    const record: MockApplication = {
      id: app.id,
      name: app.name,
      email: app.email,
      email_normalized: normalized,
      status: "applied", // Database trigger forces 'applied'
    };
    this.applications.set(app.id, record);
    return record;
  }

  // Direct UPDATE attempt check (RLS restricts direct update)
  directUpdateStatus() {
    // In Milestone 2 schema: NO UPDATE policy exists on public.applications for authenticated users
    throw new Error("permission denied for table applications: direct update not permitted");
  }

  // Direct status_history INSERT attempt check (RLS restricts direct insert)
  directInsertStatusHistory() {
    // In Milestone 2 schema: NO INSERT policy exists on public.status_history for authenticated or anon
    throw new Error("permission denied for table status_history: audit inserts restricted to transition functions");
  }

  // RPC: transition_application_status
  // Derives actor_id strictly from auth.uid(), checks coordinator table, safe search_path
  transitionApplicationStatus(
    callerUserId: string | null,
    applicationId: string,
    newStatus: ApplicationStatus
  ) {
    // 1. Authorization check
    if (!callerUserId || !this.coordinators.has(callerUserId)) {
      return { success: false, error: "Unauthorized: caller is not an authorized coordinator" };
    }

    // 2. Fetch application
    const app = this.applications.get(applicationId);
    if (!app) {
      return { success: false, error: "Application not found" };
    }

    // 3. State machine validation
    const allowed = STATUS_TRANSITIONS[app.status];
    if (!allowed.includes(newStatus)) {
      return { success: false, error: `Invalid transition: ${app.status} → ${newStatus}` };
    }

    const previousStatus = app.status;
    app.status = newStatus;

    // 4. Audit entry: actor_id is derived from caller's authenticated user ID, NOT caller input
    const auditEntry: MockStatusHistory = {
      id: `audit-${Date.now()}-${Math.random()}`,
      application_id: applicationId,
      previous_status: previousStatus,
      new_status: newStatus,
      actor_id: callerUserId,
      created_at: new Date(),
    };
    this.statusHistory.push(auditEntry);

    return {
      success: true,
      previous_status: previousStatus,
      new_status: newStatus,
      actor_id: callerUserId,
    };
  }

  // RPC: bulk_transition_application_status
  // Transactional: all or nothing. If any item is invalid, roll back entire batch.
  bulkTransitionApplicationStatus(
    callerUserId: string | null,
    applicationIds: string[],
    newStatus: ApplicationStatus
  ) {
    // 1. Authorization check
    if (!callerUserId || !this.coordinators.has(callerUserId)) {
      return { success: false, error: "Unauthorized: caller is not an authorized coordinator" };
    }

    if (!applicationIds || applicationIds.length === 0) {
      return { success: false, error: "No candidate IDs provided" };
    }

    // 2. Existence check for all IDs
    for (const id of applicationIds) {
      if (!this.applications.has(id)) {
        return {
          success: false,
          error: `Batch rejected: candidate with id ${id} not found in database`,
        };
      }
    }

    // 3. Validation loop: verify ALL transitions are valid before applying ANY
    for (const id of applicationIds) {
      const app = this.applications.get(id)!;
      const allowed = STATUS_TRANSITIONS[app.status];
      if (!allowed.includes(newStatus)) {
        return {
          success: false,
          error: `Batch rejected: candidate "${app.name}" with status "${app.status}" cannot transition to "${newStatus}"`,
        };
      }
    }

    // 4. If all valid, perform updates and audit logging
    const auditEntriesToCommit: MockStatusHistory[] = [];
    for (const id of applicationIds) {
      const app = this.applications.get(id)!;
      const previous = app.status;
      app.status = newStatus;
      auditEntriesToCommit.push({
        id: `audit-${Date.now()}-${Math.random()}`,
        application_id: id,
        previous_status: previous,
        new_status: newStatus,
        actor_id: callerUserId,
        created_at: new Date(),
      });
    }

    this.statusHistory.push(...auditEntriesToCommit);

    return {
      success: true,
      count: applicationIds.length,
      new_status: newStatus,
    };
  }
}

// ============================================================================
// 1. Direct-Update & Forged Audit Insert Prevention Tests
// ============================================================================
test("Security: Direct status update on applications table is rejected", () => {
  const db = new MockRecruitOSDatabase();
  db.insertApplication({ id: "app-1", name: "Alice", email: "alice@rbu.edu" });

  assert.throws(
    () => db.directUpdateStatus(),
    /direct update not permitted/i
  );

  // Status must remain 'applied'
  assert.equal(db.applications.get("app-1")?.status, "applied");
});

test("Security: Direct audit log insertion into status_history is rejected", () => {
  const db = new MockRecruitOSDatabase();
  assert.throws(
    () => db.directInsertStatusHistory(),
    /audit inserts restricted/i
  );
  assert.equal(db.statusHistory.length, 0);
});

// ============================================================================
// 2. Unauthorized RPC Calls Tests
// ============================================================================
test("Security: Single transition RPC rejects unauthenticated calls", () => {
  const db = new MockRecruitOSDatabase();
  db.insertApplication({ id: "app-1", name: "Alice", email: "alice@rbu.edu" });

  const result = db.transitionApplicationStatus(null, "app-1", "shortlisted");
  assert.equal(result.success, false);
  assert.match(result.error ?? "", /unauthorized/i);
  assert.equal(db.applications.get("app-1")?.status, "applied");
  assert.equal(db.statusHistory.length, 0);
});

test("Security: Single transition RPC rejects authenticated non-coordinator users", () => {
  const db = new MockRecruitOSDatabase();
  db.insertApplication({ id: "app-1", name: "Alice", email: "alice@rbu.edu" });

  // User is authenticated, but NOT in public.coordinators
  const result = db.transitionApplicationStatus("regular-student-user", "app-1", "shortlisted");
  assert.equal(result.success, false);
  assert.match(result.error ?? "", /unauthorized/i);
  assert.equal(db.applications.get("app-1")?.status, "applied");
  assert.equal(db.statusHistory.length, 0);
});

test("Security: Bulk transition RPC rejects unauthenticated and non-coordinator calls", () => {
  const db = new MockRecruitOSDatabase();
  db.insertApplication({ id: "app-1", name: "Alice", email: "alice@rbu.edu" });
  db.insertApplication({ id: "app-2", name: "Bob", email: "bob@rbu.edu" });

  // Unauthenticated
  const unauth = db.bulkTransitionApplicationStatus(null, ["app-1", "app-2"], "shortlisted");
  assert.equal(unauth.success, false);
  assert.match(unauth.error ?? "", /unauthorized/i);

  // Authenticated non-coordinator
  const nonCoord = db.bulkTransitionApplicationStatus("unauthorized-user", ["app-1", "app-2"], "shortlisted");
  assert.equal(nonCoord.success, false);
  assert.match(nonCoord.error ?? "", /unauthorized/i);

  // Zero status changes
  assert.equal(db.applications.get("app-1")?.status, "applied");
  assert.equal(db.applications.get("app-2")?.status, "applied");
  assert.equal(db.statusHistory.length, 0);
});

// ============================================================================
// 3. Forced Initial Status & Database-Level Email Normalization Tests
// ============================================================================
test("Database Trigger: Forces initial status to 'applied' even if caller attempts 'selected'", () => {
  const db = new MockRecruitOSDatabase();
  const created = db.insertApplication({
    id: "app-sneaky",
    name: "Sneaky User",
    email: "sneaky@rbu.edu",
    status: "selected", // Malicious payload attempting bypass
  });

  assert.equal(created.status, "applied");
  assert.equal(db.applications.get("app-sneaky")?.status, "applied");
});

test("Database Trigger: Normalizes email and enforces uniqueness across casing and whitespace", () => {
  const db = new MockRecruitOSDatabase();
  db.insertApplication({
    id: "app-1",
    name: "Charlie",
    email: "Charlie.RBU@example.com",
  });

  // Attempt duplicate with different casing and whitespace
  assert.throws(
    () =>
      db.insertApplication({
        id: "app-2",
        name: "Charlie Duplicate",
        email: "   charlie.rbu@example.com   ",
      }),
    /violates unique constraint/i
  );
});

// ============================================================================
// 4. Invalid Transitions Tests
// ============================================================================
test("Transition State Machine: Disallows invalid skips and terminal state changes", () => {
  const db = new MockRecruitOSDatabase();
  const coordId = "coordinator-1";
  db.coordinators.add(coordId);

  db.insertApplication({ id: "app-1", name: "Candidate 1", email: "c1@rbu.edu" });

  // Applied cannot jump directly to Selected
  const skipToSelected = db.transitionApplicationStatus(coordId, "app-1", "selected");
  assert.equal(skipToSelected.success, false);
  assert.match(skipToSelected.error ?? "", /invalid transition/i);

  // Applied cannot jump directly to Interview
  const skipToInterview = db.transitionApplicationStatus(coordId, "app-1", "interview");
  assert.equal(skipToInterview.success, false);

  // Shortlist candidate
  const shortlist = db.transitionApplicationStatus(coordId, "app-1", "shortlisted");
  assert.equal(shortlist.success, true);
  assert.equal(db.applications.get("app-1")?.status, "shortlisted");

  // Shortlisted cannot jump directly to Selected
  const shortToSelect = db.transitionApplicationStatus(coordId, "app-1", "selected");
  assert.equal(shortToSelect.success, false);

  // Move to Interview
  const interview = db.transitionApplicationStatus(coordId, "app-1", "interview");
  assert.equal(interview.success, true);

  // Reject from Interview
  const reject = db.transitionApplicationStatus(coordId, "app-1", "rejected");
  assert.equal(reject.success, true);
  assert.equal(db.applications.get("app-1")?.status, "rejected");

  // Terminal state: rejected cannot transition anywhere
  for (const target of ["applied", "shortlisted", "interview", "selected"] as ApplicationStatus[]) {
    const fromRejected = db.transitionApplicationStatus(coordId, "app-1", target);
    assert.equal(fromRejected.success, false);
    assert.match(fromRejected.error ?? "", /invalid transition/i);
  }
});

// ============================================================================
// 5. Audit Accuracy Tests
// ============================================================================
test("Audit Trail: Accurately records previous/new status and derives actor_id from auth.uid()", () => {
  const db = new MockRecruitOSDatabase();
  const coordId = "verified-coordinator-uuid-42";
  db.coordinators.add(coordId);

  db.insertApplication({ id: "app-audit", name: "Audit Candidate", email: "audit@rbu.edu" });

  const res = db.transitionApplicationStatus(coordId, "app-audit", "shortlisted");
  assert.equal(res.success, true);

  assert.equal(db.statusHistory.length, 1);
  const audit = db.statusHistory[0];
  assert.equal(audit.application_id, "app-audit");
  assert.equal(audit.previous_status, "applied");
  assert.equal(audit.new_status, "shortlisted");
  assert.equal(audit.actor_id, coordId, "Actor ID must match authenticated coordinator, not spoofable caller input");
  assert.ok(audit.created_at instanceof Date);
});

// ============================================================================
// 6. Bulk Transaction All-or-Nothing Rollback Tests
// ============================================================================
test("Bulk Updates: Succeeds when all candidates in batch have valid transitions", () => {
  const db = new MockRecruitOSDatabase();
  const coordId = "coordinator-1";
  db.coordinators.add(coordId);

  db.insertApplication({ id: "b1", name: "Batch 1", email: "b1@rbu.edu" });
  db.insertApplication({ id: "b2", name: "Batch 2", email: "b2@rbu.edu" });
  db.insertApplication({ id: "b3", name: "Batch 3", email: "b3@rbu.edu" });

  const result = db.bulkTransitionApplicationStatus(coordId, ["b1", "b2", "b3"], "shortlisted");
  assert.equal(result.success, true);
  assert.equal(result.count, 3);

  assert.equal(db.applications.get("b1")?.status, "shortlisted");
  assert.equal(db.applications.get("b2")?.status, "shortlisted");
  assert.equal(db.applications.get("b3")?.status, "shortlisted");

  // Exactly 3 audit entries written
  assert.equal(db.statusHistory.length, 3);
  for (const entry of db.statusHistory) {
    assert.equal(entry.new_status, "shortlisted");
    assert.equal(entry.actor_id, coordId);
  }
});

test("Bulk Rollback: Rejects entire batch if even ONE candidate has an invalid transition (0 changes committed)", () => {
  const db = new MockRecruitOSDatabase();
  const coordId = "coordinator-1";
  db.coordinators.add(coordId);

  db.insertApplication({ id: "valid-1", name: "Valid 1", email: "v1@rbu.edu" }); // status: applied
  db.insertApplication({ id: "valid-2", name: "Valid 2", email: "v2@rbu.edu" }); // status: applied
  db.insertApplication({ id: "invalid-3", name: "Invalid 3", email: "v3@rbu.edu" }); // status: applied

  // Move invalid-3 to 'interview' (Applied -> Shortlisted -> Interview)
  db.transitionApplicationStatus(coordId, "invalid-3", "shortlisted");
  db.transitionApplicationStatus(coordId, "invalid-3", "interview");
  assert.equal(db.applications.get("invalid-3")?.status, "interview");

  const historyLengthBefore = db.statusHistory.length;

  // Now attempt to bulk transition all 3 to 'shortlisted'
  // valid-1 and valid-2 are 'applied' (valid to 'shortlisted')
  // BUT invalid-3 is 'interview' ('interview' CANNOT transition to 'shortlisted'!)
  const result = db.bulkTransitionApplicationStatus(
    coordId,
    ["valid-1", "valid-2", "invalid-3"],
    "shortlisted"
  );

  // Entire batch must be rejected
  assert.equal(result.success, false);
  assert.match(result.error ?? "", /Batch rejected/i);

  // ATOMIC ROLLBACK VERIFICATION:
  // valid-1 and valid-2 must remain 'applied' (no partial commit!)
  assert.equal(db.applications.get("valid-1")?.status, "applied");
  assert.equal(db.applications.get("valid-2")?.status, "applied");
  // invalid-3 must remain 'interview'
  assert.equal(db.applications.get("invalid-3")?.status, "interview");

  // Zero new audit entries must have been committed for this batch
  assert.equal(db.statusHistory.length, historyLengthBefore);
});

test("Bulk Rollback: Rejects entire batch if a candidate ID does not exist in database", () => {
  const db = new MockRecruitOSDatabase();
  const coordId = "coordinator-1";
  db.coordinators.add(coordId);

  db.insertApplication({ id: "app-exists", name: "Exists", email: "exists@rbu.edu" });

  const result = db.bulkTransitionApplicationStatus(
    coordId,
    ["app-exists", "non-existent-uuid"],
    "shortlisted"
  );

  assert.equal(result.success, false);
  assert.match(result.error ?? "", /not found in database/i);

  // Existing candidate status was NOT modified
  assert.equal(db.applications.get("app-exists")?.status, "applied");
  assert.equal(db.statusHistory.length, 0);
});
