// Shared types for HALO. These mirror the planned Supabase schema
// (users, scans, scores, plans, closer_sessions) so the persistence layer
// can be swapped from localStorage to Supabase without touching the UI.

export type SubScore = {
  key: string;
  label: string;
  /** 0-100 */
  score: number;
  note: string;
};

export type ImprovementItem = {
  rank: number;
  title: string;
  /** why it's high-ROI, in plain language */
  why: string;
  /** concrete first action */
  action: string;
  /** projected point lift if followed, e.g. 0.6 */
  projectedLift: number;
  effort: "easy" | "medium" | "committed";
};

export type ScanResult = {
  id: string;
  createdAt: number;
  /** 0-100 private baseline */
  overall: number;
  /** aspirational ceiling 0-100 */
  potential: number;
  subScores: SubScore[];
  plan: ImprovementItem[];
  /** one-line encouraging summary */
  summary: string;
};

export type CloserKind = "bio" | "opener" | "reply";

export type CloserResult = {
  id: string;
  createdAt: number;
  kind: CloserKind;
  suggestions: string[];
  coaching: string;
};

export type Profile = {
  /** ISO date of birth, captured at the age gate */
  dob: string | null;
  ageConfirmed18: boolean;
  /** stronger, verified-adult status required to unlock Closer */
  adultVerified: boolean;
  consentedToAnalysis: boolean;
  subscribed: boolean;
  createdAt: number;
};
