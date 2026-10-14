# RecruitOS

Recruitment management system for the **Blockchain Students Chapter at RBU**.

> This is a recruitment assignment, **not** a blockchain application.

## Stack

- **Next.js 15** (App Router, TypeScript)
- **Tailwind CSS v4**
- **Supabase** (PostgreSQL, Row Level Security, Auth)
- **Zod** (validation)
- **Vercel**-compatible deployment

## Architecture

```
src/
├── app/
│   ├── page.tsx                        # Landing page
│   ├── apply/                          # Public multi-step application form
│   │   ├── page.tsx
│   │   ├── application-form.tsx        # Client component (multi-step)
│   │   └── actions.ts                  # Server action: submitApplication
│   ├── login/                          # Coordinator sign-in
│   │   ├── page.tsx
│   │   ├── login-form.tsx
│   │   └── actions.ts                  # Server actions: login, logout
│   ├── dashboard/                      # Protected recruitment workspace
│   │   ├── layout.tsx                  # Auth guard + top bar
│   │   ├── page.tsx                    # Candidate table with filters
│   │   ├── actions.ts                  # Server action: transitionStatus
│   │   ├── status-components.tsx       # StatusBadge + StatusActions
│   │   ├── filter-select.tsx           # Client-side URL filter
│   │   └── candidates/[id]/page.tsx    # Candidate detail + audit trail
│   ├── auth/callback/route.ts          # Supabase auth code exchange
│   ├── layout.tsx                      # Root layout
│   └── globals.css                     # Design system
├── lib/
│   ├── types.ts                        # Teams, statuses, transitions, questions
│   ├── validations.ts                  # Zod schemas + email normalization
│   └── supabase/
│       ├── client.ts                   # Browser Supabase client (anon key)
│       └── server.ts                   # Server Supabase client + admin client
├── middleware.ts                       # Session refresh + route protection
supabase/
└── migrations/
    └── 001_initial_schema.sql          # Tables, RLS, atomic transition fn
```

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
3. Fill in your credentials from **Settings → API**:
   - `NEXT_PUBLIC_SUPABASE_URL` — Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — `anon` / `public` key
   - `SUPABASE_SERVICE_ROLE_KEY` — `service_role` key (keep secret!)

### 4. Run the Database Migration

1. Open the Supabase **SQL Editor** (Dashboard → SQL Editor).
2. Paste the contents of `supabase/migrations/001_initial_schema.sql`.
3. Click **Run**.

This creates:
- `applications` table with unique normalized email constraint
- `status_history` audit table
- Row Level Security policies
- Atomic `transition_application_status` function

### 5. Create a Coordinator Account

Coordinator accounts are **not** self-service. Create one via Supabase:

1. Go to **Authentication → Users** in your Supabase dashboard.
2. Click **Add User** → **Create New User**.
3. Enter an email and password.
4. This user can now sign in at `/login`.

### 6. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Application Flow

1. **`/apply`** — Candidates fill a 4-step form:
   - Personal details (name, email, branch, year)
   - Team preference (Technical / Design / Events)
   - Team-specific conditional questions
   - Review and submit
2. Submitted applications persist to Supabase with status `applied`.
3. Duplicate emails (normalized, case-insensitive) are rejected at the database level.

## Status Workflow

```
Applied → Shortlisted → Interview → Selected
   ↓           ↓            ↓
Rejected    Rejected     Rejected
```

- **Terminal states**: Selected, Rejected (no further transitions).
- Transitions enforced server-side in the Postgres function.
- Status changes and audit entries are committed atomically.

## Security Model

| Concern | Implementation |
|---|---|
| Public applicants cannot read records | RLS: `applications` SELECT restricted to `authenticated` role |
| Only coordinators access dashboard | Middleware redirects unauthenticated users to `/login` |
| Service-role key not in browser | Only used in `server.ts` `createAdminClient()`, never imported client-side |
| No self-registration | Coordinators created manually in Supabase dashboard |
| Credentials not in repo | `.env*` in `.gitignore`; `.env.example` has placeholders only |

## Assumptions

- **Teams** are hardcoded as `Technical`, `Design`, `Events` in `src/lib/types.ts`. Update `TEAMS` and `TEAM_QUESTIONS` to change them.
- **Single recruitment cycle** — the unique email constraint assumes one application per person. For multi-cycle support, add a `cycle_id` column and make the constraint composite.
- **Coordinator auth** uses Supabase's built-in email/password. No role-based access control within coordinators (all coordinators have equal access).

## Deployment (Vercel)

1. Push to GitHub.
2. Import the repo in [vercel.com](https://vercel.com).
3. Add environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
4. Deploy.

## Remaining Work

- [ ] Email notifications on status change
- [ ] Bulk status update for multiple candidates
- [ ] Export candidates to CSV
- [ ] Role-based coordinator permissions
- [ ] Multi-cycle recruitment support
- [ ] Application editing/withdrawal by candidates
- [ ] Rate limiting on the `/apply` endpoint
- [ ] Automated tests (unit + integration)
