# RecruitOS

Recruitment management system for the **Blockchain Students Chapter at RBU**.

> **Note:** This is a recruitment and applicant tracking application, **not** a blockchain application.

---

## Stack

- **Framework:** Next.js 16 (App Router, Turbopack, Server Actions, Next 16 `proxy.ts` convention)
- **Language:** TypeScript 5 (Strict type checking)
- **Styling:** Tailwind CSS v4 & custom semantic CSS design tokens
- **Database & Auth:** Supabase (PostgreSQL 15+, Row Level Security, RPCs, Auth)
- **Validation:** Zod 4
- **Testing:** Node.js native test runner (`node --test`) with TypeScript loader (`tsx`)
- **Deployment:** Vercel-compatible

---

## Architecture

```
src/
├── app/
│   ├── page.tsx                        # Public landing page
│   ├── apply/                          # Public 4-step application form
│   │   ├── page.tsx
│   │   ├── application-form.tsx        # Multi-step client component with validation
│   │   └── actions.ts                  # Server action: submitApplication
│   ├── login/                          # Coordinator sign-in
│   │   ├── page.tsx
│   │   ├── login-form.tsx              # Client form with error & redirect handling
│   │   └── actions.ts                  # Server actions: loginAction, logoutAction
│   ├── dashboard/                      # Protected recruitment workspace
│   │   ├── layout.tsx                  # Auth guard + explicit coordinator authorization
│   │   ├── page.tsx                    # Candidate overview with search & filters
│   │   ├── candidate-table.tsx         # Multi-select table with bulk status action toolbar
│   │   ├── actions.ts                  # Server actions: transitionStatus, bulkTransitionStatus
│   │   ├── status-components.tsx       # StatusBadge + single StatusActions
│   │   ├── filter-select.tsx           # Client component for URL search param filters
│   │   └── candidates/[id]/page.tsx    # Candidate profile with answers & audit trail
│   ├── auth/callback/route.ts          # Supabase auth code exchange route
│   ├── layout.tsx                      # Root layout with Inter font
│   └── globals.css                     # Semantic CSS design system with dark mode
├── lib/
│   ├── types.ts                        # Teams, status state machine, questions, interfaces
│   ├── validations.ts                  # Zod validation schemas & email normalization
│   └── supabase/
│       ├── client.ts                   # Browser Supabase client (anon key only)
│       └── server.ts                   # Server Supabase client + admin service-role client
├── proxy.ts                            # Next.js 16 Proxy: session refresh & /dashboard protection
supabase/
└── migrations/
    ├── 001_initial_schema.sql          # Complete fresh schema with coordinator RLS & bulk RPC
    └── 002_security_and_bulk_transitions.sql # Migration for already-configured databases
tests/
├── validation-and-workflow.test.ts     # Schema validation & transition state machine tests
├── server-actions.test.ts              # Unconfigured state & action validation tests
└── security-and-bulk-transitions.test.ts # Direct updates, unauthorized RPCs & bulk rollback tests
```

---

## Setup Instructions

### 1. Prerequisites

- Node.js ≥ 18
- A [Supabase](https://supabase.com) project (free tier works)

### 2. Clone and Install

```bash
git clone https://github.com/devansh2007-ruikar/RecruitOS-project.git
cd RecruitOS-project
npm install
```

### 3. Configure Supabase

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a project.
2. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
3. Copy your project credentials from **Project Settings → API**:
   - `NEXT_PUBLIC_SUPABASE_URL` — Project URL (`https://<project-ref>.supabase.co`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — `anon` / `public` key
   - `SUPABASE_SERVICE_ROLE_KEY` — `service_role` key (keep confidential!)

### 4. Run Database Migrations

Open the Supabase **SQL Editor** (Dashboard → SQL Editor → New Query):

- **For brand-new projects:**
  Copy and run [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql).
- **For databases created during Milestone 1:**
  Copy and run [`supabase/migrations/002_security_and_bulk_transitions.sql`](supabase/migrations/002_security_and_bulk_transitions.sql).

This provisions:
- `applications` table with forced initial `applied` status and database-level email normalization.
- `status_history` audit table.
- `coordinators` authorization table with `is_coordinator(uid)` helper.
- Hardened RLS policies (preventing candidate reads by non-coordinators and disallowing direct table updates).
- `transition_application_status` RPC with actor identity derived from `auth.uid()`.
- `bulk_transition_application_status` RPC for atomic, all-or-nothing batch transitions.

### 5. Create and Authorize a Coordinator Account

Coordinator accounts are strictly controlled and cannot self-register:

1. In Supabase Dashboard, go to **Authentication → Users**.
2. Click **Add User → Create User** with an email and password (e.g. `coordinator@rbu.edu`).
3. In the **SQL Editor**, authorize the user as a coordinator:
   ```sql
   select public.add_coordinator('coordinator@rbu.edu');
   ```
4. Sign in at [http://localhost:3000/login](http://localhost:3000/login).

### 6. Run Locally and Test

```bash
npm run dev      # Starts Next.js development server at http://localhost:3000
npm test         # Runs full automated test suite (31 tests)
npm run lint     # Validates ESLint rules
npm run build    # Validates production compilation with Turbopack
```

---

## Security Model & Database Hardening

| Threat / Concern | Mitigation Implemented |
|---|---|
| **Public access to applicant records** | RLS policy on `applications` restricts `SELECT` to `public.is_coordinator(auth.uid())`. Unauthenticated and non-coordinator users receive 0 rows. |
| **Arbitrary user registering as coordinator** | Self-registration disabled. Coordinators must exist in `public.coordinators`. Layout guards and RLS reject non-coordinator authenticated users. |
| **Direct status updates from client** | Direct `UPDATE` on `public.applications` is completely disabled via RLS. All status changes must execute through security-definer RPCs. |
| **Forged audit logs** | Direct `INSERT` on `public.status_history` is disabled. Only the trusted PostgreSQL RPCs insert audit records. |
| **Spoofed actor identity** | The transition RPCs do not accept an actor ID argument. They derive actor identity directly from `auth.uid()`. |
| **SQL search path hijacking** | All `SECURITY DEFINER` functions explicitly declare `SET search_path = public, pg_temp`. |
| **Bypassing email uniqueness via casing/spaces** | `on_application_insert` trigger forces `NEW.email_normalized := lower(trim(NEW.email))`, backed by a unique index. |
| **Bypassing initial status via API payload** | `on_application_insert` trigger overrides `NEW.status := 'applied'::application_status`. |
| **Exposure of service-role keys** | Service-role key is only read in server-side `src/lib/supabase/server.ts`, never bundled in client code. |

---

## Status State Machine & Bulk Transactions

```
Applied ──┬──> Shortlisted ──┬──> Interview ──┬──> Selected (terminal)
          │                  │                 │
          └──> Rejected      └──> Rejected     └──> Rejected (terminal)
```

### Atomic Bulk Status Updates
Coordinators can select multiple candidates on `/dashboard` and execute batch updates:
- **Single Transaction:** Implemented via PostgreSQL PL/pgSQL function `bulk_transition_application_status`.
- **All-or-Nothing Rollback:** If any candidate in the selection has an invalid transition (or cannot be found), the entire batch is rejected. No statuses are changed and 0 audit entries are written.
- **Audit Accuracy:** When a batch succeeds, exactly one audit entry is recorded per candidate with the previous status, new status, timestamp, and verified `actor_id`.

---

## Dependency Audit Review

During `npm audit`, 5 high-severity advisory findings were reported for `braces <=3.0.3` (GHSA-vfj7-8cjw-p6xm), pulled in deeply via `fast-glob` &rarr; `@next/eslint-plugin-next` &rarr; `eslint-config-next`.

**Why `npm audit fix --force` was intentionally avoided:**
- Running `npm audit fix --force` would downgrade `eslint-config-next` to version `14.2.35`, introducing a breaking major downgrade from Next.js 16 to Next.js 14 and destroying App Router compatibility.
- The advisory affects only the local development linting toolchain (`eslint`), not production code or client bundles.
- Production runtime dependencies contain **0 vulnerabilities**.

---

## AI-Assisted Development Workflow

This codebase was developed through an agentic pair-programming workflow:

### Where AI Provided High Value
1. **Database-level state machines:** Designing PL/pgSQL functions for atomic locking (`FOR UPDATE`), conditional transition validation, and all-or-nothing rollback logic.
2. **Comprehensive test scaffolding:** Generating test cases for edge cases such as duplicate normalization with unicode whitespace, unauthorized role access, and batch rollbacks.
3. **Rapid foundational scaffolding:** Setting up the multi-step form structure with Zod schemas and clean semantic CSS design tokens.

### Challenges & Agent Corrections
1. **Next.js 16 breaking changes:** Next.js 16 deprecated `middleware.ts` in favor of `proxy.ts` and enabled `cacheComponents` by default. Early generated code attempted to use `export const dynamic = "force-dynamic"`, which failed during Turbopack compilation. The agent had to consult `node_modules/next/dist/docs/` to adopt the `proxy.ts` convention and `<Suspense>` boundaries.
2. **Zod 4 parameter differences:** Zod 4 replaces `{ invalid_type_error: ... }` and `{ errorMap: ... }` with `{ message: ... }`. The agent identified and corrected these during TypeScript type-checking.
3. **Validation pipeline ordering:** Zod evaluated `.min(2)` before `.trim()`, allowing whitespace-only strings to pass. The agent diagnosed this through test failures and corrected the schema order.

---

## Bug-Fix Log

The following real bugs were diagnosed, resolved, and verified through automated tests during development:

### 1. Zod Whitespace-Only Name Bypass
- **Symptom:** Unit test `Personal details: rejects empty or short names` failed (`true !== false`). Inputs like `"   "` passed validation despite `.min(2)`.
- **Root Cause:** In `personalDetailsSchema`, `.string().min(2, "...").trim()` evaluated `.min(2)` on `"   "` (length 3) before trimming was applied.
- **Fix:** Placed `.trim()` before length assertions: `.string().trim().min(2, "Name must be at least 2 characters")`.
- **Retest:** Ran `npm test`; all 14 personal details and workflow tests passed.

### 2. Next.js 16 Build Failure (`cacheComponents` & Prerendering)
- **Symptom:** Production build failed with: `Route segment config "dynamic" is not compatible with nextConfig.cacheComponents` and `Route "/login": Next.js encountered uncached or runtime data during prerendering`.
- **Root Cause:** Next 16 Turbopack with Cache Components deprecates `dynamic = "force-dynamic"` and requires components reading dynamic `searchParams` or route params to be enclosed in `<Suspense>` boundaries.
- **Fix:** Removed obsolete `export const dynamic` segment configs, wrapped `searchParams` and candidate detail components inside `<Suspense fallback={...}>`, and converted dynamic `generateMetadata` into a static export.
- **Retest:** Ran `npm run build`; Turbopack successfully compiled all 9 pages with Partial Prerendering (`◐`).

### 3. Spoofed Actor Identity & Unrestricted RLS in Transition Functions
- **Symptom:** In Milestone 1, `transition_application_status` accepted `p_actor_id` as an input parameter, allowing callers to spoof audit attribution. Furthermore, any authenticated user had `UPDATE` access to `applications`.
- **Root Cause:** Premature simplification in Milestone 1 schema without role-based coordinator validation.
- **Fix:** 
  1. Created `public.coordinators` table and `public.is_coordinator(auth.uid())` check.
  2. Removed `p_actor_id` parameter from transition RPCs; derived actor identity directly from `auth.uid()`.
  3. Dropped direct `UPDATE` permissions on `applications` and direct `INSERT` on `status_history`.
  4. Added `SET search_path = public, pg_temp` to all security definer functions.
- **Retest:** Added automated integration test suite in `tests/security-and-bulk-transitions.test.ts`. Verified that unauthenticated calls, non-coordinator calls, and direct update attempts are strictly rejected (31/31 tests passing).

### 4. ESLint `no-require-imports` and Unused Catch Variable
- **Symptom:** `npm run lint` failed with 1 error and 1 warning (`A require() style import is forbidden` in `server.ts` and `err is defined but never used` in `application-form.tsx`).
- **Fix:** Replaced dynamic `require("@supabase/supabase-js")` with top-level ES `import { createClient as createSupabaseJsClient } from "@supabase/supabase-js"`, and changed `catch (err)` to `catch`.
- **Retest:** Ran `npm run lint`; exited with 0 errors and 0 warnings.
