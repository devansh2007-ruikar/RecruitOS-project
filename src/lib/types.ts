// =============================================================================
// RecruitOS – Shared types
// =============================================================================

/** Configurable team list — update this to change available teams */
export const TEAMS = ["Technical", "Design", "Events"] as const;
export type Team = (typeof TEAMS)[number];

/** Application status enum — mirrors the Postgres enum */
export const APPLICATION_STATUSES = [
  "applied",
  "shortlisted",
  "interview",
  "selected",
  "rejected",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** Terminal statuses — no further transitions allowed */
export const TERMINAL_STATUSES: ApplicationStatus[] = ["selected", "rejected"];

/**
 * Allowed status transitions.
 * Enforced both client-side (for UI) and server-side (in Postgres function).
 */
export const STATUS_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  applied: ["shortlisted", "rejected"],
  shortlisted: ["interview", "rejected"],
  interview: ["selected", "rejected"],
  selected: [],
  rejected: [],
};

/** Status display configuration */
export const STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; color: string; bgColor: string }
> = {
  applied: { label: "Applied", color: "text-blue-700", bgColor: "bg-blue-50 border-blue-200" },
  shortlisted: { label: "Shortlisted", color: "text-amber-700", bgColor: "bg-amber-50 border-amber-200" },
  interview: { label: "Interview", color: "text-purple-700", bgColor: "bg-purple-50 border-purple-200" },
  selected: { label: "Selected", color: "text-emerald-700", bgColor: "bg-emerald-50 border-emerald-200" },
  rejected: { label: "Rejected", color: "text-neutral-500", bgColor: "bg-neutral-50 border-neutral-200" },
};

/** Team-specific questions */
export interface TeamQuestion {
  id: string;
  label: string;
  type: "text" | "textarea" | "select";
  options?: string[];
  required: boolean;
}

export const TEAM_QUESTIONS: Record<Team, TeamQuestion[]> = {
  Technical: [
    {
      id: "tech_languages",
      label: "What programming languages are you comfortable with?",
      type: "textarea",
      required: true,
    },
    {
      id: "tech_project",
      label: "Describe a technical project you've worked on.",
      type: "textarea",
      required: true,
    },
    {
      id: "tech_interest",
      label: "What area of technology interests you most?",
      type: "select",
      options: ["Web Development", "Blockchain / Web3", "AI / ML", "Mobile Development", "DevOps / Cloud", "Other"],
      required: true,
    },
  ],
  Design: [
    {
      id: "design_tools",
      label: "Which design tools do you use? (e.g., Figma, Illustrator)",
      type: "textarea",
      required: true,
    },
    {
      id: "design_portfolio",
      label: "Link to your portfolio or any design work.",
      type: "text",
      required: false,
    },
    {
      id: "design_approach",
      label: "Describe your design process when approaching a new project.",
      type: "textarea",
      required: true,
    },
  ],
  Events: [
    {
      id: "events_experience",
      label: "Describe any event management experience you have.",
      type: "textarea",
      required: true,
    },
    {
      id: "events_idea",
      label: "Propose an event idea for the Blockchain Students Chapter.",
      type: "textarea",
      required: true,
    },
    {
      id: "events_role",
      label: "What role do you prefer in event management?",
      type: "select",
      options: ["Planning & Logistics", "Marketing & Outreach", "Content & Speakers", "Sponsorship", "Flexible / Any"],
      required: true,
    },
  ],
};

/** Database row shape for applications */
export interface Application {
  id: string;
  name: string;
  email: string;
  email_normalized: string;
  branch: string;
  year: number;
  team: Team;
  answers: Record<string, string>;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
}

/** Database row shape for status history */
export interface StatusHistoryEntry {
  id: string;
  application_id: string;
  previous_status: ApplicationStatus | null;
  new_status: ApplicationStatus;
  actor_id: string | null;
  created_at: string;
}
